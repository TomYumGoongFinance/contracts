const hre = require("hardhat")
const { ethers } = require("ethers")
const { GOONG } = require("../libs/config")
const {} = require("../libs/config")

async function initialize(
  goongeryAddress,
  randomGeneratorAddress,
  nftAddress,
  infoHolderAddress,
  goongeryFeeAddress
) {
  const Goongery = await hre.ethers.getContractFactory("Goongery")
  const goongery = await Goongery.attach(goongeryAddress)

  const tx = await goongery
    .initialize(
      GOONG,
      randomGeneratorAddress,
      nftAddress,
      infoHolderAddress,
      goongeryFeeAddress
    )
    .then((tx) => tx.wait())

  console.log("Transaction completed:", tx.transactionHash)
}

async function transferNFTOwnership(goongeryAddress, goongeryNFTAddress) {
  const NFT = await hre.ethers.getContractFactory("GoongeryNFT")
  const nft = await NFT.attach(goongeryNFTAddress)

  const tx = await nft
    .transferOwnership(goongeryAddress)
    .then((tx) => tx.wait())

  console.log("Transaction completed:", tx.transactionHash)
}

module.exports = {
  initialize,
  transferNFTOwnership
}
