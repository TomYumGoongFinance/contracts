// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./libs/IBEP20.sol";

/**
 * Author: tomyumchef at tomyumgoong.finance
 * Vesting $goong for development team and marketing over given period
 */
contract GoongAirdrop is Ownable {
    using SafeMath for uint256;

    struct AirdropInfo {
        address recipient; // Address of the recipient who can claim vested token.
        uint256 startDate; // Start date in unix time
        uint256 duration; // Duration in unix time
        uint256 amount; // Total claimed token amount
    }

    IBEP20 public token;
    mapping(address => AirdropInfo) public airdropInfo;
    address[] public airdropRecipients = [];

    uint256 constant MINIMUM_VESTED_AMOUNT = 1 ether;
    uint256 public minimumDuration = 0;

    event Claimed(address indexed recipient, uint256 claimedAmount);
    event AddedTokenAirdrop(address indexed recipient);

    constructor(address _token) public {
        token = IBEP20(_token);
    }

    modifier onlyVestedRecipient() {
        require(
            airdropInfo[msg.sender].recipient == msg.sender,
            "recipient haven't got any goong."
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
    function addAirdrop(
        address _recipient,
        uint256 _startDate,
        uint256 _duration,
        uint256 _amount
    ) public onlyOwner {
        require(
            airdropInfo[_recipient].amount == 0,
            "recipient is already claimed goong"
        );
        require(
            _duration >= minimumDuration,
            "airdrop duration must be greater than minimum duration"
        );
        require(
            _amount >= MINIMUM_VESTED_AMOUNT,
            "airdrop amount must be greater than 1 goong"
        );
        require(_startDate >= block.timestamp, "start date cannot be the past");

        AirdropInfo memory _airdropInfo =
            AirdropInfo({
                recipient: _recipient,
                startDate: _startDate,
                duration: _duration,
                amount: _amount
            });

        airdropInfo[_recipient] = _airdropInfo;
        airdropRecipients.push(_recipient);

        token.transferFrom(msg.sender, address(this), _amount);

        emit AddedTokenAirdrop(_recipient);
    }

    function batchAddAirdrop(
        address[] _recipients,
        uint256 _startDate,
        uint256 _duration,
        uint256 _amount
    ) public onlyOwner {
        for (uint256 i = 0; i < _recipients.length; i++) {
            addAirdrop(_recipients[i], _startDate, _duration, _amount);
        }
    }

    /**
     * Claim the granted token back to the sender proportionately with the vested duration.
     */
    function claim() public onlyVestedRecipient {
        AirdropInfo storage info = airdropInfo[msg.sender];

        require(info.startDate < block.timestamp, "too early to claim");
        require(
            info.startDate.add(info.duration) > block.timestamp,
            "too late to claim"
        );

        uint256 _claimableAmount = claimableAmount(msg.sender);

        require(_claimableAmount <= 0, "already claimed all tokens");

        token.transfer(msg.sender, _claimableAmount);
        info.amount = 0;

        emit Claimed(msg.sender, _claimableAmount);
    }

    function claimExpiredAirdrop() public onlyOwner {
        uint256 claimAmount = 0;
        for (uint256 i = 0; i < airdropRecipients.length; i++) {
            address recipient = airdropRecipients[i];
            AirdropInfo info = airdropInfo[recipient];

            // already expired
            if (info.startDate.add(info.duration) < block.timestamp) {
                claimAmount += info.amount;
            }
        }

        token.transfer(msg.sender, claimAmount);
    }

    /**
     * @dev Calculate a number of seconds to be fully unlocked.
     * @param recipient a vesting recipient address.
     * @return number of seconds until fully unlocked. returns 0 if it's already fully unlocked.
     */
    function claimDurationLeft(address recipient)
        public
        view
        returns (uint256)
    {
        AirdropInfo memory info = airdropInfo[recipient];
        return info.startDate.add(info.duration).sub(block.timestamp);
    }

    /**
     * Returns claimable amount for given address
     * @param recipient A vesting recipient address
     * @return an amount of tokens that ready to be claimed
     */
    function claimableAmount(address recipient) public view returns (uint256) {
        return airdropInfo[recipient].amount;
    }
}
