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
import "./interfaces/IGoongeryRandomGenerator.sol";
import "./interfaces/IGoongeryInfoHolder.sol";

contract Goongery is Ownable, Initializable {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeERC20 for IERC20;
    using Address for address;

    // Maximum burn percentage to be adjusted
    uint64 public constant MAX_BURN_PERCENTAGE = 2000;
    // Maximum team fee percentage to be adjusted
    uint64 public constant MAX_TEAM_FEE_PERCENTAGE = 2000;
    // Minimum seconds allowed to buy ticket per round
    uint256 public constant MIN_BUY_TICKET_TIME = 1 hours;
    // Minimum goong per ticket
    uint256 public constant MIN_GOONG_PER_TICKET = 1 ether;
    // Minimum number for each digit
    uint256 public constant MIN_MAX_NUMBER = 9;
    // burn address
    address public constant BURN_ADDRESS =
        0x000000000000000000000000000000000000dEaD;
    // Goong address
    IERC20 public goong;
    // NFT represent googery ticket.
    GoongeryNFT public nft;
    // Address of goongery manager who has the right to call `createNewRound` and `drawWinningNumbers`
    address public goongeryManager;
    // Round number
    uint256 public roundNumber = 0;
    // Random generator
    IGoongeryRandomGenerator public goongeryRandomGenerator;
    // Goongery Info holder
    IGoongeryInfoHolder public goongeryInfoHolder;

    // address => [tokenId]
    mapping(address => uint256[]) public userInfo;

    // Random generator for request id
    bytes32 public requestId;

    modifier onlyRandomGenerator() {
        require(
            msg.sender == address(goongeryRandomGenerator),
            "Caller must be GoongeryRandomGenerator"
        );
        _;
    }

    modifier onlyGoongeryManager() {
        require(goongeryManager == msg.sender, "not goongery manager");
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
        address _goongeryInfoHolder
    ) external initializer onlyOwner() {
        goong = IERC20(_goong);
        goongeryRandomGenerator = IGoongeryRandomGenerator(
            _goongRandomGenerator
        );
        nft = GoongeryNFT(_nft);
        goongeryInfoHolder = IGoongeryInfoHolder(_goongeryInfoHolder);
        goongeryManager = msg.sender;
    }

    function createNewRound(
        uint64[3] calldata _allocation,
        uint256 _goongPerTicket,
        uint64 _burnPercentage,
        uint8 _maxNumber,
        uint256 _openingTimestamp,
        uint256 _closingTimestamp
    ) external onlyGoongeryManager {
        require(
            _goongPerTicket > MIN_GOONG_PER_TICKET,
            "goongPerTicket must be greater than MIN_GOONG_PER_TICKET"
        );
        require(
            _openingTimestamp > block.timestamp,
            "openingTimstamp cannot be the past"
        );
        require(
            _burnPercentage <= MAX_BURN_PERCENTAGE,
            "Exceed max burn percentage"
        );
        require(
            _maxNumber >= MIN_MAX_NUMBER,
            "maxNumber must be greater than 9"
        );

        GoongeryInfo memory goongeryInfo = getCurrentGoongeryInfo();
        require(
            goongeryInfo.closingTimestamp <= block.timestamp,
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
            totalAllocation == 10000 - _burnPercentage,
            "total allocation must be equal to 10000 - burnPercentage"
        );

        Status lotteryStatus;
        if (_openingTimestamp >= block.timestamp) {
            lotteryStatus = Status.NotStarted;
        } else {
            lotteryStatus = Status.Open;
        }
        uint256[] memory emptyTokenIds;
        uint8[3] memory winningNumbers = [~uint8(0), ~uint8(0), ~uint8(0)];

        uint256 _totalGoongPrize = goongeryInfoHolder.calculateUnmatchedReward(
            roundNumber
        );

        GoongeryInfo memory info = GoongeryInfo({
            status: lotteryStatus,
            allocation: _allocation,
            goongPerTicket: _goongPerTicket,
            openingTimestamp: _openingTimestamp,
            closingTimestamp: _closingTimestamp,
            tokenIds: emptyTokenIds,
            winningNumbers: winningNumbers,
            totalGoongPrize: _totalGoongPrize,
            burnAmount: 0,
            burnPercentage: _burnPercentage,
            maxNumber: _maxNumber
        });

        roundNumber = roundNumber.add(1);
        goongeryInfoHolder.setGoongeryInfo(roundNumber, info);
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
        GoongeryInfo memory goongeryInfo = getCurrentGoongeryInfo();
        require(
            block.timestamp >= goongeryInfo.openingTimestamp,
            "block timestamp < openingTimestamp"
        );
        require(
            block.timestamp < goongeryInfo.closingTimestamp,
            "block timestamp >= closingTimestamp"
        );

        uint8 upperBound = 3;
        if (_buyOption == GoongeryOption.Buy.LastTwoDigits) {
            upperBound = 2;
        }

        for (uint8 i = 0; i < upperBound; i++) {
            require(
                _numbers[i] <= goongeryInfo.maxNumber,
                "exceed max number allowed"
            );
        }

        if (goongeryInfo.status == Status.NotStarted) {
            goongeryInfoHolder.setGoongeryInfoStatus(roundNumber, Status.Open);
        }

        uint256 totalGoongAmount = goongeryInfoHolder.calculateGoongCost(
            roundNumber,
            _numberOfTickets
        );

        uint256 tokenId = nft.create(
            msg.sender,
            _numbers,
            totalGoongAmount,
            roundNumber,
            _buyOption
        );

        uint256 _burnAmount = totalGoongAmount
        .mul(goongeryInfo.burnPercentage)
        .div(10000);

        goongeryInfoHolder.addGoongeryInfoTokenId(roundNumber, tokenId);
        goongeryInfoHolder.addGoongeryInfoBurnAmount(roundNumber, _burnAmount);
        goongeryInfoHolder.addGoongeryInfoTotalGoongPrize(
            roundNumber,
            totalGoongAmount
        );
        goongeryInfoHolder.addUserTokenIdsByRound(roundNumber, tokenId);

        userInfo[msg.sender].push(tokenId);

        goongeryInfoHolder.addUserBuyAmountSum(
            roundNumber,
            _numbers,
            totalGoongAmount,
            _buyOption
        );

        goong.safeTransferFrom(msg.sender, address(this), totalGoongAmount);

        emit Buy(msg.sender, tokenId);
    }

    function getCurrentGoongeryInfo()
        private
        view
        returns (GoongeryInfo memory)
    {
        return goongeryInfoHolder.getGoongeryInfo(roundNumber);
    }

    function drawWinningNumbers() external onlyGoongeryManager {
        goongeryInfoHolder.drawWinningNumbers(roundNumber);
        require(
            address(goongeryRandomGenerator) != address(0),
            "Required RandomGenerator to be set"
        );
        requestId = goongeryRandomGenerator.getRandomNumber(roundNumber);
    }

    function drawWinningNumbersCallback(
        uint256 _roundNumber,
        bytes32 _requestId,
        uint256 _randomNumber
    ) external onlyRandomGenerator {
        GoongeryInfo memory goongeryInfo = getCurrentGoongeryInfo();
        if (_requestId == requestId) {
            goongeryInfoHolder.drawWinningNumbersCallback(
                _roundNumber,
                _randomNumber,
                goongeryInfo.maxNumber
            );
        }
    }

    function claimReward(uint256 _roundNumber, uint256 _nftId)
        external
        notContract
    {
        GoongeryInfo memory goongeryInfo = goongeryInfoHolder.getGoongeryInfo(
            _roundNumber
        );
        require(
            goongeryInfo.closingTimestamp <= block.timestamp,
            "Wait for winning numbers drawn"
        );
        require(
            goongeryInfo.status == Status.Completed,
            "Winning numbers are not chosen yet"
        );
        require(nft.ownerOf(_nftId) == msg.sender, "Caller must own nft");
        require(!nft.getClaimStatus(_nftId), "Nft is already claimed");

        nft.claimReward(_nftId);

        GoongeryOption.Buy _buyOption = nft.getBuyOption(_nftId);
        uint256 reward = goongeryInfoHolder.calculateReward(
            _nftId,
            _roundNumber,
            _buyOption
        );
        goong.safeTransfer(msg.sender, reward);
    }

    function batchClaimReward(uint256 _roundNumber, uint256[] memory _nftIds)
        external
        notContract
    {
        GoongeryInfo memory goongeryInfo = goongeryInfoHolder.getGoongeryInfo(
            _roundNumber
        );
        require(
            goongeryInfo.closingTimestamp <= block.timestamp,
            "Wait for winning numbers drawn"
        );
        require(
            goongeryInfo.status == Status.Completed,
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
                goongeryInfoHolder.calculateReward(
                    _nftId,
                    _roundNumber,
                    _buyOption
                )
            );
        }
        goong.safeTransfer(msg.sender, reward);
    }

    function burn(uint256 _roundNumber) external onlyOwner {
        GoongeryInfo memory goongeryInfo = goongeryInfoHolder.getGoongeryInfo(
            _roundNumber
        );
        require(goongeryInfo.status == Status.Completed, "not completed yet");
        require(goongeryInfo.burnAmount > 0, "already burned");

        goong.transfer(BURN_ADDRESS, goongeryInfo.burnAmount);

        goongeryInfoHolder.setGoongeryInfoBurnAmount(_roundNumber, 0);
    }

    // Todo: Remove when done test
    function setGoongeryRandomGenerator(address _randomGenerator)
        external
        onlyOwner
    {
        goongeryRandomGenerator = IGoongeryRandomGenerator(_randomGenerator);
    }

    function setGoongeryManager(address _goongeryManager) external onlyOwner {
        goongeryManager = _goongeryManager;
    }
}
