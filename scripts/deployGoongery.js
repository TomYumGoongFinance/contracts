const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const {
  deployGoongery,
  deployGoongeryNFT,
  deployGoongeryHelper,
  deployGoongeryRandomGenerator,
  deployGoongeryInfoHolder
} = require("./deployment")
const {
  GOONGERY_ADDRESS,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_HELPER_ADDRESS
} = require("./libs/config")

// deployGoongery()
//   .then(verifyContract)
//   .then(deployGoongeryRandomGenerator)
//   .then(verifyContract)
//   .then(deployGoongeryNFT)
//   .then(verifyContract)
//   .then(deployGoongeryHelper)
//   .then(verifyContract)
//   .then(() => process.exit(0))
//   .catch((e) => {
//     console.error(e)
//     process.exit(1)
//   })

deployGoongeryInfoHolder(
  GOONGERY_ADDRESS,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_HELPER_ADDRESS
)
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
