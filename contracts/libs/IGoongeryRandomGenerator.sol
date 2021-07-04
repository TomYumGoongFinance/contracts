// SPDX-License-Identifier: MIT

//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

interface IGoongeryRandomGenerator {
    /**
     * Requests randomness from a user-provided seed
     */
    function getRandomNumber(uint256 lotteryId)
        external
        returns (bytes32 requestId);
}
