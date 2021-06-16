const hre = require("hardhat")
const { verifyContract } = require("./libs/verify")
const chalk = require("chalk")
const {
  GOONG_ILLUSION_ADDRESS,
  GOONG,
  FAKE_GOONG,
  ETH_LP_AMOUNT
} = require("./libs/config")
const { privateKey } = require("../secrets.json")
const { ethers } = require("hardhat")

let goongAddresses = []

async function deployGoongToken() {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.deploy()

  await goong.deployed()

  goongAddresses.push(goong.address)

  console.log("GoongToken deployed to:", goong.address)

  return {
    contractAddress: goong.address
  }
}

async function approveGoongs(goongs, spender) {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const ownerAddress = new ethers.Wallet(privateKey).address
  for (const goongAddress of goongs) {
    const contract = await Goong.attach(goongAddress)
    const allowance = await contract.allowance(ownerAddress, spender)
    if (allowance.lt(ethers.utils.parseEther("10000"))) {
      await contract
        .approve(spender, ethers.constants.MaxUint256)
        .then((tx) => tx.wait())
      console.log(`Approved ${goongAddress} to ${chalk.greenBright(spender)}`)
    } else {
      console.log(`Skip approval ${goongAddress} to ${spender}`)
    }
  }
}

async function tripleLiquidity(fakeGoong2, ethValue) {
  await mint(fakeGoong2, ethers.utils.parseEther("10000"))

  const GoongIllusion = await ethers.getContractFactory("GoongIllusion")
  const goongIllusion = GoongIllusion.attach(GOONG_ILLUSION_ADDRESS)

  await approveGoongs([GOONG, FAKE_GOONG, fakeGoong2], GOONG_ILLUSION_ADDRESS)

  const transaction = await goongIllusion
    .tripleLiquidity(GOONG, FAKE_GOONG, fakeGoong2, {
      gasLimit: 15000000,
      value: ethValue
    })
    .then((tx) => tx.wait())

  console.log("triple liquidity:", transaction.transactionHash)
}

async function mint(address, amount) {
  const Goong = await hre.ethers.getContractFactory("GoongToken")
  const goong = await Goong.attach(address)

  const transaction = await goong["mint(uint256)"](amount).then(({ wait }) =>
    wait()
  )

  console.log("Executed transaction:", transaction.transactionHash)
}

deployGoongToken()
  .then(verifyContract)
  .then((fakeGoong2) => tripleLiquidity(fakeGoong2, ETH_LP_AMOUNT))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
