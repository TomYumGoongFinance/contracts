// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./GoongVesting.sol";
import "./GoongToken.sol";

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

contract GoongVestingController is Ownable {
    using SafeMath for uint256;

    GoongVesting public goongVesting;
    GoongToken public goong;

    constructor(address _goong, address _goongVesting) public {
        goongVesting = GoongVesting(_goongVesting);
        goong = GoongToken(_goong);
    }

    /**
     * @dev Transfer $GOONG token to this contract and locked given amount with the given duration.
     * @param _recipient the address of recipient who vested the token,
     * @param _startDate the start date to proportionally release the token in unix time
     * @param _duration the duration of vesting in unix seconds
     * @param _amount the vesting amount
     */
    function addTokenVesting(
        address _recipient,
        uint256 _startDate,
        uint256 _duration,
        uint256 _amount
    ) public onlyOwner {
        goong.transferFrom(msg.sender, address(this), _amount);
        goong.approve(address(goongVesting), _amount);

        goongVesting.addTokenVesting(
            _recipient,
            _startDate,
            _duration,
            _amount
        );
    }

    /**
     * @dev batch add token vesting for multiple addresses with the same `startDate`, `duration`, and `amount`
     * @param _recipients An array of addresses to vest token.
     * @param _startDate The unix time in seconds to start distributing token.
     * @param _duration The number of seconds from _startDate to be fully unlocked.
     * @param _amount The total amount of tokens to be locked for each _recipient.
     */
    function batchAddTokenVesting(
        address[] memory _recipients,
        uint256 _startDate,
        uint256 _duration,
        uint256 _amount
    ) public onlyOwner {
        uint256 transferAmount = _amount.mul(_recipients.length);
        goong.transferFrom(msg.sender, address(this), transferAmount);
        goong.approve(address(goongVesting), transferAmount);

        for (uint256 i = 0; i < _recipients.length; i++) {
            goongVesting.addTokenVesting(
                _recipients[i],
                _startDate,
                _duration,
                _amount
            );
        }
    }

    /**
     * @dev batch add token vesting for multiple addresses with the same `startDate`, `duration`, and different `amount`
     * @param _recipients An array of addresses to vest token.
     * @param _startDate The unix time in seconds to start distributing token.
     * @param _duration The number of seconds from _startDate to be fully unlocked.
     * @param _amounts The total amount of tokens to be locked for each _recipient.
     */
    function batchAddTokenVestingMultiAmounts(
        address[] memory _recipients,
        uint256 _startDate,
        uint256 _duration,
        uint256[] memory _amounts
    ) public onlyOwner {
        require(
            _recipients.length == _amounts.length,
            "amounts and recipients length must be matched"
        );

        uint256 transferAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            transferAmount = transferAmount.add(_amounts[i]);
        }
        goong.transferFrom(msg.sender, address(this), transferAmount);
        goong.approve(address(goongVesting), transferAmount);

        for (uint256 i = 0; i < _recipients.length; i++) {
            goongVesting.addTokenVesting(
                _recipients[i],
                _startDate,
                _duration,
                _amounts[i]
            );
        }
    }

    /**
     * @dev Transfer `goongVesting` ownership from this contract address to the owner of this contract.
     */
    function claimOwnership() public onlyOwner {
        goongVesting.transferOwnership(msg.sender);
    }

    /**
     * @dev Change target of `GoongVesting` contract
     */
    function setGoongVesting(address _goongVesting) public onlyOwner {
        goongVesting = GoongVesting(_goongVesting);
    }
}
