const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const {
  deployAirdropVesting,
  deployGoongIllusion,
  deployGoongToken,
  deployGoongVestingController,
  deployGoongeryRandomGenerator,
  deployMasterChef,
  deployTimelock,
  deployVesting
} = require("./deployment")
const { GOONGERY_ADDRESS } = require("./libs/config")

/**
 * Deploy and verify:
 * 1. GoongToken
 * 2. GoongVesting
 * 3. MasterChef
 * 4. Timelock
 */
// deployGoongToken()
//   .then(verifyContract)
//   .then(deployMasterChef)
//   .then(verifyContract)
//   .then(deployVesting)
//   .then(verifyContract)
//   .then(deployTimelock)
//   .then(verifyContract)
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error)
//     process.exit(1)
//   })
deployGoongeryRandomGenerator(GOONGERY_ADDRESS)
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
