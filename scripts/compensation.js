const hre = require("hardhat")
const { VESTING_CONTROLLER_ADDRESS } = require("./libs/config")
const compensations = require("./compensation.json")
const { ethers } = require("hardhat")

async function batchVest(recipients, startDate, duration, amounts) {
  const GoongVestingController = await ethers.getContractFactory(
    "GoongVestingController"
  )
  const controller = await GoongVestingController.attach(
    VESTING_CONTROLLER_ADDRESS
  )

  const transaction = await controller
    .batchAddTokenVestingMultiAmounts(
      recipients,
      startDate,
      duration,
      amounts,
      { gasLimit: 20000000 }
    )
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

// Excluding small amounts
const filteredCompensation = compensations.filter(
  (c) => parseInt(c.amount) > 1e18
)
const recipients = filteredCompensation.map((c) => c.recipient.toLowerCase())
const amounts = filteredCompensation.map((c) => c.amount)

// Thu Jun 24 2021 22:00:00 GMT+0700
const startDate = 1624546800
const duration = 24 * 60 * 60 * 7

batchVest(recipients, startDate, duration, amounts)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

// filter()
