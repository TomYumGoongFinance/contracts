// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";
import "./GoongeryNFT.sol";
import "./libs/GoongeryOption.sol";
import "./libs/BEP20.sol";

contract Goongery is Ownable {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeERC20 for IERC20;

    // Goong address
    IERC20 public goong;
    // NFT represent googery ticket.
    GoongeryNFT public nft;
    // Allocation for each prize in the pool
    uint8[3] public allocation;
    // Minimum goong per ticket
    uint256 public minPrice;
    // Maximum number for each digit
    uint8 public maxNumber;
    // Round number
    uint256 public roundNumber = 0;
    // roundNumber => [tokenId]
    mapping(uint256 => uint256[]) public goongeryInfo;
    // address => [tokenId]
    mapping(address => uint256[]) public userInfo;
    // issueId => buyOption => googeryNumbersId => buyAmountSum
    mapping(uint256 => mapping(GoongeryOption.Buy => mapping(uint64 => uint256)))
        public userBuyAmountSum;
    uint256 public totalAmount = 0;
    uint256 public totalAddresses = 0;
    uint256 public lastTimestamp;

    enum BuyOption {
        ExactThreeDigits,
        PermutableThreeDigits,
        LastTwoDigits
    }

    event Buy(address indexed user, uint256 tokenId);

    constructor(
        address _goong,
        address _nft,
        uint256 _minPrice,
        uint8 _maxNumber,
        uint8[3] memory _allocation
    ) public {
        goong = IERC20(_goong);
        nft = GoongeryNFT(_nft);
        allocation = _allocation;
        maxNumber = _maxNumber;
        minPrice = _minPrice;
    }

    /**
     * @dev Supported 3 types of ticket:
     * 1. last two digits numbers
     * 2. three digits with permutable option
     * 3. exact three digits
     * If buyOption is `LastTwoNumbers`, Only _numbers[0] and _numbers[1] will be used (ignore _numbers[2]).
     */
    function buy(
        uint256 _price,
        uint8[3] memory _numbers,
        GoongeryOption.Buy _buyOption
    ) public {
        require(_price >= minPrice, "price must above minPrice");
        for (uint8 i = 0; i < 3; i++) {
            require(_numbers[i] <= maxNumber, "exceed max number allowed");
        }

        uint256 tokenId = nft.create(
            msg.sender,
            _numbers,
            _price,
            roundNumber,
            _buyOption
        );

        goongeryInfo[roundNumber].push(tokenId);
        userInfo[msg.sender].push(tokenId);
        totalAmount = totalAmount.add(_price);
        lastTimestamp = block.timestamp;

        addUserBuyAmountSum(_numbers, _price, _buyOption);
        goong.safeTransferFrom(msg.sender, address(this), _price);

        emit Buy(msg.sender, tokenId);
    }

    function addUserBuyAmountSum(
        uint8[3] memory _numbers,
        uint256 _price,
        GoongeryOption.Buy _buyOption
    ) internal {
        // Create a copy of _numbers;
        uint8[3] memory numbersForNumberId = [
            _numbers[0],
            _numbers[1],
            _numbers[2]
        ];

        if (_buyOption == GoongeryOption.Buy.PermutableThreeDigits) {
            numbersForNumberId = getLeastPermutableNumber(numbersForNumberId);
        } else if (_buyOption == GoongeryOption.Buy.LastTwoDigits) {
            numbersForNumberId[2] = ~uint8(0);
        }

        uint64 numberId = calculateGoongeryNumberId(numbersForNumberId);
        userBuyAmountSum[roundNumber][_buyOption][numberId] = userBuyAmountSum[
            roundNumber
        ][_buyOption][numberId]
        .add(_price);
    }

    function calculateGoongeryNumberId(uint8[3] memory _numbers)
        public
        pure
        returns (uint64)
    {
        return _numbers[0] * 256**2 + _numbers[1] * 256 + _numbers[2];
    }

    function getLeastPermutableNumber(uint8[3] memory _numbers)
        public
        pure
        returns (uint8[3] memory)
    {
        uint8[3] memory leastPossibleNumber = [
            _numbers[0],
            _numbers[1],
            _numbers[2]
        ];

        if (leastPossibleNumber[0] > leastPossibleNumber[2]) {
            leastPossibleNumber = swap(leastPossibleNumber, 0, 2);
        }

        if (leastPossibleNumber[0] > leastPossibleNumber[1]) {
            leastPossibleNumber = swap(leastPossibleNumber, 0, 1);
        }

        if (leastPossibleNumber[1] > leastPossibleNumber[2]) {
            leastPossibleNumber = swap(leastPossibleNumber, 1, 2);
        }

        return leastPossibleNumber;
    }

    function swap(
        uint8[3] memory _numbers,
        uint8 index1,
        uint8 index2
    ) private pure returns (uint8[3] memory) {
        uint8 temp = _numbers[index1];
        _numbers[index1] = _numbers[index2];
        _numbers[index2] = temp;

        return _numbers;
    }
}
