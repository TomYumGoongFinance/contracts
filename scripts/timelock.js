const hre = require("hardhat");
const fs = require('fs')

/**
 * Make sure the data below is correct before running
 */
const { timelockAddress, masterchefAddress } = require('../secrets.json')
async function queueTransaction(args) {
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.attach(timelockAddress)

  const transaction = await timelock.queueTransaction(...args)
    .then(({ wait }) => wait())

  saveToFile(transaction.txHash, args)

  console.log('Queue transaction:', transaction.transactionHash);
}

async function executeTransaction(args) {
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.attach(timelockAddress)

  const transaction = await timelock.executeTransaction(...args)
    .then(({ wait }) => wait())

  console.log('Executed transaction:', transaction.transactionHash);
}

function addPool(allocPoint, lpToken, depositFeeBP, eta, withUpdate = false) {
  const types = [
    "uint256",
    "address",
    "uint16",
    "bool"
  ]
  const data = bytes32Args(types, [allocPoint, lpToken, depositFeeBP, withUpdate])
  return [
    masterchefAddress,
    0,
    `add(${types.join(',')})`,
    data,
    eta || calculateEta()
  ]
}

function calculateEta() {
  return Math.floor((new Date().getTime() + 21660000) / 1000)
}

function bytes32Args(types, values) {
  return ethers.utils.defaultAbiCoder.encode(types, values)
}

function saveToFile(txHash, args) {
  let queueTxs = []
  const path = 'scripts/output/queueTransactions.json'
  const createdAt = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
  const transaction = { txHash, args, createdAt }
  try {
    const _queueTxs = fs.readFileSync(path)
    queueTxs = JSON.parse(_queueTxs)
    queueTxs.push(transaction)
  } catch (e) {
    queueTxs = [transaction]
  }
  fs.writeFileSync(path, JSON.stringify(queueTxs, null, 2))
}

queueTransaction(addPool(150, "0x300f32e568420eb9072c1816188a76a2b2fc7fbf", 100))
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
