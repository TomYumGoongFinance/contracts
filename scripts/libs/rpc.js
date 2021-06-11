const { ethers, network } = require("hardhat")

async function mine(blocks) {
  new Array(blocks).fill("0").forEach(async () => {
    await network.provider.send("evm_mine")
  })
}

function currentBlock() {
  return network.provider.send("eth_getBlockByNumber", ["latest", true])
}

function currentBlockNumber() {
  return currentBlock().then((block) => parseInt(block.number))
}

function currentBlockTimestamp() {
  return currentBlock().then((block) => parseInt(block.timestamp))
}

module.exports = {
  mine,
  currentBlock,
  currentBlockNumber,
  currentBlockTimestamp
}
