const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const { privateKey } = require("../secrets.json")
const {
  EGG_PER_BLOCK,
  BNB,
  BUSD,
  FEE_ADDRESS,
  DEV_ADDRESS,
  MINIMUM_DURATION,
  MASTERCHEF_START_BLOCK,
  getStartBlock,
  ROUTER_ADDRESS,
  GOONG,
  VESTING_ADDRESS
} = require("./libs/config")
const { green } = require("chalk")
const { ethers } = require("ethers")

let goongAddress

async function deployGoongToken() {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.deploy()

  await goong.deployed()

  goongAddress = goong.address

  console.log("GoongToken deployed to:", goongAddress)

  return {
    contractAddress: goong.address
  }
}

async function deployMasterChef(goongToken) {
  const MasterChef = await hre.ethers.getContractFactory("MasterChefV3")
  const startBlock = await getStartBlock(40)
  const constructorParams = [
    goongToken,
    DEV_ADDRESS,
    FEE_ADDRESS,
    EGG_PER_BLOCK,
    MASTERCHEF_START_BLOCK === 0 ? startBlock : MASTERCHEF_START_BLOCK,
    BNB,
    BUSD
  ]
  console.log(constructorParams)
  const masterChef = await MasterChef.deploy(...constructorParams)

  await masterChef.deployed()

  console.log("MasterChefV2 deployed to:", masterChef.address)

  return {
    contractAddress: masterChef.address,
    params: constructorParams
  }
}

async function deployVesting() {
  const GoongVesting = await hre.ethers.getContractFactory("GoongVesting")
  const params = [goongAddress, MINIMUM_DURATION]
  const vesting = await GoongVesting.deploy(...params)
  await vesting.deployed()

  return {
    contractAddress: vesting.address,
    params
  }
}

async function deployTimelock() {
  const ownerAddress = new ethers.Wallet(privateKey).address
  const Timelock = await hre.ethers.getContractFactory("Timelock")
  const constructorParams = [ownerAddress, 60 * 60 * 24] // delay 24 hours
  const timelock = await Timelock.deploy(...constructorParams)

  await timelock.deployed()

  console.log("Timelock deployed to:", timelock.address)

  return {
    contractAddress: timelock.address,
    params: constructorParams
  }
}

async function deployGoongIllusion() {
  const GoongIllusion = await hre.ethers.getContractFactory("GoongIllusion")
  const goongIllusion = await GoongIllusion.deploy(ROUTER_ADDRESS)

  await goongIllusion.deployed()

  console.log("GoongIllusion deployed to:", goongIllusion.address)

  return {
    contractAddress: goongIllusion.address,
    params: [ROUTER_ADDRESS]
  }
}

async function deployGoongVestingController() {
  const GoongVestingController = await hre.ethers.getContractFactory(
    "GoongVestingController"
  )
  const goongIllusion = await GoongVestingController.deploy(
    GOONG,
    VESTING_ADDRESS
  )

  await goongIllusion.deployed()

  console.log("GoongVestingController deployed to:", goongIllusion.address)

  return {
    contractAddress: goongIllusion.address,
    params: [GOONG, VESTING_ADDRESS]
  }
}

async function deployAirdropVesting() {
  const GoongAirdrop = await hre.ethers.getContractFactory("GoongAirdrop")
  const goongAirdrop = await GoongAirdrop.deploy(GOONG)

  await goongAirdrop.deployed()

  console.log("AirdropVesting deployed to:", goongAirdrop.address)

  return {
    contractAddress: goongAirdrop.address,
    params: [GOONG]
  }
}

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

deployGoongVestingController()
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
