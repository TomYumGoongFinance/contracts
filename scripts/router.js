const hre = require("hardhat")
const { getLPAddress } = require("./libs/address")
const { BUSD, BNB, GOONG, ROUTER_ADDRESS } = require("./libs/config")
const { addLiquidity, addLiquidityETH } = require("./libs/liquidity.js")

async function addEthLP(token, tokenAmount, ethAmount) {
  const Router = await hre.ethers.getContractFactory("PancakeRouter")
  const router = await Router.attach(ROUTER_ADDRESS)

  const transaction = await addLiquidityETH(router, {
    token,
    tokenAmount,
    senderAddress: "0xB9d1d56B05b692F44bd60f8427AeF0f8ffDa5C15",
    ethAmount
  })

  console.log("Executed transaction:", transaction.transactionHash)
}

async function approveToken(tokenAddress) {
  console.log(ROUTER_ADDRESS)
  const Token = await hre.ethers.getContractFactory("BEP20")
  const token = await Token.attach(tokenAddress)

  const transaction = await token
    .approve(ROUTER_ADDRESS, ethers.constants.MaxUint256)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

async function addLP(tokenA, tokenB, tokenAmountA, tokenAmountB) {
  const Router = await hre.ethers.getContractFactory("PancakeRouter")
  const router = await Router.attach(ROUTER_ADDRESS)

  const transaction = await addLiquidity(router, {
    tokenA,
    tokenB,
    tokenAmountA,
    tokenAmountB,
    senderAddress: "0xB9d1d56B05b692F44bd60f8427AeF0f8ffDa5C15"
  })

  console.log("Executed transaction:", transaction.transactionHash)
}

approveToken(GOONG)
  .then(() =>
    addEthLP(
      GOONG,
      ethers.utils.parseEther("20000"),
      ethers.utils.parseEther("0.5")
    )
  )
  .then(() =>
    addLP(
      GOONG,
      BUSD,
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000")
    )
  )
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
