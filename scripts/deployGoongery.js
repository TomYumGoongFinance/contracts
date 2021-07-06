const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const {
  deployGoongery,
  deployGoongeryNFT,
  deployGoongeryRandomGenerator
} = require("./deployment")
const { initialize } = require("./deployment/googery")
const {
  GOONGERY_ADDRESS,
  GOONGERY_RANDOM_GENERATOR,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_MAX_NUMBER
} = require("./libs/config")

// deployGoongery()
//   // .then(verifyContract)
//   // .then(deployGoongery)
//   .then(verifyContract)
//   .then(deployGoongeryRandomGenerator)
//   .then(verifyContract)
//   .then(() => process.exit(0))
//   .catch((e) => {
//     console.error(e)
//     process.exit(1)
//   })

initialize(
  GOONGERY_ADDRESS,
  GOONGERY_RANDOM_GENERATOR,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_MAX_NUMBER
)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
