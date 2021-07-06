const hre = require("hardhat")
const { initialize, transferNFTOwnership } = require("./deployment/goongery")
const {
  GOONGERY_ADDRESS,
  GOONGERY_RANDOM_GENERATOR,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_MAX_NUMBER
} = require("./libs/config")

initialize(
  GOONGERY_ADDRESS,
  GOONGERY_RANDOM_GENERATOR,
  GOONGERY_NFT_ADDRESS,
  GOONGERY_MAX_NUMBER
)
  .then(() => transferNFTOwnership(GOONGERY_ADDRESS, GOONGERY_NFT_ADDRESS))
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
