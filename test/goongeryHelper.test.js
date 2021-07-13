const { expect } = require("chai")
const { ethers } = require("hardhat")
const { deploy } = require("./libs/deploy")

describe("GoongeryHelper", async function () {
  let helper

  beforeEach(async () => {
    const [owner] = await ethers.getSigners()
    helper = await deploy("GoongeryHelper")
  })

  describe("calculateGoongeryNumberId", async function () {
    it("should generate unique ids for every possible numbers", async function () {})
  })

  describe("getLeastPermutableNumber", async function () {
    it("should return least possible numbers", async function () {})
  })
})
