// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const {
  EGG_PER_BLOCK,
  BNB,
  BUSD,
  FEE_ADDRESS,
  DEV_ADDRESS
} = require("./libs/config")

async function deployGoongToken() {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.deploy()

  await goong.deployed()

  console.log("GoongToken deployed to:", goong.address)

  return {
    contractAddress: goong.address
  }
}

async function deployMasterChef(goongToken) {
  const MasterChef = await hre.ethers.getContractFactory("MasterChefV3")
  const currentBlock = await hre.network.provider
    .send("eth_blockNumber")
    .then(parseInt)
  const startBlock = currentBlock + 40 // 2 mins later
  const constructorParams = [
    goongToken,
    DEV_ADDRESS,
    FEE_ADDRESS,
    EGG_PER_BLOCK,
    startBlock,
    BNB,
    BUSD
  ]
  // const constructorParams = [
  //   goongToken,
  //   devAddress,
  //   feeAddress,
  //   EGG_PER_BLOCK,
  //   startBlock
  // ]
  const masterChef = await MasterChef.deploy(...constructorParams)

  await masterChef.deployed()

  console.log("MasterChefV2 deployed to:", masterChef.address)

  return {
    contractAddress: masterChef.address,
    params: constructorParams
  }
}

async function deployMulticall() {
  const Multicall = await hre.ethers.getContractFactory("Multicall")
  const multicall = await Multicall.deploy()

  await multicall.deployed()

  console.log("Multicall deployed to:", multicall.address)

  return {
    contractAddress: multicall.address
  }
}

async function deployGoongVesting(goongToken) {
  const GoongVesting = await hre.ethers.getContractFactory("GoongVesting")
  const goongVesting = await GoongVesting.deploy(goongToken)

  await goongVesting.deployed()

  console.log("GoongVesting deployed to:", goongVesting.address)

  return {
    contractAddress: goongVesting.address
  }
}

async function deployTimelock() {
  const Timelock = await hre.ethers.getContractFactory("Timelock")
  const constructorParams = [devAddress, 30] // delay 6 hours
  const timelock = await Timelock.deploy(...constructorParams)

  await timelock.deployed()

  console.log("Timelock deployed to:", timelock.address)

  return {
    contractAddress: timelock.address,
    params: constructorParams
  }
}

/**
 * Deploy and verify:
 * 1. GoongToken
 * 2. GoongVesting
 * 3. MasterChef
 * 4. Timelock
 */
deployGoongToken()
  .then(verifyContract)
  // .then(deployGoongVesting)
  // .then(verifyContract)
  // .then(deployMasterChef)
  // .then(verifyContract)
  // .then(deployTimelock)
  // .then(verifyContract)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
