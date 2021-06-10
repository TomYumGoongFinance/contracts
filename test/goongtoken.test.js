const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("GoongToken", async function () {
  let goong
  beforeEach(async () => {
    const GoongToken = await ethers.getContractFactory("GoongToken")
    goong = await GoongToken.deploy()
    await goong.deployed()
  })
  describe("mint", async function () {
    it("should reverted: `max supply has been reached` when total supply is 99,900,000 and mint 200,000", async function () {
      const [owner] = await ethers.getSigners()
      const initialAmount = ethers.utils.parseEther("99900000")
      await goong["mint(address,uint256)"](owner.address, initialAmount)
      const ownerBalance = await goong.balanceOf(owner.address)
      expect(ownerBalance).to.be.eq(initialAmount)
      await expect(
        goong["mint(address,uint256)"](owner.address, ethers.utils.parseEther("200000"))
      ).to.be.revertedWith("max supply has been reached")
    })
  })
})
