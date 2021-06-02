require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
const { privateKey, apiKey } = require('./secrets.json')

module.exports = {
  networks: {
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [privateKey]
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 5000000000,
      accounts: [privateKey]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey
  },
  solidity: "0.6.12",
};

