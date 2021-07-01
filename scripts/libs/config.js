const { ethers } = require("hardhat")
const { privateKey } = require("../../secrets.json")
require("dotenv").config()

// BSC Testnet
// ==============================
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS
const INIT_CODE_HASH = process.env.INIT_CODE_HASH

// BSC Mainnet
// ==============================
// const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E"
// const FACTORY_ADDRESS = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73"
// const INIT_CODE_HASH =
//   "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5"

// used for adding pools
// BSC Testnet
// ==============
const BUSD = process.env.BUSD
const BNB = process.env.BNB
const GOONG = process.env.GOONG
const FAKE_GOONG = process.env.FAKE_GOONG
const ETH_LP_AMOUNT = process.env.ETH_LP_AMOUNT
const TARGET_PRICE = process.env.TARGET_PRICE
const GOONG_ILLUSION_ADDRESS = process.env.GOONG_ILLUSION_ADDRESS

// BSC Mainnet
// const BUSD = "0xe9e7cea3dedca5984780bafc599bd69add087d56"
// const BNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"
// const GOONG = "0x2afAB709fEAC97e2263BEd78d94aC2951705dB50"
const USDT = "0x55d398326f99059ff775485246999027b3197955"
const DOT = "0x7083609fce4d1d8dc0c979aab8c869ea2c873402"
const CAKE = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82"
const UNI = "0xbf5140a22578168fd562dccf235e5d43a02ce9b1"
const ADA = "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47"
const DOGE = "0xba2ae424d960c26247dd6c32edc70b295c744c43"
const ALPHA = "0xa1faa113cbe53436df28ff0aee54275c13b40975"
const BAND = "0xad6caeb32cd2c308980a548bd0bc5aa4306c6c18"
const BTCB = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c"
const ETH = "0x2170ed0880ac9a755fd29b2688956bd959f933f8"
const LINK = process.env.LINK

// All evm-compatible chains
// ===============================

// Addresses
const DEV_ADDRESS = "0x0eD129E9a39668ACF9B79A8E38652E11d05Aa447"
const BURN_ADDRESS = "0x0eD129E9a39668ACF9B79A8E38652E11d05Aa447" // same as dev address
const FEE_ADDRESS = "0x31039307f90E6c99c6081d2BDD1383CD3e1c33A7"
const DEV_1_ADDRESS = "0x22628B570B9Ff5E82e375037a158154e7900f79f"
const DEV_2_ADDRESS = "0xd127a9f6e7D8D3A3B66e39A024ff102df0B8a65B"
const ECOSYSTEM_ADDRESS = "0x06babDD13B6804DdBb47Bef9E3638Df69F5cE32b"

// Contract addresses
const VESTING_ADDRESS = process.env.VESTING_ADDRESS
const VESTING_COMPENSATION_ADDRESS = process.env.VESTING_COMPENSATION_ADDRESS
const VESTING_CONTROLLER_ADDRESS = process.env.VESTING_CONTROLLER_ADDRESS
const TIMELOCK_ADDRESS = process.env.TIMELOCK_ADDRESS
const MASTERCHEF_ADDRESS = process.env.MASTERCHEF_ADDRESS
const LINK_VRF_COORDINATOR_ADDRESS = process.env.LINK_VRF_COORDINATOR_ADDRESS
const LINK_KEY_HASH = process.env.LINK_KEY_HASH
const LINK_FEE = process.env.LINK_FEE

// Masterchef Configs
const MASTERCHEF_START_BLOCK = 8349752 // BSC Mainnet, Wed Jun 16 2021 14:00:00 PM UTC
const GOONG_MINT_AMOUNT = ethers.utils.parseEther("30000000") // 30M
const EGG_PER_BLOCK = ethers.utils.parseEther("100")
const VOUCHER_RATE = 2

// Vesting Configs
const VESTING_START_DATE = parseInt(
  new Date("2021-06-16 14:00 UTC").getTime() / 1000 // Wed Jun 16 2021 14:00:00 PM UTC
)
const MINIMUM_DURATION = 60 * 60 * 24 * 7

async function configChecker() {
  const ownerAddress = new ethers.Wallet(privateKey).address
  const routerContract = await getContract("PancakeRouter", ROUTER_ADDRESS)
  const factoryContract = await getContract("PancakeFactory", FACTORY_ADDRESS)
  const timelockContract = await getContract("Timelock", TIMELOCK_ADDRESS)
  const masterChefContract = await getContract(
    "MasterChefV3",
    MASTERCHEF_ADDRESS
  )
  const vestingContract = await getContract("GoongVesting", VESTING_ADDRESS)
  const busdContract = await getContract("BEP20", BUSD)
  const bnbContract = await getContract("BEP20", BNB)
  const goongContract = await getContract("BEP20", GOONG)
  const usdtContract = await getContract("BEP20", USDT)
  const dotContract = await getContract("BEP20", DOT)
  const cakeContract = await getContract("BEP20", CAKE)
  const uniContract = await getContract("BEP20", UNI)
  const adaContract = await getContract("BEP20", ADA)
  const dogeContract = await getContract("BEP20", DOGE)
  const alphaContract = await getContract("BEP20", ALPHA)
  const bandContract = await getContract("BEP20", BAND)
  const btcbContract = await getContract("BEP20", BTCB)
  const ethContract = await getContract("BEP20", ETH)

  const calls = [
    () => check(routerContract, "factory", [], FACTORY_ADDRESS),
    () => check(factoryContract, "INIT_CODE_PAIR_HASH", []),
    () => check(busdContract, "symbol", [], "BUSD"),
    () => check(bnbContract, "symbol", [], "WBNB"),
    () => check(goongContract, "symbol", [], "GOONG"),
    () => check(usdtContract, "symbol", [], "USDT"),
    () => check(dotContract, "symbol", [], "DOT"),
    () => check(cakeContract, "symbol", [], "CAKE"),
    () => check(uniContract, "symbol", [], "UNI"),
    () => check(adaContract, "symbol", [], "ADA"),
    () => check(dogeContract, "symbol", [], "DOGE"),
    () => check(alphaContract, "symbol", [], "ALPHA"),
    () => check(bandContract, "symbol", [], "BAND"),
    () => check(btcbContract, "symbol", [], "BTCB"),
    () => check(ethContract, "symbol", [], "ETH"),
    () => check(timelockContract, "admin", [], ownerAddress),
    () => check(masterChefContract, "devaddr", [], DEV_ADDRESS),
    () => check(vestingContract, "owner", [], ownerAddress)
  ]

  for (call of calls) {
    const response = await call()
    if (response.functionName === "INIT_CODE_PAIR_HASH") {
      if (INIT_CODE_HASH === response.returnValue) {
        console.log("INIT_CODE_PAIR_HASH pass")
      } else {
        throw new Error(`INIT_CODE_PAIR_HASH fail`)
      }
    } else if (response.functionName === "symbol") {
      if (response.result) {
        console.log(
          `${response.returnValue} at ${response.contract.address} pass`
        )
      } else {
        throw new Error(`config address at ${response.contract.address} fail`)
      }
    } else if (!response.result) {
      throw new Error(`contract address ${response.contract.address} fail`)
    } else {
      console.log(`config address ${response.contract.address} pass`)
    }
  }
}

async function getStartBlock(nextBlocks) {
  return hre.network.provider
    .send("eth_blockNumber")
    .then(parseInt)
    .then((block) => block + nextBlocks)
}

async function getContract(name, address) {
  const contract = await ethers.getContractFactory(name)
  return contract.attach(address)
}

async function check(contract, functionName, params, expectReturnValue) {
  try {
    const returnValue = await contract[functionName](...params)
    if (
      expectReturnValue &&
      expectReturnValue.toLowerCase() !== returnValue.toLowerCase()
    ) {
      return {
        result: false,
        contract,
        functionName,
        params,
        returnValue
      }
    }
    return {
      result: true,
      contract,
      functionName,
      params,
      returnValue
    }
  } catch (e) {
    return {
      result: false,
      contract,
      functionName,
      params
    }
  }
}

module.exports = {
  configChecker,
  getStartBlock,
  ROUTER_ADDRESS,
  FACTORY_ADDRESS,
  VESTING_ADDRESS,
  VESTING_COMPENSATION_ADDRESS,
  VESTING_CONTROLLER_ADDRESS,
  GOONG_ILLUSION_ADDRESS,
  DEV_ADDRESS,
  FEE_ADDRESS,
  BURN_ADDRESS,
  DEV_1_ADDRESS,
  DEV_2_ADDRESS,
  ECOSYSTEM_ADDRESS,
  MINIMUM_DURATION,
  TIMELOCK_ADDRESS,
  MASTERCHEF_ADDRESS,
  LINK_VRF_COORDINATOR_ADDRESS,
  LINK_FEE,
  LINK_KEY_HASH,
  INIT_CODE_HASH,
  BUSD,
  BNB,
  GOONG,
  FAKE_GOONG,
  USDT,
  DOT,
  CAKE,
  UNI,
  ADA,
  DOGE,
  ALPHA,
  BAND,
  BTCB,
  ETH,
  LINK,
  MASTERCHEF_START_BLOCK,
  VESTING_START_DATE,
  EGG_PER_BLOCK,
  GOONG_MINT_AMOUNT,
  ETH_LP_AMOUNT,
  TARGET_PRICE,
  VOUCHER_RATE
}
