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

// ████████╗░█████╗░███╗░░░███╗██╗░░░██╗██╗░░░██╗███╗░░░███╗░██████╗░░█████╗░░█████╗░███╗░░██╗░██████╗░
// ╚══██╔══╝██╔══██╗████╗░████║╚██╗░██╔╝██║░░░██║████╗░████║██╔════╝░██╔══██╗██╔══██╗████╗░██║██╔════╝░
// ░░░██║░░░██║░░██║██╔████╔██║░╚████╔╝░██║░░░██║██╔████╔██║██║░░██╗░██║░░██║██║░░██║██╔██╗██║██║░░██╗░
// ░░░██║░░░██║░░██║██║╚██╔╝██║░░╚██╔╝░░██║░░░██║██║╚██╔╝██║██║░░╚██╗██║░░██║██║░░██║██║╚████║██║░░╚██╗
// ░░░██║░░░╚█████╔╝██║░╚═╝░██║░░░██║░░░╚██████╔╝██║░╚═╝░██║╚██████╔╝╚█████╔╝╚█████╔╝██║░╚███║╚██████╔╝
// ░░░╚═╝░░░░╚════╝░╚═╝░░░░░╚═╝░░░╚═╝░░░░╚═════╝░╚═╝░░░░░╚═╝░╚═════╝░░╚════╝░░╚════╝░╚═╝░░╚══╝░╚═════╝░
//
// Website: https://tomyumgoong.finance
// Telegram: https://t.me/tomyumgoong_finance
//
//     ____________  \
//                 \ |
//                 / /
//      /=========== * ===
//     /=============-----
//    /=============\\
//   // |||| }}\\\\
//   |||
//    \\\
//     \\\

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
    // Todo: Adjust to 1 hour when deploy to mainnet
    uint256 public constant MIN_BUY_TICKET_TIME = 1 minutes;
    // Minimum goong per ticket
    uint256 public constant MIN_GOONG_PER_TICKET = 1 ether;
    // Minimum number for each digit
    uint256 public constant MIN_MAX_NUMBER = 9;
    // burn address
    address public constant BURN_ADDRESS =
        0x000000000000000000000000000000000000dEaD;
    uint256 public constant MAX_PROTOCOL_FEE_PERCENT = 2000;
    // Goong address
    IERC20 public goong;
    // NFT represent googery ticket.
    GoongeryNFT public nft;
    // Address of goongery manager who has the right to call `createNewRound` and `drawWinningNumbers`
    address public goongeryManager;
    address public protocolFeeAddress;
    uint256 public protocolFeePercent;
    // Round number
    uint256 public roundNumber = 0;
    // Random generator
    IGoongeryRandomGenerator public goongeryRandomGenerator;
    // Goongery Info holder
    IGoongeryInfoHolder public goongeryInfoHolder;
    // Random generator for request id
    bytes32 public requestId;

    event CreateNewRound(uint256 roundNumber);
    event Burn(uint256 roundNumber, uint256 burnAmount);
    event Buy(address indexed user, uint256 nftId);
    event ClaimReward(address indexed user, uint256 nftId);
    event BatchClaimReward(
        address indexed user,
        uint256 reward,
        uint256[] nftIds
    );
    event DrawWinningNumbers(uint256 roundNumber, bytes32 requestId);
    event DrawWinningNumbersCallBack(
        uint256 roundNumber,
        uint8[3] winningNumbers
    );
    event SetGoongeryManager(address indexed goongeryManager);
    event SetProtocolFeeAddress(address indexed protocolFee);
    event SetProtocolFeePercent(uint256 protocolFeePercent);

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

    function initialize(
        address _goong,
        address _goongRandomGenerator,
        address _nft,
        address _goongeryInfoHolder,
        address _protocolFeeAddress
    ) external initializer onlyOwner {
        goong = IERC20(_goong);
        goongeryRandomGenerator = IGoongeryRandomGenerator(
            _goongRandomGenerator
        );
        nft = GoongeryNFT(_nft);
        goongeryInfoHolder = IGoongeryInfoHolder(_goongeryInfoHolder);
        goongeryManager = msg.sender;
        protocolFeePercent = 1000;
        protocolFeeAddress = _protocolFeeAddress;
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
            _goongPerTicket >= MIN_GOONG_PER_TICKET,
            "goongPerTicket must be greater than MIN_GOONG_PER_TICKET"
        );
        require(
            _openingTimestamp > block.timestamp,
            "openingTimestamp cannot be the past"
        );
        require(
            _burnPercentage <= MAX_BURN_PERCENTAGE,
            "exceed max burn percentage"
        );
        require(
            _maxNumber >= MIN_MAX_NUMBER,
            "max number must be greater than 9"
        );

        GoongeryInfo memory goongeryInfo = getCurrentGoongeryInfo();
        require(
            goongeryInfo.closingTimestamp <= block.timestamp,
            "previous round must be completed"
        );
        if (roundNumber > 0) {
            require(
                goongeryInfo.status == Status.Completed,
                "winning number from previous round must be announced"
            );
        }
        require(
            _closingTimestamp > _openingTimestamp + MIN_BUY_TICKET_TIME,
            "closingTimestamp must be greater than openingTimestamp + MIN_BUY_TICKET_TIME"
        );

        uint256 totalAllocation = 0;
        for (uint8 i = 0; i < _allocation.length; i++) {
            totalAllocation = totalAllocation.add(_allocation[i]);
        }

        require(
            totalAllocation == 10000,
            "total allocation must be equal to 10000"
        );

        // Burn all goong from previous round
        burn(roundNumber);

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

        emit CreateNewRound(roundNumber);
    }

    function buy(
        uint256 _numberOfTickets,
        uint8[3] memory _numbers,
        GoongeryOption.Buy _buyOption
    ) public {
        GoongeryInfo memory goongeryInfo = getCurrentGoongeryInfo();
        require(
            block.timestamp >= goongeryInfo.openingTimestamp,
            "block timestamp must be greater than opening timestamp"
        );
        require(
            block.timestamp < goongeryInfo.closingTimestamp,
            "block timestamp must be less than closing timestamp"
        );

        uint8 _numberStartIndex = 0;
        if (_buyOption == GoongeryOption.Buy.LastTwoDigits) {
            _numberStartIndex = 1;
        }

        for (uint8 i = _numberStartIndex; i < 3; i++) {
            require(
                _numbers[i] <= goongeryInfo.maxNumber,
                "exceed max number allowed"
            );
        }

        if (goongeryInfo.status == Status.NotStarted) {
            goongeryInfoHolder.setGoongeryInfoStatus(roundNumber, Status.Open);
        }

        uint256 spentGoong = goongeryInfoHolder.calculateGoongCost(
            roundNumber,
            _numberOfTickets
        );

        uint256 tokenId = nft.create(
            msg.sender,
            _numbers,
            spentGoong,
            roundNumber,
            _buyOption
        );

        uint256 _burnAmount = spentGoong.mul(goongeryInfo.burnPercentage).div(
            10000
        );
        uint256 _prizeAmount = spentGoong.sub(_burnAmount);

        goongeryInfoHolder.addGoongeryInfoTokenId(roundNumber, tokenId);
        goongeryInfoHolder.addGoongeryInfoBurnAmount(roundNumber, _burnAmount);
        goongeryInfoHolder.addGoongeryInfoTotalGoongPrize(
            roundNumber,
            _prizeAmount
        );
        goongeryInfoHolder.addUserTokenIdsByRound(
            msg.sender,
            roundNumber,
            tokenId
        );

        goongeryInfoHolder.addTokenIdForUserInfo(msg.sender, tokenId);

        goongeryInfoHolder.addUserBuyAmountSum(
            roundNumber,
            _numbers,
            spentGoong,
            _buyOption
        );

        goong.safeTransferFrom(msg.sender, address(this), spentGoong);

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
        require(
            address(goongeryRandomGenerator) != address(0),
            "Required RandomGenerator to be set"
        );
        goongeryInfoHolder.drawWinningNumbers(roundNumber);
        requestId = goongeryRandomGenerator.getRandomNumber(roundNumber);
        emit DrawWinningNumbers(roundNumber, requestId);
    }

    function drawWinningNumbersCallback(
        uint256 _roundNumber,
        bytes32 _requestId,
        uint256 _randomNumber
    ) external onlyRandomGenerator {
        GoongeryInfo memory goongeryInfo = getCurrentGoongeryInfo();
        if (_requestId == requestId) {
            uint8[3] memory winningNumbers = goongeryInfoHolder
                .drawWinningNumbersCallback(
                    _roundNumber,
                    _randomNumber,
                    goongeryInfo.maxNumber
                );
            emit DrawWinningNumbersCallBack(_roundNumber, winningNumbers);
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

        emit ClaimReward(msg.sender, _nftId);
    }

    function batchClaimReward(uint256[] memory _nftIds) external notContract {
        uint256 reward;
        for (uint256 i = 0; i < _nftIds.length; i++) {
            uint256 _nftId = _nftIds[i];
            uint256 _roundNumber = nft.getRoundNumber(_nftId);
            GoongeryOption.Buy _buyOption = nft.getBuyOption(_nftId);

            GoongeryInfo memory goongeryInfo = goongeryInfoHolder
                .getGoongeryInfo(_roundNumber);

            require(!nft.getClaimStatus(_nftId), "Nft is already claimed");
            require(nft.ownerOf(_nftId) == msg.sender, "Caller must own nft");
            require(
                goongeryInfo.status == Status.Completed,
                "Winning numbers are not chosen yet"
            );

            nft.claimReward(_nftId);
            reward = reward.add(
                goongeryInfoHolder.calculateReward(
                    _nftId,
                    _roundNumber,
                    _buyOption
                )
            );
        }

        goong.safeTransfer(msg.sender, reward);
        emit BatchClaimReward(msg.sender, reward, _nftIds);
    }

    function burn(uint256 _roundNumber) private {
        GoongeryInfo memory goongeryInfo = goongeryInfoHolder.getGoongeryInfo(
            _roundNumber
        );
        if (goongeryInfo.burnAmount > 0) {
            uint256 protocolFeeAmount = goongeryInfo
                .burnAmount
                .mul(protocolFeePercent)
                .div(10000);

            uint256 burnAmount = goongeryInfo.burnAmount.sub(protocolFeeAmount);

            goong.transfer(protocolFeeAddress, protocolFeeAmount);
            goong.transfer(BURN_ADDRESS, burnAmount);

            goongeryInfoHolder.setGoongeryInfoBurnAmount(_roundNumber, 0);

            emit Burn(_roundNumber, burnAmount);
        }
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

        emit SetGoongeryManager(_goongeryManager);
    }

    function setProtocolFeeAddress(address _protocolFeeAddress)
        external
        onlyOwner
    {
        protocolFeeAddress = _protocolFeeAddress;

        emit SetProtocolFeeAddress(_protocolFeeAddress);
    }

    function setProtocolFeePercent(uint256 _protocolFeePercent)
        external
        onlyOwner
    {
        require(
            _protocolFeePercent <= MAX_PROTOCOL_FEE_PERCENT,
            "exceed max protocol fee percent"
        );
        protocolFeePercent = _protocolFeePercent;

        emit SetProtocolFeePercent(_protocolFeePercent);
    }
}
