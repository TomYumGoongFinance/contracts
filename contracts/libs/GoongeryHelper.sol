// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";

library GoongeryHelper {
    using SafeMath for uint256;

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
