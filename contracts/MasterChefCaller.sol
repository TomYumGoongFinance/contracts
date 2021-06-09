// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

interface IMasterChef {
    function depositWithoutFee(uint256, uint256) external;
}

contract MasterChefCaller {
    function depositWithoutFee(
        uint256 masterChefAddress,
        uint256 poolId,
        uint256 amount
    ) public {
        IMasterChef masterChef = IMasterChef(masterChefAddress);
        masterChef.depositWithoutFee(poolId, amount);
    }
}
