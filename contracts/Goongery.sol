// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "hardhat/console.sol";
import "./GoongeryNFT.sol";
import "./libs/GoongeryOption.sol";
import "./libs/BEP20.sol";
import "./libs/IGoongeryRandomGenerator.sol";

contract Goongery is Ownable, Initializable {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeERC20 for IERC20;
    using Address for address;

    // Represents the status of the goongery
    enum Status {
        NotStarted, // The goongery has not started yet
        Open, // The goongery is open for ticket purchases
        Closed, // The goongery is no longer open for ticket purchases
        Completed // The goongery has been closed and the numbers drawn
    }

    // All goongery infos including past rounds.
    struct GoongeryInfo {
        Status status;
        uint8[3] allocation;
        uint256 goongPerTicket;
        uint256 openingTimestamp;
        uint256 closingTimestamp;
        uint256[] tokenIds;
        uint8[3] winningNumbers;
        uint256 totalGoongPrize;
    }

    // Maximum burn percentage to be adjusted
    uint8 public constant MAX_BURN_PERCENTAGE = 20;
    // Maximum team fee percentage to be adjusted
    uint8 public constant MAX_TEAM_FEE_PERCENTAGE = 50;
    // Minimum seconds allowed to buy ticket per round
    uint256 public constant MIN_BUY_TICKET_TIME = 1 hours;
    // Minimum goong per ticket
    uint256 public constant MIN_GOONG_PER_TICKET = 1 ether;
    // Minimum number for each digit
    uint256 public constant MIN_MAX_NUMBER = 9;
    // Goong address
    IERC20 public goong;
    // NFT represent googery ticket.
    GoongeryNFT public nft;
    // Percentage of total goong to be burned (0 - 100)
    uint8 public burnPercentage;
    // Maximum number for each digit
    uint8 public maxNumber;
    // Round number
    uint256 public roundNumber = 0;
    // Random generator
    IGoongeryRandomGenerator public goongeryRandomGenerator;
    // roundNumber => GoongeryInfo
    mapping(uint256 => GoongeryInfo) public goongeryInfo;
    // address => [tokenId]
    mapping(address => uint256[]) public userInfo;
    // address => roundNumber => [tokenId]
    mapping(address => mapping(uint256 => uint256[])) public userInfoByRound;
    // roundNumber => buyOption => googeryNumbersId => buyAmountSum
    mapping(uint256 => mapping(GoongeryOption.Buy => mapping(uint64 => uint256)))
        public userBuyAmountSum;

    // Random generator for request id
    bytes32 public requestId;

    modifier onlyRandomGenerator() {
        require(
            msg.sender == address(goongeryRandomGenerator),
            "Caller must be GoongeryRandomGenerator"
        );
        _;
    }

    modifier notContract() {
        require(!address(msg.sender).isContract(), "contract not allowed");
        require(msg.sender == tx.origin, "proxy contract not allowed");
        _;
    }

    event Buy(address indexed user, uint256 tokenId);

    function initialize(
        address _goong,
        address _goongRandomGenerator,
        address _nft,
        uint8 _maxNumber
    ) external initializer onlyOwner() {
        goong = IERC20(_goong);
        goongeryRandomGenerator = IGoongeryRandomGenerator(
            _goongRandomGenerator
        );
        nft = GoongeryNFT(_nft);
        maxNumber = _maxNumber;
        burnPercentage = 10;
    }

    function createNewRound(
        uint8[3] calldata _allocation,
        uint256 _goongPerTicket,
        uint256 _openingTimestamp,
        uint256 _closingTimestamp
    ) external onlyOwner {
        require(
            _goongPerTicket > MIN_GOONG_PER_TICKET,
            "goongPerTicket must be greater than MIN_GOONG_PER_TICKET"
        );
        require(
            _openingTimestamp > block.timestamp,
            "openingTimstamp cannot be the past"
        );
        require(
            goongeryInfo[roundNumber].closingTimestamp <= block.timestamp,
            "Previous round must be completed"
        );
        require(
            _closingTimestamp > _openingTimestamp + MIN_BUY_TICKET_TIME,
            "closingTimestamp must be greater than openingTimestamp + MIN_BUY_TICKET_TIME"
        );

        uint256 totalAllocation = 0;
        for (uint8 i = 0; i < _allocation.length; i++) {
            totalAllocation = totalAllocation.add(_allocation[i]);
        }

        require(
            totalAllocation == 100 - burnPercentage,
            "total allocation must be equal to 100 - burnPercentage"
        );

        Status lotteryStatus;
        if (_openingTimestamp >= block.timestamp) {
            lotteryStatus = Status.NotStarted;
        } else {
            lotteryStatus = Status.Open;
        }
        uint256[] memory emptyTokenIds;
        uint8[3] memory winningNumbers = [~uint8(0), ~uint8(0), ~uint8(0)];
        GoongeryInfo memory info = GoongeryInfo({
            status: lotteryStatus,
            allocation: _allocation,
            goongPerTicket: _goongPerTicket,
            openingTimestamp: _openingTimestamp,
            closingTimestamp: _closingTimestamp,
            tokenIds: emptyTokenIds,
            winningNumbers: winningNumbers,
            totalGoongPrize: 0
        });

        roundNumber = roundNumber.add(1);
        goongeryInfo[roundNumber] = info;
    }

    /**
     * @dev Supported 3 types of ticket:
     * 1. last two digits numbers
     * 2. three digits with permutable option
     * 3. exact three digits
     * If buyOption is `LastTwoNumbers`, Only _numbers[0] and _numbers[1] will be used (ignore _numbers[2]).
     */
    function buy(
        uint256 _numberOfTickets,
        uint8[3] memory _numbers,
        GoongeryOption.Buy _buyOption
    ) public {
        require(
            block.timestamp >= goongeryInfo[roundNumber].openingTimestamp,
            "block timestamp < openingTimestamp"
        );
        require(
            block.timestamp < goongeryInfo[roundNumber].closingTimestamp,
            "block timestamp >= closingTimestamp"
        );

        for (uint8 i = 0; i < 3; i++) {
            require(_numbers[i] <= maxNumber, "exceed max number allowed");
        }

        if (goongeryInfo[roundNumber].status == Status.NotStarted) {
            goongeryInfo[roundNumber].status = Status.Open;
        }

        uint256 totalGoongAmount = calculateGoongCost(_numberOfTickets);

        uint256 tokenId = nft.create(
            msg.sender,
            _numbers,
            totalGoongAmount,
            roundNumber,
            _buyOption
        );

        goongeryInfo[roundNumber].tokenIds.push(tokenId);
        goongeryInfo[roundNumber].totalGoongPrize = goongeryInfo[roundNumber]
        .totalGoongPrize
        .add(totalGoongAmount);

        userInfo[msg.sender].push(tokenId);
        userInfoByRound[msg.sender][roundNumber].push(tokenId);

        addUserBuyAmountSum(_numbers, totalGoongAmount, _buyOption);

        goong.safeTransferFrom(msg.sender, address(this), totalGoongAmount);

        emit Buy(msg.sender, tokenId);
    }

    function calculateGoongCost(uint256 numberOfTickets)
        public
        view
        returns (uint256)
    {
        return numberOfTickets.mul(goongeryInfo[roundNumber].goongPerTicket);
    }

    function drawWinningNumbers() external onlyOwner {
        require(
            goongeryInfo[roundNumber].closingTimestamp <= block.timestamp,
            "Cannot draw before close"
        );
        require(
            goongeryInfo[roundNumber].status == Status.Open,
            "Invalid status"
        );
        require(
            address(goongeryRandomGenerator) != address(0),
            "Required RandomGenerator to be set"
        );

        goongeryInfo[roundNumber].status = Status.Closed;

        requestId = goongeryRandomGenerator.getRandomNumber(roundNumber);
    }

    function drawWinningNumbersCallback(
        uint256 _roundNumber,
        bytes32 _requestId,
        uint256 _randomNumber
    ) external onlyRandomGenerator {
        require(
            goongeryInfo[roundNumber].status == Status.Closed,
            "Draw winning numbers first"
        );
        if (_requestId == requestId) {
            goongeryInfo[_roundNumber].status = Status.Completed;
            goongeryInfo[_roundNumber].winningNumbers = _extract(_randomNumber);
        }
    }

    function claimReward(uint256 _roundNumber, uint256 _nftId)
        external
        notContract
    {
        require(
            goongeryInfo[_roundNumber].closingTimestamp <= block.timestamp,
            "Wait for winning numbers drawn"
        );
        require(
            goongeryInfo[_roundNumber].status == Status.Completed,
            "Winning numbers are not chosen yet"
        );
        require(nft.ownerOf(_nftId) == msg.sender, "Caller must own nft");
        require(!nft.getClaimStatus(_nftId), "Nft is already claimed");

        nft.claimReward(_nftId);

        GoongeryOption.Buy _buyOption = nft.getBuyOption(_nftId);
        uint256 reward = calculateReward(_nftId, _roundNumber, _buyOption);
        goong.safeTransfer(msg.sender, reward);
    }

    function batchClaimReward(uint256 _roundNumber, uint256[] memory _nftIds)
        external
        notContract
    {
        require(
            goongeryInfo[_roundNumber].closingTimestamp <= block.timestamp,
            "Wait for winning numbers drawn"
        );
        require(
            goongeryInfo[_roundNumber].status == Status.Completed,
            "Winning numbers are not chosen yet"
        );

        uint256 reward;
        for (uint256 i = 0; i < _nftIds.length; i++) {
            uint256 _nftId = _nftIds[i];
            require(nft.ownerOf(_nftId) == msg.sender, "Caller must own nft");
            require(!nft.getClaimStatus(_nftId), "Nft is already claimed");

            nft.claimReward(_nftId);
            GoongeryOption.Buy _buyOption = nft.getBuyOption(_nftId);
            reward = reward.add(
                calculateReward(_nftId, _roundNumber, _buyOption)
            );
        }
        goong.safeTransfer(msg.sender, reward);
    }

    function _extract(uint256 _randomNumber)
        private
        view
        returns (uint8[3] memory)
    {
        uint8[3] memory _winningNumbers;
        for (uint256 i = 0; i < 3; i++) {
            bytes32 randomHash = keccak256(abi.encodePacked(_randomNumber, i));
            uint256 number = uint256(randomHash);
            _winningNumbers[i] = uint8(number % maxNumber);
        }
        return _winningNumbers;
    }

    function setMaxNumber(uint8 _maxNumber) external onlyOwner {
        require(
            _maxNumber >= MIN_MAX_NUMBER,
            "maxNumber must be greater than 9"
        );
        maxNumber = _maxNumber;
    }

    function setBurnPercentage(uint8 percentage) external onlyOwner {
        require(
            percentage <= MAX_BURN_PERCENTAGE,
            "Exceed max burn percentage"
        );
        burnPercentage = percentage;
    }

    // Todo: Remove when done test
    function setGoongeryRandomGenerator(address _randomGenerator)
        external
        onlyOwner
    {
        goongeryRandomGenerator = IGoongeryRandomGenerator(_randomGenerator);
    }

    function calculateReward(
        uint256 _nftId,
        uint256 _roundNumber,
        GoongeryOption.Buy _buyOption
    ) public view returns (uint256) {
        if (goongeryInfo[_roundNumber].status != Status.Completed) {
            return 0;
        }

        uint8[3] memory _numbers = getNumbersForRewardCalculation(_nftId);

        uint64 numberId = calculateGoongeryNumberId(_numbers);

        uint256 totalGoongForNumbers = userBuyAmountSum[_roundNumber][
            _buyOption
        ][numberId];
        uint8 goongAllocation = goongeryInfo[_roundNumber].allocation[
            uint256(_buyOption)
        ];
        uint256 totalGoong = goongeryInfo[_roundNumber].totalGoongPrize;
        uint256 userGoong = nft.getAmount(_nftId);

        return
            totalGoong
                .mul(goongAllocation)
                .mul(userGoong)
                .div(totalGoongForNumbers)
                .div(100);
    }

    function addUserBuyAmountSum(
        uint8[3] memory _numbers,
        uint256 _price,
        GoongeryOption.Buy _buyOption
    ) internal {
        // Create a copy of _numbers;
        uint8[3] memory numbersForId = [_numbers[0], _numbers[1], _numbers[2]];

        if (_buyOption == GoongeryOption.Buy.PermutableThreeDigits) {
            numbersForId = getLeastPermutableNumber(numbersForId);
        } else if (_buyOption == GoongeryOption.Buy.LastTwoDigits) {
            numbersForId[2] = ~uint8(0);
        }

        uint64 numberId = calculateGoongeryNumberId(numbersForId);

        userBuyAmountSum[roundNumber][_buyOption][numberId] = userBuyAmountSum[
            roundNumber
        ][_buyOption][numberId]
        .add(_price);
    }

    function swap(
        uint8[3] memory _numbers,
        uint8 index1,
        uint8 index2
    ) private pure returns (uint8[3] memory) {
        uint8 temp = _numbers[index1];
        _numbers[index1] = _numbers[index2];
        _numbers[index2] = temp;

        return _numbers;
    }

    function getNumbersForRewardCalculation(uint256 _nftId)
        private
        view
        returns (uint8[3] memory)
    {
        uint8[3] memory buyNumbers = nft.getNumbers(_nftId);
        GoongeryOption.Buy buyOption = nft.getBuyOption(_nftId);
        if (buyOption == GoongeryOption.Buy.PermutableThreeDigits) {
            return getLeastPermutableNumber(buyNumbers);
        } else if (buyOption == GoongeryOption.Buy.LastTwoDigits) {
            buyNumbers[2] = ~uint8(0);
        }

        return buyNumbers;
    }

    function calculateGoongeryNumberId(uint8[3] memory _numbers)
        public
        pure
        returns (uint64)
    {
        return _numbers[0] * 256**2 + _numbers[1] * 256 + _numbers[2];
    }

    function getLeastPermutableNumber(uint8[3] memory _numbers)
        public
        pure
        returns (uint8[3] memory)
    {
        uint8[3] memory leastPossibleNumber = [
            _numbers[0],
            _numbers[1],
            _numbers[2]
        ];

        if (leastPossibleNumber[0] > leastPossibleNumber[2]) {
            leastPossibleNumber = swap(leastPossibleNumber, 0, 2);
        }

        if (leastPossibleNumber[0] > leastPossibleNumber[1]) {
            leastPossibleNumber = swap(leastPossibleNumber, 0, 1);
        }

        if (leastPossibleNumber[1] > leastPossibleNumber[2]) {
            leastPossibleNumber = swap(leastPossibleNumber, 1, 2);
        }

        return leastPossibleNumber;
    }

    function getAllocation(uint256 _roundNumber)
        external
        view
        returns (uint8[3] memory)
    {
        return goongeryInfo[_roundNumber].allocation;
    }

    function getWinningNumbers(uint256 _roundNumber)
        external
        view
        returns (uint8[3] memory)
    {
        return goongeryInfo[_roundNumber].winningNumbers;
    }

    function getTokenIds(uint256 _roundNumber)
        external
        view
        returns (uint256[] memory)
    {
        return goongeryInfo[_roundNumber].tokenIds;
    }

    function getUserTokenIdsByRound(uint256 _roundNumber)
        external
        view
        returns (uint256[] memory)
    {
        return userInfoByRound[msg.sender][_roundNumber];
    }
}
