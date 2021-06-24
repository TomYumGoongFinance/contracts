const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { approveTokens } = require("./libs/token")
const { mine, currentBlock, currentBlockTimestamp } = require("./libs/rpc")

describe("GoongVestingController", function () {
  let vestingContract, goong, vestingControllerContract
  const hour = 3600
  beforeEach(async () => {
    const Goong = await ethers.getContractFactory("GoongToken")
    goong = await Goong.deploy()
    await goong.deployed()

    const VestingContract = await ethers.getContractFactory("GoongVesting")
    vestingContract = await VestingContract.deploy(goong.address, hour)
    await vestingContract.deployed()

    const VestingControllerContract = await ethers.getContractFactory(
      "GoongVestingController"
    )
    vestingControllerContract = await VestingControllerContract.deploy(
      goong.address,
      vestingContract.address
    )
    await vestingControllerContract.deployed()

    const goongAmount = ethers.utils.parseEther("1000000")
    await goong["mint(uint256)"](goongAmount)

    await approveTokens([goong], vestingControllerContract.address)
  })

  describe("claimOwnership", async function () {
    beforeEach(async () => {
      await vestingContract
        .transferOwnership(vestingControllerContract.address)
        .then((tx) => tx.wait())
    })

    it("should transfer GoongVesting ownership from this contract to the owner", async function () {
      let [signer] = await ethers.getSigners()
      let owner = await vestingContract.owner()
      expect(owner).to.be.eq(vestingControllerContract.address)
      await vestingControllerContract.claimOwnership()
      owner = await vestingContract.owner()
      expect(owner).to.be.eq(signer.address)
    })

    it("should not transfer ownership if the caller is not owner", async function () {
      let [, hacker] = await ethers.getSigners()
      await expect(
        vestingControllerContract.connect(hacker).claimOwnership()
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe.skip("addTokenVesting", async function () {
    beforeEach(async () => {
      await vestingContract
        .transferOwnership(vestingControllerContract.address)
        .then((tx) => tx.wait())
    })

    it("should transfer goong token from sender wallet to vesting contract given valid params", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingControllerContract.address)

      await vestingControllerContract.addTokenVesting(
        alice.address,
        startDate + 2,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )
      await mine(1800) // 0.5 hour
      const amount = await vestingContract.claimableAmount(alice.address)
      expect(amount).to.be.eq(ethers.utils.parseEther("500"))
    })
  })

  describe.skip("batchAddTokenVesting", async function () {
    beforeEach(async () => {
      await vestingContract
        .transferOwnership(vestingControllerContract.address)
        .then((tx) => tx.wait())
    })

    it("should transfer goong token from sender wallet to vesting contract given valid params", async function () {
      const [owner, alice, bob, charles] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingControllerContract.address)

      await vestingControllerContract.batchAddTokenVesting(
        [alice.address, bob.address, charles.address],
        startDate + 2,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )
      await mine(7200) // 2 hour
      const aliceAmount = await vestingContract.claimableAmount(alice.address)
      const bobAmount = await vestingContract.claimableAmount(bob.address)
      const charlesAmount = await vestingContract.claimableAmount(
        charles.address
      )

      expect(aliceAmount).to.be.eq(ethers.utils.parseEther("2000"))
      expect(bobAmount).to.be.eq(ethers.utils.parseEther("2000"))
      expect(charlesAmount).to.be.eq(ethers.utils.parseEther("2000"))
    })
  })

  describe("batchAddTokenVestingMultiAmounts", async function () {
    beforeEach(async () => {
      await vestingContract
        .transferOwnership(vestingControllerContract.address)
        .then((tx) => tx.wait())
    })

    it("should transfer goong token from sender wallet to vesting contract given valid params", async function () {
      const [owner, alice, bob, charles] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingControllerContract.address)

      await vestingControllerContract.batchAddTokenVestingMultiAmounts(
        [alice.address, bob.address, charles.address],
        startDate + 2,
        2 * 60 * 60, // 2 hour
        [
          ethers.utils.parseEther("2000"),
          ethers.utils.parseEther("1000"),
          ethers.utils.parseEther("500")
        ]
      )
      await mine(7200) // 2 hour
      const aliceAmount = await vestingContract.claimableAmount(alice.address)
      const bobAmount = await vestingContract.claimableAmount(bob.address)
      const charlesAmount = await vestingContract.claimableAmount(
        charles.address
      )

      expect(aliceAmount).to.be.eq(ethers.utils.parseEther("2000"))
      expect(bobAmount).to.be.eq(ethers.utils.parseEther("1000"))
      expect(charlesAmount).to.be.eq(ethers.utils.parseEther("500"))
    })
  })
})
