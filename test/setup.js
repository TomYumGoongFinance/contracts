const { ethers } = require("hardhat")
const { addLiquidity, addLiquidityETH } = require("./libs/router")
const { approveTokens, printBalance } = require("./libs/token")
const { printContractAddress } = require("./libs/utils")
const { log } = require("./libs/utils")


async function setupTests() {
  let [owner] = await ethers.getSigners()
  const WETH = await ethers.getContractFactory("WETH")
  const PancakeFactory = await ethers.getContractFactory("PancakeFactory")
  const PancakeRouterV2 = await ethers.getContractFactory("PancakeRouter")
  const BUSD = await ethers.getContractFactory("BUSD")
  const GOONG = await ethers.getContractFactory("GoongToken")

  const busd = await BUSD.deploy()
  const goong = await GOONG.deploy()
  const weth = await WETH.deploy()
  const pancakeFactory = await PancakeFactory.deploy(owner.address)

  await weth.deployed()
  await pancakeFactory.deployed()
  await busd.deployed()
  await goong.deployed()

  const pancakeRouter = await PancakeRouterV2.deploy(
    pancakeFactory.address,
    weth.address
  )
  await pancakeRouter.deployed()

  printContractAddress([
    { contract: weth, name: "WETH" },
    { contract: busd, name: "BUSD" },
    { contract: goong, name: "GOONG" },
    { contract: pancakeFactory, name: "PancakeFactory" },
    { contract: pancakeRouter, name: "PancakeRouter" }
  ])
  log("")

  // Mint goong
  await goong["mint(uint256)"](ethers.utils.parseEther("1000000"))

  // Approve goong and busd to pancake router.
  await approveTokens([goong, busd], pancakeRouter.address)
  log("")

  // Add ETH/BUSD, ETH/GOONG, and GOONG/BUSD
  await addLiquidityETH(pancakeRouter, {
    token: busd,
    tokenAmount: ethers.utils.parseEther("10000"),
    senderAddress: owner.address,
    ethAmount: ethers.utils.parseEther("10")
  })
  await addLiquidityETH(pancakeRouter, {
    token: goong,
    tokenAmount: ethers.utils.parseEther("10000"),
    senderAddress: owner.address,
    ethAmount: ethers.utils.parseEther("10")
  })
  await addLiquidity(pancakeRouter, {
    tokenA: goong,
    tokenB: busd,
    tokenAmountA: ethers.utils.parseEther("10000"),
    tokenAmountB: ethers.utils.parseEther("10000"),
    senderAddress: owner.address
  })

  log("")

  // Print goong and busd balance
  await printBalance([goong, busd], owner.address)

  global = {
    ...global,
    goong,
    busd,
    weth,
    pancakeRouter,
    pancakeFactory
  }
}

module.exports = {
  setupTests
}
