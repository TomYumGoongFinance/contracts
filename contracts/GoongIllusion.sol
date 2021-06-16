// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

// Bot: I'm gonna get some load of goongs that listed on 16 Jun 2021, 13:00 UTC, so I can dump at goong investors!

// At 16 Jun 2021, 13:00 UTC..
// Goong: Genjutsu!. Try to guess which is the real one.
// Bot: WTF. My code can't guess which one is real.

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {GoongToken} from "./GoongToken.sol";
import {IPancakePair} from "./libs/IPancakePair.sol";
import "./libs/IBEP20.sol";

interface IFactory {
    function getPair(address, address) external view returns (address);
}

interface IPancakeRouter {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        );
}

contract GoongIllusion is Ownable {
    using SafeMath for uint256;

    IPancakeRouter router;
    address wbnb;

    constructor(address _routerAddress) public {
        router = IPancakeRouter(_routerAddress);
        wbnb = router.WETH();
    }

    /**
     * @dev Add liquidity 3 pairs at the same block
     * @param _goong main token address
     * @param _fakeGoong1 fake token address 1
     * @param _fakeGoong2 fake token address 2
     */
    function tripleLiquidity(
        address _goong,
        address _fakeGoong1,
        address _fakeGoong2
    ) public payable onlyOwner {
        GoongToken goong = GoongToken(_goong);
        GoongToken fakeGoong1 = GoongToken(_fakeGoong1);
        GoongToken fakeGoong2 = GoongToken(_fakeGoong2);

        uint256 requiredAmount = 10000 ether;

        require(
            goong.balanceOf(msg.sender) >= requiredAmount,
            "Insufficient goong"
        );
        require(
            fakeGoong1.balanceOf(msg.sender) >= requiredAmount,
            "Insufficient fakeGoong1"
        );
        require(
            fakeGoong2.balanceOf(msg.sender) >= requiredAmount,
            "Insufficient fakeGoong2"
        );

        // Transfer all goong to the contract
        goong.transferFrom(msg.sender, address(this), requiredAmount);
        fakeGoong1.transferFrom(msg.sender, address(this), requiredAmount);
        fakeGoong2.transferFrom(msg.sender, address(this), requiredAmount);

        // Approve all goong members to router.
        goong.approve(address(router), requiredAmount);
        fakeGoong1.approve(address(router), requiredAmount);
        fakeGoong2.approve(address(router), requiredAmount);

        // Approve bnb in case there's dust after adding liquidity
        IBEP20(wbnb).approve(address(router), msg.value);

        // Divide bnb value equally for 3 different pairs.
        uint256 bnbAmount = msg.value.div(3);

        router.addLiquidityETH{value: bnbAmount}(
            address(fakeGoong1),
            requiredAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 30
        );
        router.addLiquidityETH{value: bnbAmount}(
            address(fakeGoong2),
            requiredAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 30
        );
        router.addLiquidityETH{value: bnbAmount}(
            address(goong),
            requiredAmount,
            0,
            0,
            msg.sender,
            block.timestamp + 30
        );
    }

    // Receive dust bnb back from adding liquidity
    receive() external payable {
        (bool sent, ) = tx.origin.call{value: msg.value}("");
        require(sent, "failed to send left over bnb");
    }
}
