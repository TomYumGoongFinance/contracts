// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function verifyContract({
  contractAddress,
  params = []
}) {
  await hre.run("verify:verify", {
    "address": contractAddress,
    "constructorArguments": params
  });

  console.log(`Verified contract: ${contractAddress} successfully.`)

  return contractAddress
}

module.exports = {
  verifyContract,
}
