const hre = require("hardhat")
const { ethers } = require("ethers")
const { GOONG } = require("../libs/config")
const {} = require("../libs/config")

async function initialize(
  goongeryAddress,
  randomGeneratorAddress,
  nftAddress,
  maxNumber
) {
  const Goongery = await hre.ethers.getContractFactory("Goongery")
  const goongery = await Goongery.attach(goongeryAddress)

  const tx = await goongery.initialize(
    GOONG,
    randomGeneratorAddress,
    nftAddress,
    maxNumber
  )

  console.log("Transaction completed:", tx.transactionHash)
}

module.exports = {
  initialize
}
