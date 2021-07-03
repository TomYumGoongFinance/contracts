// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";
import "./GoongeryNFT.sol";
import "./libs/GoongeryOption.sol";
import "./libs/BEP20.sol";

contract Goongery is Ownable {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeERC20 for IERC20;

    // Represents the status of the goongery
    enum Status {
        NotStarted, // The goongery has not started yet
        Open, // The goongery is open for ticket purchases
        Closed, // The goongery is no longer open for ticket purchases
        Completed // The goongery has been closed and the numbers drawn
    }

    struct GoongeryInfo {
        Status status;
        uint8[3] allocation;
        uint256 goongPerTicket;
        uint256 busdPerTicket;
        uint256 openingTimestamp;
        uint256 closingTimestamp;
        uint256[] tokenIds;
        uint8[3] winningNumbers;
    }

    // Maximum burn percentage to be adjusted
    uint8 public constant MAX_BURN_PERCENTAGE = 20;
    // Maximum team fee percentage to be adjusted
    uint8 public constant MAX_TEAM_FEE_PERCENTAGE = 50;
    // Minimum seconds allowed to buy ticket per round
    uint256 public constant MIN_BUY_TICKET_TIME = 1 hours;
    // Minimum goong per ticket
    uint256 public constant MIN_GOONG_PER_TICKET = 1 ether;
    // Minimum busd per ticket
    uint256 public constant MIN_BUSD_PER_TICKET = 1 ether;
    // Goong address
    IERC20 public goong;
    // BUSD address
    IERC20 public busd;
    // NFT represent googery ticket.
    GoongeryNFT public nft;
    // Percentage of total goong to be burned (0 - 100)
    uint8 public burnPercentage;
    // Percentage of total busd allocated to system maintenance cost, dev cost, etc.
    uint8 public teamFeePercentage;
    // Maximum number for each digit
    uint8 public maxNumber;
    // Round number
    uint256 public roundNumber = 0;
    // roundNumber => GoongeryInfo
    mapping(uint256 => GoongeryInfo) public goongeryInfo;
    // address => [tokenId]
    mapping(address => uint256[]) public userInfo;
    // issueId => buyOption => googeryNumbersId => buyAmountSum
    mapping(uint256 => mapping(GoongeryOption.Buy => mapping(uint64 => uint256)))
        public userBuyAmountSum;

    uint256 public totalAmount = 0;
    uint256 public totalAddresses = 0;
    uint256 public lastTimestamp;

    event Buy(address indexed user, uint256 tokenId);

    constructor(
        address _goong,
        address _busd,
        address _nft,
        uint8 _maxNumber
    ) public {
        goong = IERC20(_goong);
        busd = IERC20(_busd);
        nft = GoongeryNFT(_nft);
        maxNumber = _maxNumber;
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
        uint256 totalBusdAmount = calculateBusdCost(_numberOfTickets);

        uint256 tokenId = nft.create(
            msg.sender,
            _numbers,
            totalGoongAmount,
            roundNumber,
            _buyOption
        );

        goongeryInfo[roundNumber].tokenIds.push(tokenId);
        userInfo[msg.sender].push(tokenId);
        totalAmount = totalAmount.add(totalGoongAmount);
        lastTimestamp = block.timestamp;

        addUserBuyAmountSum(_numbers, totalGoongAmount, _buyOption);

        goong.safeTransferFrom(msg.sender, address(this), totalGoongAmount);
        busd.safeTransferFrom(msg.sender, address(this), totalBusdAmount);

        emit Buy(msg.sender, tokenId);
    }

    function calculateGoongCost(uint256 numberOfTickets)
        public
        view
        returns (uint256)
    {
        return numberOfTickets.mul(goongeryInfo[roundNumber].goongPerTicket);
    }

    function calculateBusdCost(uint256 numberOfTickets)
        public
        view
        returns (uint256)
    {
        return numberOfTickets.mul(goongeryInfo[roundNumber].busdPerTicket);
    }

    function createNewRound(
        uint8[3] calldata _allocation,
        uint256 _goongPerTicket,
        uint256 _busdPerTicket,
        uint256 _openingTimestamp,
        uint256 _closingTimestamp
    ) external onlyOwner {
        require(
            _goongPerTicket > MIN_GOONG_PER_TICKET,
            "goongPerTicket must be greater than MIN_GOONG_PER_TICKET"
        );
        require(
            _busdPerTicket > MIN_BUSD_PER_TICKET,
            "goongPerTicket must be greater than MIN_BUSD_PER_TICKET"
        );
        require(
            _openingTimestamp > block.timestamp,
            "openingTimstamp cannot be the past"
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
            lotteryStatus = Status.Open;
        } else {
            lotteryStatus = Status.NotStarted;
        }
        uint256[] memory emptyTokenIds;
        uint8[3] memory emptyWinningNumbers;
        GoongeryInfo memory info = GoongeryInfo({
            status: lotteryStatus,
            allocation: _allocation,
            goongPerTicket: _goongPerTicket,
            busdPerTicket: _busdPerTicket,
            openingTimestamp: _openingTimestamp,
            closingTimestamp: _closingTimestamp,
            tokenIds: emptyTokenIds,
            winningNumbers: emptyWinningNumbers
        });

        roundNumber = roundNumber.add(1);
        goongeryInfo[roundNumber] = info;
    }

    function drawWinningNumbers() external onlyOwner {}

    function drawWinningNumbersCallback() external {}

    function addUserBuyAmountSum(
        uint8[3] memory _numbers,
        uint256 _price,
        GoongeryOption.Buy _buyOption
    ) internal {
        // Create a copy of _numbers;
        uint8[3] memory numbersForNumberId = [
            _numbers[0],
            _numbers[1],
            _numbers[2]
        ];

        if (_buyOption == GoongeryOption.Buy.PermutableThreeDigits) {
            numbersForNumberId = getLeastPermutableNumber(numbersForNumberId);
        } else if (_buyOption == GoongeryOption.Buy.LastTwoDigits) {
            numbersForNumberId[2] = ~uint8(0);
        }

        uint64 numberId = calculateGoongeryNumberId(numbersForNumberId);
        userBuyAmountSum[roundNumber][_buyOption][numberId] = userBuyAmountSum[
            roundNumber
        ][_buyOption][numberId]
        .add(_price);
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

    function setTeamFeePercentage(uint8 percentage) external onlyOwner {
        require(percentage <= MAX_TEAM_FEE_PERCENTAGE, "Exceed max team fee");
        teamFeePercentage = percentage;
    }

    function setBurnPercentage(uint8 percentage) external onlyOwner {
        require(
            percentage <= MAX_BURN_PERCENTAGE,
            "Exceed max burn percentage"
        );
        burnPercentage = percentage;
    }
}
