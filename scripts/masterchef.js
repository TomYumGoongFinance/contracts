const hre = require("hardhat")
const { getLPAddress } = require("./libs/address")
const {
  BUSD,
  BNB,
  GOONG,
  MASTERCHEF_ADDRESS,
  VOUCHER_RATE,
  TIMELOCK_ADDRESS,
  DOP,
  ADA,
  CAKE,
  DOGE,
  ALPHA,
  BAND,
  BTCB,
  ETH,
  USDT,
  UNI
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

const bnbGoong = getLPAddress(BNB, GOONG)
const cakeBnb = getLPAddress(BNB, CAKE)
const uniBNB = getLPAddress(BNB, UNI)
const adaBNB = getLPAddress(BNB, ADA)
const dogeBNB = getLPAddress(BNB, DOGE)
const alphaBNB = getLPAddress(BNB, ALPHA)
const bandBNB = getLPAddress(BNB, BAND)
const ethBNB = getLPAddress(BNB, ETH)

const bnbBusd = getLPAddress(BNB, BUSD)
const btcBUSD = getLPAddress(BUSD, BTCB)
const usdtBusd = getLPAddress(BUSD, USDT)

console.log("GOONG/BUSD", goongBusd)
console.log("BNB/BUSD", bnbBusd)
console.log("BNB/GOONG", bnbGoong)
console.log("BNB/CAKE", cakeBnb)
console.log("BNB/UNI", uniBNB)
console.log("BNB/ADA", adaBNB)
console.log("BNB/DOGE", dogeBNB)
console.log("BNB/ALPHA", alphaBNB)
console.log("BNB/BAND", bandBNB)
console.log("BNB/ETH", ethBNB)
console.log("BUSD/BTC", btcBUSD)
console.log("BUSD/USDT", usdtBusd)

addPool(4000, bnbGoong)
  .then(() => addPool(3000, goongBusd))
  .then(() => addPool(500, dogeBNB, 100))
  .then(() => addPool(500, alphaBNB, 100))
  .then(() => addPool(500, bandBNB, 100))
  .then(() => addPool(500, adaBNB, 100))
  .then(() => addPool(300, uniBNB, 150))
  .then(() => addPool(300, cakeBnb, 150))
  .then(() => addPool(300, ethBNB, 150))
  .then(() => addPool(200, bnbBusd, 200))
  .then(() => addPool(200, btcBUSD, 200))
  .then(() => addPool(100, usdtBusd, 400))
  .then(() => setVoucherRate(VOUCHER_RATE))
  .then(() => transferOwnership(TIMELOCK_ADDRESS))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
