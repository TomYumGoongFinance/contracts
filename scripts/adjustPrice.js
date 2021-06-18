const { ethers } = require("hardhat")
const { privateKey } = require("../secrets.json")
const hre = require("hardhat")
const { getReserves, approveLP } = require("./libs/liquidity")
const {
  ROUTER_ADDRESS,
  GOONG,
  BNB,
  FAKE_GOONG,
  TARGET_PRICE
} = require("./libs/config")
const { swapExactTokensForETH, swapExactETHForTokens } = require("./libs/swap")
const { approve } = require("./libs/token")

// target price = goong / bnb
async function priceDownUntilTargetPrice(token, targetPrice) {
  const [reserveGoong, reserveBNB] = await getReserves(token, BNB)
  const currentK = reserveGoong.mul(reserveBNB)
  await approve([token], ROUTER_ADDRESS)

  const adjustedReserveGoong = sqrt(targetPrice.mul(currentK))
  const swapAmount = adjustedReserveGoong.sub(reserveGoong)
  const PancakeSwapRouter = await hre.ethers.getContractFactory("PancakeRouter")
  const router = await PancakeSwapRouter.attach(ROUTER_ADDRESS)
  const ownerAddress = new ethers.Wallet(privateKey).address

  const transaction = await swapExactTokensForETH(router, {
    token,
    tokenAmount: swapAmount,
    senderAddress: ownerAddress
  })

  console.log(transaction.transactionHash)
}

// target price = goong / bnb
async function priceUpUntilTargetPrice(token, targetPrice) {
  const [reserveGoong, reserveBNB] = await getReserves(token, BNB)
  const currentK = reserveGoong.mul(reserveBNB)
  const adjustedReserveGoong = sqrt(targetPrice.mul(currentK))
  const adjustedReserveBNB = currentK.div(adjustedReserveGoong)
  const swapAmount = adjustedReserveBNB.sub(reserveBNB)
  const PancakeSwapRouter = await hre.ethers.getContractFactory("PancakeRouter")
  const router = await PancakeSwapRouter.attach(ROUTER_ADDRESS)
  const ownerAddress = new ethers.Wallet(privateKey).address

  const transaction = await swapExactETHForTokens(router, {
    token,
    ethAmount: swapAmount,
    senderAddress: ownerAddress
  })

  console.log(transaction.transactionHash)
}

async function adjustPrice(token, targetPrice) {
  const [reserveGoong, reserveBNB] = await getReserves(token, BNB)
  const currentPrice = reserveGoong.div(reserveBNB)

  if (currentPrice.gt(targetPrice)) {
    console.log("Price should goes up", token)
    await priceUpUntilTargetPrice(token, targetPrice)
  } else {
    console.log("Price should goes down", token)
    await priceDownUntilTargetPrice(token, targetPrice)
  }
}

function sqrt(value) {
  const ONE = ethers.BigNumber.from(1)
  const TWO = ethers.BigNumber.from(2)
  x = ethers.BigNumber.from(value)
  let z = x.add(ONE).div(TWO)
  let y = x
  while (z.sub(y).isNegative()) {
    y = z
    z = x.div(z).add(z).div(TWO)
  }
  return y
}

const _targetPrice = ethers.BigNumber.from(TARGET_PRICE)

// adjustPrice(FAKE_GOONG, _targetPrice)
  adjustPrice(GOONG, _targetPrice)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
