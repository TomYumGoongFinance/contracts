const { mine, currentBlock, currentBlockTimestamp } = require("./rpc")
const { ethers } = require("hardhat")

async function createNewRound(goongery, _args = {}) {
  const timestamp = await currentBlockTimestamp()

  let allocation = _args.allocation || ["6000", "3000", "1000"]
  let goongPerTicket = _args.goongPerTicket || ethers.utils.parseEther("100")
  let burnPercentage = _args.burnPercentage || 1000
  let openingTimestamp = _args.openingTimestamp || timestamp + 200
  let closingTimestamp = _args.closingTimestamp || timestamp + 4000
  let maxNumber = _args.maxNumber || 9

  const args = {
    allocation,
    goongPerTicket,
    burnPercentage,
    maxNumber,
    openingTimestamp,
    closingTimestamp
  }

  await goongery
    .createNewRound(
      allocation,
      goongPerTicket,
      burnPercentage,
      maxNumber,
      openingTimestamp,
      closingTimestamp
    )
    .then((tx) => tx.wait())

  return args
}

async function enterBuyingPhase(openingTimestamp) {
  const timestamp = await currentBlockTimestamp()
  await mine(openingTimestamp - timestamp)
}

async function enterDrawingPhase(openingTimestamp, closingTimestamp) {
  await mine(closingTimestamp - openingTimestamp + 1)
}

async function drawWinningNumbers(goongery, args = {}) {
  await goongery.drawWinningNumbers().then((tx) => tx.wait())
  const [owner] = await ethers.getSigners()
  await goongery
    .setGoongeryRandomGenerator(owner.address)
    .then((tx) => tx.wait())
  const requestId = await goongery.requestId()
  const randomness = args.randomness || 10000
  const roundNumber = args.roundNumber || 1

  return goongery
    .drawWinningNumbersCallback(roundNumber, requestId, randomness)
    .then((tx) => tx.wait())
}

function calculateWinningNumbers(randomness, maxNumber) {
  let _winningNumbers = new Array(3)
  for (let i = 0; i < 3; i++) {
    const hash = ethers.utils.solidityKeccak256(
      ["uint256", "uint256"],
      [randomness, i]
    )
    const hashNumber = ethers.BigNumber.from(hash)
    _winningNumbers[i] = hashNumber.mod(maxNumber).toNumber()
  }
  return _winningNumbers
}

// function buy

module.exports = {
  createNewRound,
  enterBuyingPhase,
  enterDrawingPhase,
  drawWinningNumbers,
  calculateWinningNumbers
}
