const hre= require("hardhat")
const {
  GOONG,
  GOONG_MINT_AMOUNT,
  MASTERCHEF_ADDRESS,
  MARKETING_ADDRESS,
  VESTING_ADDRESS
} = require("./libs/config")

async function mint(amount) {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.attach(GOONG)

  const transaction = await goong["mint(uint256)"](amount).then(({ wait }) =>
    wait()
  )

  console.log("Executed transaction:", transaction.transactionHash)
}

async function transferOwnership(newOwner) {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.attach(GOONG)

  const transaction = await goong
    .transferOwnership(newOwner)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

async function transfer(recipient, amount) {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.attach(GOONG)

  const transaction = await goong
    .transfer(recipient, amount)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

async function approve(spender) {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.attach(GOONG)

  const transaction = await goong
    .approve(spender, ethers.constants.MaxUint256)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

mint(GOONG_MINT_AMOUNT)
.then(() => transferOwnership(MASTERCHEF_ADDRESS))
.then(() => approve(VESTING_ADDRESS))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
