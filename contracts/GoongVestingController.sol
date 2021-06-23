// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./GoongVesting.sol";

contract GoongVestingController is Ownable {
    GoongVesting public goongVesting;

    constructor(address _goongVesting) public {
        goongVesting = GoongVesting(_goongVesting);
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
        for (uint256 i = 0; i < _recipients.length; i++) {
            addTokenVesting(_recipients[i], _startDate, _duration, _amount);
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
