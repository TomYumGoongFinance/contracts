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

module.exports = {
  addLiquidity,
  addLiquidityETH
}
