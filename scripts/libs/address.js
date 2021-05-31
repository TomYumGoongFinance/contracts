const { pack, keccak256 } = require("@ethersproject/solidity")
const { getCreate2Address } = require("@ethersproject/address")

const { FACTORY_ADDRESS, INIT_CODE_HASH } = require("./config")

function getLPAddress(tokenA, tokenB) {
  const tokens = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]

  return getCreate2Address(
    FACTORY_ADDRESS,
    keccak256(['bytes'], [pack(['address', 'address'], [tokens[0], tokens[1]])]),
    INIT_CODE_HASH
  ).toLowerCase()
}

module.exports = {
  getLPAddress
}
