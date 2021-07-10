// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/GoongeryOption.sol";

contract GoongeryNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private tokenIds;

    mapping(uint256 => uint8[3]) public googeryInfo;
    mapping(uint256 => uint256) public goongeryAmount;
    mapping(uint256 => uint256) public roundNumber;
    mapping(uint256 => bool) public claimInfo;
    mapping(uint256 => GoongeryOption.Buy) public buyOption;

    constructor() public ERC721("Goongery Ticket", "GGT") {}

    function create(
        address player,
        uint8[3] memory _lotteryNumbers,
        uint256 _amount,
        uint256 _roundNumber,
        GoongeryOption.Buy _buyOption
    ) public onlyOwner returns (uint256) {
        tokenIds.increment();

        uint256 itemId = tokenIds.current();
        _mint(player, itemId);
        goongeryAmount[itemId] = _amount;
        roundNumber[itemId] = _roundNumber;
        buyOption[itemId] = _buyOption;

        if (_buyOption == GoongeryOption.Buy.ExactThreeDigits) {
            googeryInfo[itemId] = _lotteryNumbers;
        } else if (_buyOption == GoongeryOption.Buy.PermutableThreeDigits) {
            googeryInfo[itemId] = _lotteryNumbers;
        } else if (_buyOption == GoongeryOption.Buy.LastTwoDigits) {
            googeryInfo[itemId] = _lotteryNumbers;
            googeryInfo[itemId][2] = ~uint8(0);
        }

        return itemId;
    }

    function getNumbers(uint256 tokenId)
        external
        view
        returns (uint8[3] memory)
    {
        return googeryInfo[tokenId];
    }

    function getAmount(uint256 tokenId) external view returns (uint256) {
        return goongeryAmount[tokenId];
    }

    function getRoundNumber(uint256 tokenId) external view returns (uint256) {
        return roundNumber[tokenId];
    }

    function getBuyOption(uint256 tokenId)
        public
        view
        returns (GoongeryOption.Buy)
    {
        return buyOption[tokenId];
    }

    function claimReward(uint256 tokenId) external onlyOwner {
        claimInfo[tokenId] = true;
    }

    function multiClaimReward(uint256[] memory _tokenIds) external onlyOwner {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            claimInfo[_tokenIds[i]] = true;
        }
    }

    function getClaimStatus(uint256 tokenId) external view returns (bool) {
        return claimInfo[tokenId];
    }
}
