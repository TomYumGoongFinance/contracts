pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./GoongeryNFT.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./libs/BEP20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Goongery is Ownable {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeERC20 for IERC20;

    // Goong address
    BEP20 public goong;
    // NFT represent googery ticket.
    GoongeryNFT public nft;
    // Allocation for each prize in the pool
    uint8[3] public allocation;
    // Minimum goong per ticket
    uint256 public minPrice;
    // Maximum number for each digit
    uint8 public maxNumber;

    constructor(
        address _goong,
        address _nft,
        uint256 _minPrice,
        uint8 _maxNumber,
        uint8[3] memory _allocation
    ) public {
        goong = BEP20(_goong);
        nft = GoongeryNFT(_nft);
        allocation = _allocation;
        maxNumber = _maxNumber;
        minPrice = _minPrice;
    }
}
