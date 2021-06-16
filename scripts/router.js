const hre = require("hardhat")
const { getLPAddress } = require("./libs/address")
const {
  BUSD,
  BNB,
  GOONG,
  ROUTER_ADDRESS,
  FAKE_GOONG
} = require("./libs/config")
const { addLiquidity, addLiquidityETH } = require("./libs/liquidity.js")
const { approve } = require("./libs/token")

async function addEthLP(token, tokenAmount, ethAmount) {
  const Router = await hre.ethers.getContractFactory("PancakeRouter")
  const router = await Router.attach(ROUTER_ADDRESS)

  await approve([token], ROUTER_ADDRESS)

  const transaction = await addLiquidityETH(router, {
    token,
    tokenAmount,
    senderAddress: "0xB9d1d56B05b692F44bd60f8427AeF0f8ffDa5C15",
    ethAmount
  })

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

addEthLP(
  FAKE_GOONG,
  ethers.utils.parseEther("10000"),
  ethers.utils.parseEther("3")
)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
