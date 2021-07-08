// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IGoongery.sol";
import "./interfaces/IGoongeryInfoHolder.sol";
import "./libs/GoongeryOption.sol";
import "./libs/GoongeryHelper.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./GoongeryNFT.sol";
import "hardhat/console.sol";

contract GoongeryInfoHolder is IGoongeryInfoHolder {
    using SafeMath for uint256;
    using SafeMath for uint8;

    IGoongery goongery;
    GoongeryNFT public nft;

    // roundNumber => GoongeryInfo
    mapping(uint256 => GoongeryInfo) public goongeryInfo;
    mapping(uint256 => mapping(GoongeryOption.Buy => mapping(uint64 => uint256)))
        public userBuyAmountSum;
    // address => roundNumber => [tokenId]
    mapping(address => mapping(uint256 => uint256[])) public userInfoByRound;
    // Random generator for request id
    bytes32 public requestId;

    modifier onlyGoongery() {
        require(msg.sender == address(goongery), "Caller must be Goongery");
        _;
    }

    constructor(address _goongery, address _nft) public {
        goongery = IGoongery(_goongery);
        nft = GoongeryNFT(_nft);
    }

    function getGoongeryInfo(uint256 _roundNumber)
        external
        view
        override
        returns (GoongeryInfo memory)
    {
        return goongeryInfo[_roundNumber];
    }

    function setGoongeryInfo(
        uint256 _roundNumber,
        GoongeryInfo memory _goongeryInfo
    ) external override onlyGoongery {
        require(
            goongeryInfo[_roundNumber].openingTimestamp == 0,
            "already set"
        );
        goongeryInfo[_roundNumber] = _goongeryInfo;
    }

    function setGoongeryInfoStatus(uint256 _roundNumber, Status _status)
        external
        override
        onlyGoongery
    {
        goongeryInfo[_roundNumber].status = _status;
    }

    function calculateReward(
        uint256 _nftId,
        uint256 _roundNumber,
        GoongeryOption.Buy _buyOption
    ) external view override returns (uint256) {
        if (goongeryInfo[_roundNumber].status != Status.Completed) {
            return 0;
        }

        uint8[3] memory _numbers = getNumbersForRewardCalculation(_nftId);

        uint64 numberId = GoongeryHelper.calculateGoongeryNumberId(_numbers);

        uint256 totalGoongForNumbers = getUserBuyAmountSum(
            _roundNumber,
            numberId,
            _buyOption
        );
        uint64 goongAllocation = goongeryInfo[_roundNumber].allocation[
            uint256(_buyOption)
        ];
        uint256 totalGoong = goongeryInfo[_roundNumber].totalGoongPrize;
        uint256 userGoong = nft.getAmount(_nftId);

        return
            totalGoong
                .mul(goongAllocation)
                .mul(userGoong)
                .div(totalGoongForNumbers)
                .div(10000);
    }

    function getNumbersForRewardCalculation(uint256 _nftId)
        private
        view
        returns (uint8[3] memory)
    {
        uint8[3] memory buyNumbers = nft.getNumbers(_nftId);
        GoongeryOption.Buy buyOption = nft.getBuyOption(_nftId);
        if (buyOption == GoongeryOption.Buy.PermutableThreeDigits) {
            return GoongeryHelper.getLeastPermutableNumber(buyNumbers);
        } else if (buyOption == GoongeryOption.Buy.LastTwoDigits) {
            buyNumbers[2] = ~uint8(0);
        }

        return buyNumbers;
    }

    function setGoongeryInfoBurnAmount(
        uint256 _roundNumber,
        uint256 _burnAmount
    ) external override onlyGoongery {
        goongeryInfo[_roundNumber].burnAmount = _burnAmount;
    }

    function addGoongeryInfoTokenId(uint256 _roundNumber, uint256 _tokenId)
        external
        override
        onlyGoongery
    {
        goongeryInfo[_roundNumber].tokenIds.push(_tokenId);
    }

    function addGoongeryInfoBurnAmount(
        uint256 _roundNumber,
        uint256 _burnAmount
    ) external override onlyGoongery {
        goongeryInfo[_roundNumber].burnAmount = goongeryInfo[_roundNumber]
        .burnAmount
        .add(_burnAmount);
    }

    function addGoongeryInfoTotalGoongPrize(
        uint256 _roundNumber,
        uint256 _goongAmount
    ) external override onlyGoongery {
        goongeryInfo[_roundNumber].totalGoongPrize = goongeryInfo[_roundNumber]
        .totalGoongPrize
        .add(_goongAmount);
    }

    function getAllocation(uint256 _roundNumber)
        external
        view
        override
        returns (uint64[3] memory)
    {
        return goongeryInfo[_roundNumber].allocation;
    }

    function getWinningNumbers(uint256 _roundNumber)
        external
        view
        override
        returns (uint8[3] memory)
    {
        return goongeryInfo[_roundNumber].winningNumbers;
    }

    function getTokenIds(uint256 _roundNumber)
        external
        view
        override
        returns (uint256[] memory)
    {
        return goongeryInfo[_roundNumber].tokenIds;
    }

    function getUserTokenIdsByRound(address owner, uint256 _roundNumber)
        external
        view
        override
        returns (uint256[] memory)
    {
        return userInfoByRound[owner][_roundNumber];
    }

    function addUserTokenIdsByRound(
        address owner,
        uint256 _roundNumber,
        uint256 tokenId
    ) external override onlyGoongery {
        userInfoByRound[owner][_roundNumber].push(tokenId);
    }

    function calculateUnmatchedReward(uint256 _roundNumber)
        public
        view
        override
        returns (uint256)
    {
        uint256 totalUnmatchedReward = 0;
        // BuyOption: ExactThreeDigits
        uint64 exactThreeDigitsNumberId = GoongeryHelper
        .calculateGoongeryNumberId(goongeryInfo[_roundNumber].winningNumbers);
        uint256 exactThreeDigitsTotalShared = userBuyAmountSum[_roundNumber][
            GoongeryOption.Buy.ExactThreeDigits
        ][exactThreeDigitsNumberId];

        uint64 permutableThreeDigitsNumberId = GoongeryHelper
        .calculateGoongeryNumberId(goongeryInfo[_roundNumber].winningNumbers);
        uint256 permutableThreeDigitsTotalShared = userBuyAmountSum[
            _roundNumber
        ][GoongeryOption.Buy.PermutableThreeDigits][
            permutableThreeDigitsNumberId
        ];

        uint64 lastTwoDigitsNumberId = GoongeryHelper.calculateGoongeryNumberId(
            goongeryInfo[_roundNumber].winningNumbers
        );
        uint256 lastTwoDigitsTotalShared = userBuyAmountSum[_roundNumber][
            GoongeryOption.Buy.LastTwoDigits
        ][lastTwoDigitsNumberId];

        if (exactThreeDigitsTotalShared == 0) {
            totalUnmatchedReward = totalUnmatchedReward.add(
                goongeryInfo[_roundNumber]
                .totalGoongPrize
                .mul(goongeryInfo[_roundNumber].allocation[0])
                .div(10000)
            );
        }

        if (permutableThreeDigitsTotalShared == 0) {
            totalUnmatchedReward = totalUnmatchedReward.add(
                goongeryInfo[_roundNumber]
                .totalGoongPrize
                .mul(goongeryInfo[_roundNumber].allocation[1])
                .div(10000)
            );
        }

        if (lastTwoDigitsTotalShared == 0) {
            totalUnmatchedReward = totalUnmatchedReward.add(
                goongeryInfo[_roundNumber]
                .totalGoongPrize
                .mul(goongeryInfo[_roundNumber].allocation[2])
                .div(10000)
            );
        }

        return totalUnmatchedReward;
    }

    function addUserBuyAmount(
        uint256 _price,
        uint256 roundNumber,
        uint64 numberId,
        GoongeryOption.Buy _buyOption
    ) external override onlyGoongery {
        userBuyAmountSum[roundNumber][_buyOption][numberId] = userBuyAmountSum[
            roundNumber
        ][_buyOption][numberId]
        .add(_price);
    }

    function addUserBuyAmountSum(
        uint256 roundNumber,
        uint8[3] memory _numbers,
        uint256 _price,
        GoongeryOption.Buy _buyOption
    ) external override onlyGoongery {
        // Create a copy of _numbers;
        uint8[3] memory numbersForId = [_numbers[0], _numbers[1], _numbers[2]];

        if (_buyOption == GoongeryOption.Buy.PermutableThreeDigits) {
            numbersForId = GoongeryHelper.getLeastPermutableNumber(
                numbersForId
            );
        } else if (_buyOption == GoongeryOption.Buy.LastTwoDigits) {
            numbersForId[2] = ~uint8(0);
        }

        uint64 numberId = GoongeryHelper.calculateGoongeryNumberId(
            numbersForId
        );

        userBuyAmountSum[roundNumber][_buyOption][numberId] = userBuyAmountSum[
            roundNumber
        ][_buyOption][numberId]
        .add(_price);
    }

    function getUserBuyAmountSum(
        uint256 _roundNumber,
        uint64 _numberId,
        GoongeryOption.Buy _buyOption
    ) public view override returns (uint256) {
        return userBuyAmountSum[_roundNumber][_buyOption][_numberId];
    }

    function drawWinningNumbers(uint256 roundNumber)
        external
        override
        onlyGoongery
    {
        require(
            goongeryInfo[roundNumber].closingTimestamp <= block.timestamp,
            "Cannot draw before close"
        );
        require(
            goongeryInfo[roundNumber].status == Status.Open,
            "Invalid status"
        );

        goongeryInfo[roundNumber].status = Status.Closed;
    }

    function drawWinningNumbersCallback(
        uint256 _roundNumber,
        uint256 _randomNumber,
        uint256 maxNumber
    ) external override onlyGoongery {
        require(
            goongeryInfo[_roundNumber].status == Status.Closed,
            "Draw winning numbers first"
        );
        goongeryInfo[_roundNumber].status = Status.Completed;
        goongeryInfo[_roundNumber].winningNumbers = _extract(
            _randomNumber,
            maxNumber
        );
    }

    function _extract(uint256 _randomNumber, uint256 maxNumber)
        private
        pure
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

    function calculateGoongCost(uint256 _roundNumber, uint256 numberOfTickets)
        external
        view
        override
        returns (uint256)
    {
        return numberOfTickets.mul(goongeryInfo[_roundNumber].goongPerTicket);
    }
}
