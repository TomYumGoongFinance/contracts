// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/IBEP20.sol";

contract GoongeryRandomGenerator is VRFConsumerBase, Ownable {
    bytes32 internal keyHash;
    uint256 internal fee;
    address internal requester;
    address public link;
    uint256 public randomResult;
    address public goongery;
    uint256 public goongeryId;

    constructor(
        address _vrfCoordinator,
        address _linkToken,
        address _goongery,
        bytes32 _keyHash,
        uint256 _fee
    ) public VRFConsumerBase(_vrfCoordinator, _linkToken) {
        goongery = _goongery;
        fee = _fee;
        link = _linkToken;
        keyHash = _keyHash;
    }

    function getRandomNumber(uint256 _goongeryId)
        public
        returns (bytes32 requestId)
    {
        require(keyHash != bytes32(0), "Must have valid key hash");
        require(
            LINK.balanceOf(address(this)) >= fee,
            "Not enough LINK - fill contract with faucet"
        );
        requester = msg.sender;
        goongeryId = _goongeryId;
        return requestRandomness(keyHash, fee);
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        randomResult = randomness;
    }

    function withdrawLink(uint256 amount) public onlyOwner {
        IBEP20(link).transfer(msg.sender, amount);
    }
}
