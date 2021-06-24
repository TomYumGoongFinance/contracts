const hre = require("hardhat")
const {
  VESTING_ADDRESS,
  DEV_1_ADDRESS,
  DEV_2_ADDRESS,
  VESTING_START_DATE,
  ECOSYSTEM_ADDRESS,
  BURN_ADDRESS,
  VESTING_CONTROLLER_ADDRESS
} = require("./libs/config")
const compensations = require("./compensation.json")
const { ethers } = require("hardhat")

const SIX_MONTHS = 60 * 60 * 24 * 180

async function vest(recipient, startDate, duration, amount) {
  const GoongVesting = await ethers.getContractFactory("GoongVesting")
  const vesting = await GoongVesting.attach(VESTING_ADDRESS)

  const transaction = await vesting
    .addTokenVesting(recipient, startDate, duration, amount)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

async function batchVest(recipients, startDate, duration, amounts) {
  const GoongVestingController = await ethers.getContractFactory(
    "GoongVestingController"
  )
  const controller = await GoongVestingController.attach(
    VESTING_CONTROLLER_ADDRESS
  )

  const transaction = await controller
    .batchAddTokenVesting(recipients, startDate, duration, amounts)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

const dev1Amount = ethers.utils.parseEther("1000000")
const dev2Amount = ethers.utils.parseEther("1000000")
const ecosystemAmount = ethers.utils.parseEther("7990000")
const burnAmount = ethers.utils.parseEther("18000000")

// vest(DEV_1_ADDRESS, VESTING_START_DATE, SIX_MONTHS, dev1Amount)
//   .then(() => vest(DEV_2_ADDRESS, VESTING_START_DATE, SIX_MONTHS, dev2Amount))
//   .then(() =>
//     vest(ECOSYSTEM_ADDRESS, VESTING_START_DATE, SIX_MONTHS, ecosystemAmount)
//   )
//   .then(() => vest(BURN_ADDRESS, VESTING_START_DATE, SIX_MONTHS, burnAmount))
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error)
//     process.exit(1)
//   })

filter()
