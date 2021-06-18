const hre = require("hardhat")
const { getLPAddress } = require("./libs/address")
const { privateKey } = require("../secrets.json")
const {
  BUSD,
  BNB,
  GOONG,
  ROUTER_ADDRESS,
  FAKE_GOONG,
  ETH_LP_AMOUNT
} = require("./libs/config")
const { addLiquidity, addLiquidityETH } = require("./libs/liquidity.js")
const { approve } = require("./libs/token")

async function addEthLP(token, tokenAmount, ethAmount) {
  const ownerAddress = new ethers.Wallet(privateKey).address
  const Router = await hre.ethers.getContractFactory("PancakeRouter")
  const router = await Router.attach(ROUTER_ADDRESS)

  await approve([token], ROUTER_ADDRESS)

  const transaction = await addLiquidityETH(router, {
    token,
    tokenAmount,
    senderAddress: ownerAddress,
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
    senderAddress: ownerAddress
  })

  console.log("Executed transaction:", transaction.transactionHash)
}

addEthLP(
  GOONG,
  ethers.utils.parseEther("10000"),
  ethers.utils.parseEther("3")
)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
