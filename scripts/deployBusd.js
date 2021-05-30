// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { verifyContract } = require("./libs/verify")

async function deployBusd() {
  const BUSD = await hre.ethers.getContractFactory("BUSD");
  const busd = await BUSD.deploy();

  await busd.deployed();

  console.log("BUSD deployed to:", busd.address);

  return {
    contractAddress: busd.address,
  }
}

deployBusd()
  .then(verifyContract)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
