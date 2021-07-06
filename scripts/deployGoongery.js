const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const {
  deployGoongery,
  deployGoongeryNFT,
  deployGoongeryRandomGenerator
} = require("./deployment")

deployGoongeryNFT()
  .then(verifyContract)
  .then(deployGoongery)
  .then(verifyContract)
  .then(deployGoongeryRandomGenerator)
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
