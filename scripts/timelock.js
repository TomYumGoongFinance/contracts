const hre = require("hardhat")
const fs = require("fs")

/**
 * Make sure the data below is correct before running
 */
const { TIMELOCK_ADDRESS, MASTERCHEF_ADDRESS, GOONG } = require("./libs/config")

async function queueTransaction(args) {
  const Timelock = await ethers.getContractFactory("Timelock")
  const timelock = await Timelock.attach(TIMELOCK_ADDRESS)
  console.log(TIMELOCK_ADDRESS)

  const transaction = await timelock
    .queueTransaction(...args)
    .then(({ wait }) => wait())

  saveToFile(transaction.txHash, args)

  console.log("Queue transaction:", transaction.transactionHash)
}

async function executeTransaction(args) {
  const Timelock = await ethers.getContractFactory("Timelock")
  const timelock = await Timelock.attach(TIMELOCK_ADDRESS)

  const transaction = await timelock
    .executeTransaction(...args)
    .then(({ wait }) => wait())

  console.log("Executed transaction:", transaction.transactionHash)
}

function addPool(allocPoint, lpToken, depositFeeBP, eta, withUpdate = false) {
  const types = ["uint256", "address", "uint16", "bool"]
  const data = bytes32Args(types, [
    allocPoint,
    lpToken,
    depositFeeBP,
    withUpdate
  ])
  return [
    MASTERCHEF_ADDRESS,
    0,
    `add(${types.join(",")})`,
    data,
    eta || calculateEta()
  ]
}

function updateEmissionRate(emissionRate) {
  const types = ["uint256"]
  const data = bytes32Args(types, [emissionRate])
  return [
    MASTERCHEF_ADDRESS,
    0,
    `updateEmissionRate(${types.join(",")})`,
    data,
    calculateEta()
  ]
}

function calculateEta() {
  return Math.floor((new Date().getTime() + 60000) / 1000)
}

function bytes32Args(types, values) {
  return ethers.utils.defaultAbiCoder.encode(types, values)
}

function saveToFile(txHash, args) {
  let queueTxs = []
  const path = "scripts/output/queueTransactions.json"
  const createdAt =
    new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()
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

// const args = updateEmissionRate("20000000000000000000").slice(0, 4)

// queueTransaction(updateEmissionRate("20000000000000000000"))
queueTransaction(addPool("2000", GOONG, 0))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
