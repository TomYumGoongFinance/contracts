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
    it("should generate unique ids for every possible numbers", async function () {
      const maxNumber = 15
      const set = new Set()
      for (let i = 0; i < maxNumber ** 3; i++) {
        const first = parseInt(i / (maxNumber + 1) ** 2) % (maxNumber + 1)
        const second = parseInt(i / (maxNumber + 1)) % (maxNumber + 1)
        const third = i % (maxNumber + 1)
        const id = await helper.calculateGoongeryNumberId([
          first,
          second,
          third
        ])
        set.add(id)
      }

      expect(Array.from(set).length).to.be.eq(maxNumber ** 3)
    })
  })

  describe("getLeastPermutableNumber", async function () {
    it("should return least possible numbers", async function () {
      expect(await helper.getLeastPermutableNumber([3, 2, 1])).to.be.eql([
        1, 2, 3
      ])
      expect(await helper.getLeastPermutableNumber([3, 1, 2])).to.be.eql([
        1, 2, 3
      ])
      expect(await helper.getLeastPermutableNumber([2, 3, 1])).to.be.eql([
        1, 2, 3
      ])
      expect(await helper.getLeastPermutableNumber([2, 1, 3])).to.be.eql([
        1, 2, 3
      ])
      expect(await helper.getLeastPermutableNumber([1, 2, 3])).to.be.eql([
        1, 2, 3
      ])
      expect(await helper.getLeastPermutableNumber([1, 3, 2])).to.be.eql([
        1, 2, 3
      ])
    })
  })
})
