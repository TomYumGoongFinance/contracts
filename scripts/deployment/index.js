const hre = require("hardhat")
const { ethers } = require("ethers")
const { privateKey } = require("../../secrets.json")
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
  GOONG
} = require("../libs/config")
const {
  LINK_VRF_COORDINATOR_ADDRESS,
  LINK,
  LINK_KEY_HASH,
  LINK_FEE
} = require("../libs/config")
const { green } = require("chalk")

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

async function deployVesting(goong) {
  const GoongVesting = await hre.ethers.getContractFactory("GoongVesting")
  const params = [goong, MINIMUM_DURATION]
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

async function deployGoongVestingController(goongAddress, vestingAddress) {
  const GoongVestingController = await hre.ethers.getContractFactory(
    "GoongVestingController"
  )
  const controller = await GoongVestingController.deploy(
    goongAddress,
    vestingAddress
  )

  await controller.deployed()

  console.log("GoongVestingController deployed to:", controller.address)

  return {
    contractAddress: controller.address,
    params: [goongAddress, vestingAddress]
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

async function deployGoongeryRandomGenerator(goongeryAddress) {
  const GoongeryRandomGenerator = await hre.ethers.getContractFactory(
    "GoongeryRandomGenerator"
  )
  const constructorParams = [
    LINK_VRF_COORDINATOR_ADDRESS,
    LINK,
    goongeryAddress,
    LINK_KEY_HASH,
    LINK_FEE
  ]
  const goongeryRandomGenerator = await GoongeryRandomGenerator.deploy(
    ...constructorParams
  )

  await goongeryRandomGenerator.deployed()

  console.log(
    "GoongeryRandomGenerator deployed to:",
    goongeryRandomGenerator.address
  )

  return {
    contractAddress: goongeryRandomGenerator.address,
    params: constructorParams
  }
}

async function deployLottery() {
  const Lottery = await hre.ethers.getContractFactory("Lottery")
  const lottery = await Lottery.deploy()

  await lottery.deployed()

  console.log("Deployed lottery:", lottery.address)

  return {
    contractAddress: lottery.address
  }
}

async function deployLotteryNFT() {
  const NFT = await hre.ethers.getContractFactory("LotteryNFT")
  const nft = await NFT.deploy()

  await nft.deployed()

  console.log("Deployed nft:", nft.address)

  return {
    contractAddress: nft.address
  }
}

async function deployGoongery() {
  const Goongery = await hre.ethers.getContractFactory("Goongery")
  const goongery = await Goongery.deploy()
  await goongery.deployed()

  console.log("Deployed Goongery:", goongery.address)

  return {
    contractAddress: goongery.address
  }
}

async function deployGoongeryNFT() {
  const GoongeryNFT = await hre.ethers.getContractFactory("GoongeryNFT")
  const nft = await GoongeryNFT.deploy()

  await nft.deployed()

  console.log("Deployed goongery nft:", nft.address)

  return {
    contractAddress: nft.address
  }
}

async function deployGoongeryHelper() {
  const GoongeryHelper = await hre.ethers.getContractFactory("GoongeryHelper")
  const helper = await GoongeryHelper.deploy()

  await helper.deployed()

  console.log("Deployed goongery helper:", helper.address)

  return {
    contractAddress: helper.address
  }
}

async function deployGoongeryInfoHolder(
  goongeryAddress,
  nftAddress,
  helperAddress
) {
  const GoongeryInfoHolder = await hre.ethers.getContractFactory(
    "GoongeryInfoHolder",
    {
      libraries: {
        GoongeryHelper: helperAddress
      }
    }
  )
  const constructorParams = [goongeryAddress, nftAddress]
  const infoHolder = await GoongeryInfoHolder.deploy(
    goongeryAddress,
    nftAddress
  )

  await infoHolder.deployed()

  console.log("Deployed goongery info holder:", infoHolder.address)

  return {
    contractAddress: infoHolder.address,
    params: constructorParams
  }
}

module.exports = {
  deployAirdropVesting,
  deployGoongIllusion,
  deployGoongToken,
  deployGoongVestingController,
  deployGoongeryRandomGenerator,
  deployGoongeryInfoHolder,
  deployGoongery,
  deployGoongeryNFT,
  deployGoongeryHelper,
  deployLottery,
  deployLotteryNFT,
  deployMasterChef,
  deployTimelock,
  deployVesting
}
