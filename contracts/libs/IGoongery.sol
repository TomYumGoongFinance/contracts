// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IGoongery {
    function drawWinningNumbersCallback(
        uint256 roundNumber,
        bytes32 requestId,
        uint256 randomNumber
    ) external;
}
