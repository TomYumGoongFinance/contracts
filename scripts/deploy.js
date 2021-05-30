// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { feeAddress, devAddress } = require('../secrets.json')
const { verifyContract } = require('./libs/verify')

async function deployGoongToken() {
  const Goong = await hre.ethers.getContractFactory("GoongToken");
  const goong = await Goong.deploy();

  await goong.deployed();

  console.log("GoongToken deployed to:", goong.address);

  return {
    contractAddress: goong.address,
  }
}

async function deployMasterChef(goongToken) {
  const MasterChef = await hre.ethers.getContractFactory("MasterChefV2");
  const oneEggPerBlock = "1000000000000000000";
  const startBlock = 9262220;
  const constructorParams = [goongToken, devAddress, feeAddress, oneEggPerBlock, startBlock];
  const masterChef = await MasterChef.deploy(...constructorParams)

  await masterChef.deployed();

  console.log("MasterChefV2 deployed to:", masterChef.address);

  return {
    contractAddress: masterChef.address,
    params: constructorParams
  }
}

async function deployMulticall() {
  const Multicall = await hre.ethers.getContractFactory("Multicall");
  const multicall = await Multicall.deploy();

  await multicall.deployed();

  console.log("Multicall deployed to:", multicall.address);

  return {
    contractAddress: multicall.address,
  }
}

async function deployTimelock() {
  const Timelock = await hre.ethers.getContractFactory("Timelock");
  const constructorParams = [devAddress, 30]; // delay 6 hours
  const timelock = await Timelock.deploy(...constructorParams);

  await timelock.deployed();

  console.log("Timelock deployed to:", timelock.address);

  return {
    contractAddress: timelock.address,
    params: constructorParams
  }
}

/**
 * Deploy and verify:
 * 1. GoongToken
 * 2. MasterChef
 * 3. Multicall
 * 4. Timelock
 */
// deployGoongToken()
//   .then(verifyContract)
deployMasterChef("0xFD348C0Fe6E5b19f520F4E3bb99Fb142606BCe8B")
  .then(verifyContract)
  //   .then(deployMulticall)
  //   .then(verifyContract)
  .then(deployTimelock)
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
