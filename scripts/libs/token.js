const { ethers } = require("hardhat")
const { privateKey } = require("../../secrets.json")
const chalk = require("chalk")

async function approve(tokens, spender) {
  const ownerAddress = new ethers.Wallet(privateKey).address
  for (const _token of tokens) {
    const Token = await ethers.getContractFactory("BEP20")
    const token = await Token.attach(_token)
    const allowance = await token.allowance(ownerAddress, spender)
    if (allowance.lt(ethers.utils.parseEther("1000000000"))) {
      await token
        .approve(spender, ethers.constants.MaxUint256)
        .then((tx) => tx.wait())
      console.log(`Approved ${_token} to ${chalk.greenBright(spender)}`)
    } else {
      console.log(`Skip approval ${_token} to ${spender}`)
    }
  }
}

module.exports = {
  approve
}
