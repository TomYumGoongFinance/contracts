// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./IGoongery.sol";
import "../libs/GoongeryOption.sol";

enum Status {
    NotStarted, // The goongery has not started yet
    Open, // The goongery is open for ticket purchases
    Closed, // The goongery is no longer open for ticket purchases
    Completed // The goongery has been closed and the numbers drawn
}

struct GoongeryInfo {
    Status status;
    uint64[3] allocation;
    uint256 goongPerTicket;
    uint256 openingTimestamp;
    uint256 closingTimestamp;
    uint256[] tokenIds;
    uint8[3] winningNumbers;
    uint256 totalGoongPrize;
    uint256 burnAmount;
    uint64 burnPercentage;
    uint8 maxNumber;
}

interface IGoongeryInfoHolder {
    function getGoongeryInfo(uint256 _roundNumber)
        external
        view
        returns (GoongeryInfo memory);

    function calculateGoongCost(uint256 _roundNumber, uint256 numberOfTickets)
        external
        view
        returns (uint256);

    function setGoongeryInfo(
        uint256 _roundNumber,
        GoongeryInfo memory _goongeryInfo
    ) external;

    function addGoongeryInfoTokenId(uint256 _roundNumber, uint256 _tokenId)
        external;

    function addGoongeryInfoBurnAmount(
        uint256 _roundNumber,
        uint256 _burnAmount
    ) external;

    function addGoongeryInfoTotalGoongPrize(
        uint256 _roundNumber,
        uint256 _goongAmount
    ) external;

    function drawWinningNumbers(uint256 roundNumber) external;

    function drawWinningNumbersCallback(
        uint256 _roundNumber,
        uint256 _randomNumber,
        uint256 maxNumber
    ) external;

    function setGoongeryInfoBurnAmount(
        uint256 _roundNumber,
        uint256 _burnAmount
    ) external;

    function calculateReward(
        uint256 _nftId,
        uint256 _roundNumber,
        GoongeryOption.Buy _buyOption
    ) external view returns (uint256);

    function getAllocation(uint256 _roundNumber)
        external
        view
        returns (uint64[3] memory);

    function getWinningNumbers(uint256 _roundNumber)
        external
        view
        returns (uint8[3] memory);

    function getTokenIds(uint256 _roundNumber)
        external
        view
        returns (uint256[] memory);

    function getUserTokenIdsByRound(address owner, uint256 _roundNumber)
        external
        view
        returns (uint256[] memory);

    function addUserTokenIdsByRound(
        address owner,
        uint256 _roundNumber,
        uint256 tokenId
    ) external;

    function addUserBuyAmountSum(
        uint256 roundNumber,
        uint8[3] memory _numbers,
        uint256 _price,
        GoongeryOption.Buy _buyOption
    ) external;

    function calculateUnmatchedReward(uint256 _roundNumber)
        external
        view
        returns (uint256);

    function setGoongeryInfoStatus(uint256 _roundNumber, Status _status)
        external;

    function addUserBuyAmount(
        uint256 _price,
        uint256 roundNumber,
        uint64 numberId,
        GoongeryOption.Buy _buyOption
    ) external;

    function getUserBuyAmountSum(
        uint256 _roundNumber,
        uint64 _numberId,
        GoongeryOption.Buy _buyOption
    ) external view returns (uint256);
}
