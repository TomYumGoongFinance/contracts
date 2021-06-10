const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const { GOONG, MINIMUM_DURATION } = require("./libs/config")
const { ethers } = require("hardhat")

async function deployVesting(goong) {
  const GoongVesting = await ethers.getContractFactory("GoongVesting")
  const params = [goong, MINIMUM_DURATION]
  const vesting = await GoongVesting.deploy(...params)
  await vesting.deployed()

  return {
    contractAddress: vesting.address,
    params
  }
}

deployVesting(GOONG)
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
