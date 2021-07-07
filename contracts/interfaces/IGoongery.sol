// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../libs/GoongeryOption.sol";

interface IGoongery {
    // All goongery infos including past rounds.
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
    }

    // Represents the status of the goongery
    enum Status {
        NotStarted, // The goongery has not started yet
        Open, // The goongery is open for ticket purchases
        Closed, // The goongery is no longer open for ticket purchases
        Completed // The goongery has been closed and the numbers drawn
    }

    function drawWinningNumbersCallback(
        uint256 roundNumber,
        bytes32 requestId,
        uint256 randomNumber
    ) external;
}
