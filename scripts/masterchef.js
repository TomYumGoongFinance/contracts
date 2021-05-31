const hre = require("hardhat");
const { getLPAddress } = require('./libs/address')
const { BUSD, BNB, GOONG } = require("./libs/config")
const { masterchefAddress } = require('../secrets.json')

async function addPool(allocPoint, lpToken, depositFeeBP = 0, withUpdate = false) {
  const MasterChef = await hre.ethers.getContractFactory("MasterChefV2")
  const masterChef = await MasterChef.attach(masterchefAddress)

  const transaction = await masterChef.add(allocPoint, lpToken, depositFeeBP, withUpdate)
    .then(({ wait }) => wait())

  console.log('Executed transaction:', transaction.transactionHash);
}

const goongBusd = getLPAddress(GOONG, BUSD)
const bnbBusd = getLPAddress(BNB, BUSD)
const bnbGoong = getLPAddress(BNB, GOONG)

console.log("GOONG/BUSD", goongBusd)
console.log("BNB/BUSD", bnbBusd)
console.log("BNB/GOONG", bnbGoong)

addPool(300, bnbGoong)
  .then(() => addPool(200, goongBusd))
  .then(() => addPool(100, bnbBusd, 200))
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
