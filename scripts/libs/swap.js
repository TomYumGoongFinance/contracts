const { BNB } = require("./config")

async function swapExactTokensForETH(
  routerContract,
  { token, tokenAmount, senderAddress }
) {
  return routerContract
    .swapExactTokensForETH(
      tokenAmount,
      0,
      [token, BNB],
      senderAddress,
      new Date().getTime() + 60 * 1e3,
      { gasLimit: 5000000 }
    )
    .then(({ wait }) => wait())
}

async function swapExactETHForTokens(
  routerContract,
  { token, ethAmount, senderAddress }
) {
  return routerContract
    .swapExactETHForTokens(
      0,
      [BNB, token],
      senderAddress,
      new Date().getTime() + 60 * 1e3,
      { value: ethAmount, gasLimit: 5000000 }
    )
    .then(({ wait }) => wait())
}

module.exports = {
  swapExactTokensForETH,
  swapExactETHForTokens
}
