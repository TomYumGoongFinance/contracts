const { ethers } = require("hardhat")
const { getLPAddress } = require("./address")
const { ROUTER_ADDRESS } = require("./config")
const chalk = require("chalk")
const { privateKey } = require("../../secrets.json")

async function addLiquidityETH(
  routerContract,
  { token, tokenAmount, senderAddress, ethAmount }
) {
  return routerContract
    .addLiquidityETH(
      token,
      tokenAmount,
      0,
      0,
      senderAddress,
      new Date().getTime() + 60 * 1e3,
      { value: ethAmount, gasLimit: 5000000 }
    )
    .then(({ wait }) => wait())
}

async function addLiquidity(
  routerContract,
  { tokenA, tokenB, tokenAmountA, tokenAmountB, senderAddress }
) {
  return routerContract
    .addLiquidity(
      tokenA,
      tokenB,
      tokenAmountA,
      tokenAmountB,
      0,
      0,
      senderAddress,
      new Date().getTime() + 60 * 1e3,
      { gasLimit: 5000000 }
    )
    .then(({ wait }) => wait())
}

async function getReserves(tokenA, tokenB) {
  const lpAddress = await getLPAddress(tokenA, tokenB)
  const PancakePair = await ethers.getContractFactory("PancakePair")
  const pair = PancakePair.attach(lpAddress)
  const token0 = await pair.token0()
  if (token0.toLowerCase() === tokenA.toLowerCase()) {
    return pair.getReserves()
  } else {
    const _reserves = await pair.getReserves()
    return [_reserves[1], _reserves[0]]
  }
}

async function approveLP(lps, spender) {
  const PancakePair = await ethers.getContractFactory("PancakePair")
  const ownerAddress = new ethers.Wallet(privateKey).address
  for (const lpAddress of lps) {
    const pair = PancakePair.attach(lpAddress)
    const allowance = await pair.allowance(ownerAddress, spender)
    if (allowance.lt(ethers.utils.parseEther("1000000"))) {
      await pair
        .approve(spender, ethers.constants.MaxUint256)
        .then((tx) => tx.wait())
      console.log(`Approved ${lpAddress} to ${chalk.greenBright(spender)}`)
    } else {
      console.log(`Skip approval ${lpAddress} to ${spender}`)
    }
  }
}

async function removeAllLiquidityETH(tokenA, tokenB, senderAddress) {
  const lpAddress = await getLPAddress(tokenA, tokenB)
  await approveLP([lpAddress], ROUTER_ADDRESS)
  const PancakePair = await ethers.getContractFactory("PancakePair")
  const pair = PancakePair.attach(lpAddress)
  const balance = await pair.balanceOf(senderAddress)
  if (balance.eq("0")) {
    throw new Error(`No liquidity for ${tokenA}/${tokenB}`)
  }
  const Router = await ethers.getContractFactory("PancakeRouter")
  const router = await Router.attach(ROUTER_ADDRESS)
  return router
    .removeLiquidityETH(
      tokenA,
      balance,
      0,
      0,
      senderAddress,
      new Date().getTime() + 60 * 1e3
    )
    .then(({ wait }) => wait())
}

module.exports = {
  addLiquidity,
  addLiquidityETH,
  getReserves,
  approveLP,
  removeAllLiquidityETH
}
