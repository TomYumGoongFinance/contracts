const { ethers } = require("hardhat")
const { privateKey } = require("../../secrets.json")
// BSC Testnet
const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"
const FACTORY_ADDRESS = "0x6725f303b657a9451d8ba641348b6761a6cc7a17"
const INIT_CODE_HASH =
  "0xd0d4c4cd0848c93cb4fd1f498d7013ee6bfb25783ea21593d5834f5d250ece66"

// used for adding pools
const BUSD = "0xf74c427ec673497b84fd6fd0800264fdaf6a2ff4"
const BNB = "0xae13d989dac2f0debff460ac112a837c89baa7cd"
const GOONG = "0x14D3E60a9c963D325BAb04D76fb81BeB41C70751"

const MINIMUM_DURATION = 60 * 60 * 24 * 7
const DEV_ADDRESS = "0x0eD129E9a39668ACF9B79A8E38652E11d05Aa447"
const FEE_ADDRESS = "0x31039307f90E6c99c6081d2BDD1383CD3e1c33A7"
const TIMELOCK_ADDRESS = "0xf1DfA9C0d039Dfb8bdA24974F402dA5263Cb92F3"
const MASTERCHEF_ADDRESS = "0x33782F6AB27c9EB51093D07153c91B3Aeddb37ef"
const VESTING_ADDRESS = "0x7c5461E150444307155Fa6CF0Ff66126e4C7c5b6"

// const ONE_EGG = "1000000000000000000";
const EGG_PER_BLOCK = "5000000000000000000"

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
    () => check(masterChefContract, "devaddr", [], ownerAddress),
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

async function getContract(name, address) {
  const contract = await ethers.getContractFactory(name)
  return contract.attach(address)
}

async function check(contract, functionName, params, expectReturnValue) {
  try {
    const returnValue = await contract[functionName](...params)
    if (expectReturnValue && expectReturnValue.toLowerCase() !== returnValue.toLowerCase()) {
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
  ROUTER_ADDRESS,
  FACTORY_ADDRESS,
  DEV_ADDRESS,
  FEE_ADDRESS,
  MINIMUM_DURATION,
  TIMELOCK_ADDRESS,
  MASTERCHEF_ADDRESS,
  INIT_CODE_HASH,
  BUSD,
  BNB,
  GOONG,
  EGG_PER_BLOCK
}
