// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IGoongery.sol";
import "./libs/IBEP20.sol";

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

contract GoongeryRandomGenerator is VRFConsumerBase, Ownable {
    bytes32 internal keyHash;
    uint256 internal fee;
    address internal requester;
    address public link;
    uint256 public randomResult;
    IGoongery public goongery;
    uint256 public roundNumber;

    modifier onlyGoongery() {
        require(msg.sender == address(goongery), "Caller must be Goongery");
        _;
    }

    constructor(
        address _vrfCoordinator,
        address _linkToken,
        address _goongery,
        bytes32 _keyHash,
        uint256 _fee
    ) public VRFConsumerBase(_vrfCoordinator, _linkToken) {
        goongery = IGoongery(_goongery);
        fee = _fee;
        link = _linkToken;
        keyHash = _keyHash;
    }

    function getRandomNumber(uint256 _roundNumber)
        external
        onlyGoongery
        returns (bytes32 requestId)
    {
        require(keyHash != bytes32(0), "Must have valid key hash");
        require(
            LINK.balanceOf(address(this)) >= fee,
            "Not enough LINK - fill contract with faucet"
        );
        requester = msg.sender;
        roundNumber = _roundNumber;
        return requestRandomness(keyHash, fee);
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        IGoongery(requester).drawWinningNumbersCallback(
            roundNumber,
            requestId,
            randomness
        );
        randomResult = randomness;
    }

    function withdrawLink(uint256 amount) public onlyOwner {
        IBEP20(link).transfer(msg.sender, amount);
    }
}
