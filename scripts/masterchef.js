const hre = require("hardhat")
const { getLPAddress } = require("./libs/address")
const {
  BUSD,
  BNB,
  GOONG,
  MASTERCHEF_ADDRESS,
  VOUCHER_RATE,
  TIMELOCK_ADDRESS
} = require("./libs/config")

async function addPool(
  allocPoint,
  lpToken,
  depositFeeBP = 0,
  withUpdate = false
) {
  const MasterChef = await hre.ethers.getContractFactory("MasterChefV3")
  const masterChef = await MasterChef.attach(MASTERCHEF_ADDRESS)

  const transaction = await masterChef
    .add(allocPoint, lpToken, depositFeeBP, withUpdate)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

async function setVoucherRate(rate = 10) {
  const MasterChef = await hre.ethers.getContractFactory("MasterChefV3")
  const masterChef = await MasterChef.attach(MASTERCHEF_ADDRESS)

  const transaction = await masterChef
    .setVoucherRate(rate)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

async function transferOwnership(newOwner) {
  const MasterChef = await hre.ethers.getContractFactory("MasterChefV3")
  const masterchef = await MasterChef.attach(MASTERCHEF_ADDRESS)

  const transaction = await masterchef
    .transferOwnership(newOwner)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

const goongBusd = getLPAddress(GOONG, BUSD)
const bnbBusd = getLPAddress(BNB, BUSD)
const bnbGoong = getLPAddress(BNB, GOONG)

console.log("GOONG/BUSD", goongBusd)
console.log("BNB/BUSD", bnbBusd)
console.log("BNB/GOONG", bnbGoong)

// Todo add remaining pools
addPool(4000, bnbGoong)
  .then(() => addPool(3000, goongBusd))
  .then(() => addPool(300, bnbBusd, 200))
  .then(() => setVoucherRate(VOUCHER_RATE))
  .then(() => transferOwnership(TIMELOCK_ADDRESS))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
