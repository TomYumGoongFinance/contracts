const { ethers } = require("hardhat")
const { privateKey } = require("../../secrets.json")

// BSC Testnet
// ==============================
const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"
const FACTORY_ADDRESS = "0x6725f303b657a9451d8ba641348b6761a6cc7a17"
const INIT_CODE_HASH =
  "0xd0d4c4cd0848c93cb4fd1f498d7013ee6bfb25783ea21593d5834f5d250ece66"

// used for adding pools
const BUSD = "0xf74c427ec673497b84fd6fd0800264fdaf6a2ff4"
const BNB = "0xae13d989dac2f0debff460ac112a837c89baa7cd"
const GOONG = "0x480Aa0d8475e138318a03f65387585e936a7D4Ec"

// todo add 10 more tokens

// All evm-compatible chains
// ===============================

// Addresses
const DEV_ADDRESS = "0x0eD129E9a39668ACF9B79A8E38652E11d05Aa447"
const BURN_ADDRESS = "0x0eD129E9a39668ACF9B79A8E38652E11d05Aa447" // same as dev address
const FEE_ADDRESS = "0x31039307f90E6c99c6081d2BDD1383CD3e1c33A7"
const DEV_1_ADDRESS = "0x22628B570B9Ff5E82e375037a158154e7900f79f"
const DEV_2_ADDRESS = "0x3C0C5Cec986F0Df6870dB8858ab8E8f2567d7508" // Edit later
const MARKETING_ADDRESS = "0x2C98DE30B50815652e2AA6d4B4e7d647ab9C81C0"
const ECOSYSTEM_ADDRESS = "0x06babDD13B6804DdBb47Bef9E3638Df69F5cE32b"
const TIMELOCK_ADDRESS = "0x353A40551e1629BcD88140042AD2bD5d9747e6EC"
const MASTERCHEF_ADDRESS = "0x4E5E015D3463b7c23E8638aa8aD7C5B8fd15479f"
const VESTING_ADDRESS = "0xe009D0e8B3c62fb8578b7fA62A19F9FBF100b8Ed"

const MASTERCHEF_START_DATE = parseInt(new Date().getTime() / 1000) + 60 // seconds, edit later
const MASTERCHEF_START_BLOCK = 0 // edit later
const MINIMUM_DURATION = 60 * 60 * 24 * 7
const GOONG_MINT_AMOUNT = ethers.utils.parseEther("30000000") // 30M
const EGG_PER_BLOCK = ethers.utils.parseEther("100")
const VOUCHER_RATE = 2

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

  const calls = [
    () => check(routerContract, "factory", []),
    () => check(factoryContract, "INIT_CODE_PAIR_HASH", []),
    () => check(timelockContract, "admin", [], ownerAddress),
    () => check(masterChefContract, "devaddr", [], DEV_ADDRESS),
    () => check(vestingContract, "owner", [], ownerAddress),
    () => check(busdContract, "symbol", [], "BUSD"),
    () => check(bnbContract, "symbol", [], "WBNB"),
    () => check(goongContract, "symbol", [], "GOONG")
  ]

  for (call of calls) {
    const response = await call()
    if (response.functionName === "INIT_CODE_PAIR_HASH") {
      if (INIT_CODE_HASH === response.returnValue) {
        console.log("config.INIT_CODE_PAIR_HASH pass")
      } else {
        throw new Error(`INIT_CODE_PAIR_HASH fail`)
      }
    } else if (response.functionName === "symbol") {
      if (response.result) {
        console.log(
          `config.${response.returnValue} at ${response.contract.address} pass`
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
  DEV_ADDRESS,
  FEE_ADDRESS,
  BURN_ADDRESS,
  DEV_1_ADDRESS,
  DEV_2_ADDRESS,
  MARKETING_ADDRESS,
  ECOSYSTEM_ADDRESS,
  MINIMUM_DURATION,
  TIMELOCK_ADDRESS,
  MASTERCHEF_ADDRESS,
  INIT_CODE_HASH,
  BUSD,
  BNB,
  GOONG,
  MASTERCHEF_START_BLOCK,
  MASTERCHEF_START_DATE,
  EGG_PER_BLOCK,
  GOONG_MINT_AMOUNT,
  VOUCHER_RATE
}
