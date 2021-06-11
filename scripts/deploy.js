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
  getStartBlock
} = require("./libs/config")

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

// async function deployMulticall() {
//   const Multicall = await hre.ethers.getContractFactory("Multicall")
//   const multicall = await Multicall.deploy()

//   await multicall.deployed()

//   console.log("Multicall deployed to:", multicall.address)

//   return {
//     contractAddress: multicall.address
//   }
// }

async function deployVesting() {
  const GoongVesting = await ethers.getContractFactory("GoongVesting")
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
  const constructorParams = [ownerAddress, 30] // delay 6 hours
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
  .then(deployMasterChef)
  .then(verifyContract)
  .then(deployVesting)
  .then(verifyContract)
  .then(deployTimelock)
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
