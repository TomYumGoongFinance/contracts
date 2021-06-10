// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./libs/IBEP20.sol";
import "hardhat/console.sol";

/**
 * Author: tomyumchef at tomyumgoong.finance
 * Vesting $goong for development team and marketing over given period
 */
contract GoongVesting is Ownable {
    using SafeMath for uint256;
    IBEP20 public token;

    mapping(address => VestingInfo) public vestingInfo;

    uint256 constant MINIMUM_VESTED_AMOUNT = 1000 ether;

    uint256 public minimumDuration;

    event Claimed(address indexed recipient, uint256 claimedAmount);
    event AddedTokenVesting(address indexed recipient);

    struct VestingInfo {
        address recipient; // Address of the recipient who can claim vested token.
        uint256 startDate; // Start date in unix time
        uint256 duration; // Duration in unix time
        uint256 initialLockedAmount; // Initial locked amount
        uint256 claimedAmount; // Total claimed token amount
    }

    constructor(address _token, uint256 _minDuration) public {
        token = IBEP20(_token);
        minimumDuration = _minDuration;
    }

    modifier onlyVestedRecipient() {
        require(
            vestingInfo[msg.sender].recipient == msg.sender,
            "recipient haven't vested any goong."
        );
        _;
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
        require(
            vestingInfo[_recipient].initialLockedAmount == 0,
            "recipient is already vested goong"
        );
        require(
            _duration >= minimumDuration,
            "vested duration must be greater than minimum duration"
        );
        require(
            _amount >= MINIMUM_VESTED_AMOUNT,
            "vested amount must be greater than 1000 goong"
        );
        require(_startDate >= block.timestamp, "start date cannot be the past");

        VestingInfo memory _vestingInfo =
            VestingInfo({
                recipient: _recipient,
                startDate: _startDate,
                duration: _duration,
                initialLockedAmount: _amount,
                claimedAmount: 0
            });

        vestingInfo[_recipient] = _vestingInfo;

        token.transferFrom(msg.sender, address(this), _amount);

        emit AddedTokenVesting(_recipient);
    }

    /**
     * Claim the granted token back to the sender proportionately with the vested duration.
     */
    function claim() public onlyVestedRecipient {
        VestingInfo storage info = vestingInfo[msg.sender];

        require(info.startDate < block.timestamp, "too early to claim");
        require(
            info.initialLockedAmount > info.claimedAmount,
            "already claimed all vested tokens"
        );

        uint256 _claimableAmount = claimableAmount(msg.sender);

        // Handle rounding error
        if (
            _claimableAmount.add(info.claimedAmount) > info.initialLockedAmount
        ) {
            _claimableAmount = info.initialLockedAmount.sub(info.claimedAmount);
        }

        token.transfer(msg.sender, _claimableAmount);
        info.claimedAmount = info.claimedAmount.add(_claimableAmount);

        emit Claimed(msg.sender, _claimableAmount);
    }

    /**
     * @dev Calculate a number of seconds to be fully unlocked.
     * @param recipient a vesting recipient address.
     * @return number of seconds until fully unlocked. returns 0 if it's already fully unlocked.
     */
    function vestedDurationLeft(address recipient)
        public
        view
        returns (uint256)
    {
        VestingInfo memory info = vestingInfo[recipient];
        uint256 _claimableAmount = claimableAmount(recipient);

        // Either recipient is able to claims all vested tokens or recipient is already claim all tokens.
        if (
            _claimableAmount.add(info.claimedAmount) >= info.initialLockedAmount
        ) {
            return 0;
        }

        return info.startDate.add(info.duration).sub(block.timestamp);
    }

    /**
     * Returns remaining vested amount for given address
     * @param recipient A vesting recipient address
     */
    function remainingVestedAmount(address recipient)
        public
        view
        returns (uint256)
    {
        uint256 _remainingVestingAmount =
            vestingInfo[recipient].initialLockedAmount.sub(
                vestingInfo[recipient].claimedAmount
            );

        return _remainingVestingAmount;
    }

    /**
     * Returns claimable amount for given address
     * @param recipient A vesting recipient address
     * @return an amount of tokens that ready to be claimed
     */
    function claimableAmount(address recipient) public view returns (uint256) {
        VestingInfo memory info = vestingInfo[recipient];

        if (info.initialLockedAmount == 0) {
            return 0;
        }

        if (block.timestamp < info.startDate) return 0;

        uint256 _claimableAmount =
            info
                .initialLockedAmount
                .mul(block.timestamp.sub(info.startDate))
                .div(info.duration)
                .sub(info.claimedAmount);

        return _claimableAmount;
    }

    function claimablePerDay(address recipient) public view returns (uint256) {
        VestingInfo memory info = vestingInfo[recipient];

        if (info.initialLockedAmount == 0) return 0;

        return uint256(1 days).mul(info.initialLockedAmount).div(info.duration);
    }
}
