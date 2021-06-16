const { removeAllLiquidityETH } = require("./libs/liquidity")
const { privateKey } = require("../secrets.json")
const { GOONG, FAKE_GOONG, BNB } = require("./libs/config")

async function withdrawAll(tokenA, tokenB) {
  const ownerAddress = new ethers.Wallet(privateKey).address

  const transaction = await removeAllLiquidityETH(tokenA, tokenB, ownerAddress)

  console.log(transaction.transactionHash)
}

withdrawAll(FAKE_GOONG, BNB)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
