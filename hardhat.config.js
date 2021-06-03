require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-spdx-license-identifier');
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
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12"
      }, {
        version: "0.5.16"
      }, {
        version: "0.5.0"
      }
    ]
  }
};

