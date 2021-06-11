const hre = require("hardhat")
const {
  GOONG,
  VESTING_ADDRESS,
  DEV_1_ADDRESS,
  MASTERCHEF_START_DATE,
  ECOSYSTEM_ADDRESS,
  BURN_ADDRESS
} = require("./libs/config")
const { ethers } = require("hardhat")
const { currentBlockTimestamp } = require("./libs/rpc")

const SIX_MONTHS = 60 * 60 * 24 * 180

async function vest(recipient, startDate, duration, amount) {
  const GoongVesting = await ethers.getContractFactory("GoongVesting")
  const vesting = await GoongVesting.attach(VESTING_ADDRESS)

  const transaction = await vesting
    .addTokenVesting(recipient, startDate, duration, amount)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

const dev1Amount = ethers.utils.parseEther("1000000")
const dev2Amount = ethers.utils.parseEther("1000000")
const ecosystemAmount = ethers.utils.parseEther("7990000")
const burnAmount = ethers.utils.parseEther("18000000")

vest(DEV_1_ADDRESS, MASTERCHEF_START_DATE, SIX_MONTHS, dev1Amount)
  .then(() =>
    vest(DEV_2_ADDRESS, MASTERCHEF_START_DATE, SIX_MONTHS, dev2Amount)
  )
  .then(() =>
    vest(ECOSYSTEM_ADDRESS, MASTERCHEF_START_DATE, SIX_MONTHS, ecosystemAmount)
  )
  .then(() => vest(BURN_ADDRESS, MASTERCHEF_START_DATE, SIX_MONTHS, burnAmount))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
