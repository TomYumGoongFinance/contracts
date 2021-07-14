const hre = require("hardhat")
const { initialize, transferNFTOwnership } = require("./deployment/goongery")
const {
  GOONGERY_ADDRESS,
  GOONGERY_RANDOM_GENERATOR,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_INFO_HOLDER_ADDRESS,
  GOONGERY_FEE_ADDRESS,
} = require("./libs/config")

initialize(
  GOONGERY_ADDRESS,
  GOONGERY_RANDOM_GENERATOR,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_INFO_HOLDER_ADDRESS,
  GOONGERY_FEE_ADDRESS
)
  .then(() => transferNFTOwnership(GOONGERY_ADDRESS, GOONGERY_NFT_ADDRESS))
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
