const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { approveTokens } = require("./libs/token")
const { mine, currentBlock, currentBlockTimestamp } = require("./libs/rpc")

describe("GoongVesting", function () {
  let vestingContract, goong
  const hour = 3600
  beforeEach(async () => {
    const [owner, alice] = await ethers.getSigners()
    const Goong = await ethers.getContractFactory("GoongToken")
    goong = await Goong.deploy()
    await goong.deployed()

    const VestingContract = await ethers.getContractFactory("GoongVesting")
    vestingContract = await VestingContract.deploy(goong.address, hour)
    await vestingContract.deployed()

    const goongAmount = ethers.utils.parseEther("1000000")
    await goong["mint(uint256)"](goongAmount)
  })

  describe.skip("addTokenVesting", async function () {
    it("should transfer goong token from sender wallet to vesting contract given valid params", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await vestingContract.addTokenVesting(
        alice.address,
        startDate + 2,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )
      await mine(1800) // 0.5 hour
      const amount = await vestingContract.claimableAmount(alice.address)
      expect(amount).to.be.eq(ethers.utils.parseEther("500"))
    })

    it("should reverted: `transfer amount exceeds allowance` when the sender doesn't approve goong", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()

      await expect(
        vestingContract.addTokenVesting(
          alice.address,
          startDate + 2,
          2 * 60 * 60, // 2 hour
          ethers.utils.parseEther("2000")
        )
      ).to.be.revertedWith("transfer amount exceeds allowance")
    })

    it("should reverted: `recipient is already vested goong` when recipient is already added to vestingInfo.", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await vestingContract.addTokenVesting(
        alice.address,
        startDate + 20,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )

      await expect(
        vestingContract.addTokenVesting(
          alice.address,
          startDate + 40,
          4 * 60 * 60, // 4 hour
          ethers.utils.parseEther("5000")
        )
      ).to.be.revertedWith("recipient is already vested goong")
    })

    it("should reverted: `vested amount must be greater than 1800 goong` when amount less than the minimum vested amount", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await expect(
        vestingContract.addTokenVesting(
          alice.address,
          startDate + 2,
          2 * 60 * 60, // 2 hour
          ethers.utils.parseEther("1000")
        )
      ).to.be.revertedWith("vested amount must be greater than 1800 goong")
    })

    it("should reverted: `vested duration must be greater than 180 days` when the given duration is less than the minimum duration", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await expect(
        vestingContract.addTokenVesting(
          alice.address,
          startDate + 2,
          1, // 1 sec
          ethers.utils.parseEther("2000")
        )
      ).to.be.revertedWith("vested duration must be greater than 180 days")
    })

    it("should reverted: `start date cannot be the past` when given start date is less than block.timestamp", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await expect(
        vestingContract.addTokenVesting(
          alice.address,
          startDate - 1,
          2 * 60 * 60,
          ethers.utils.parseEther("2000")
        )
      ).to.be.revertedWith("start date cannot be the past")
    })
  })

  describe("claim", async function () {
    it("should transfer goong from contract back to sender given `start date < current block timestamp < start date + duration`", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await vestingContract.addTokenVesting(
        alice.address,
        startDate + 2,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )
      await mine(1800) // 0.5 hour
      await vestingContract.connect(alice).claim()
      expect(await goong.balanceOf(alice.address)).to.be.closeTo(
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("1")
      )
    })

    it("should transfer all goong from contract back to sender given current block timestamp >= start date + duration", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await vestingContract.addTokenVesting(
        alice.address,
        startDate + 2,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )
      await mine(3 * 60 * 60)
      await vestingContract.connect(alice).claim()
      expect(await goong.balanceOf(alice.address)).to.be.eq(
        ethers.utils.parseEther("2000")
      )
    })

    it("should transfer total 1200 goong from contract back to sender given locked amount is 1800 and claim twice at 1/3 locked time passed and 2/3 locked time passed", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await vestingContract.addTokenVesting(
        alice.address,
        startDate + 2,
        3 * 60 * 60, // 3 hour
        ethers.utils.parseEther("1800")
      )
      await mine(60 * 60) // 1 hour
      await vestingContract.connect(alice).claim()
      expect(await goong.balanceOf(alice.address)).to.be.closeTo(
        ethers.utils.parseEther("600"),
        ethers.utils.parseEther("1")
      )
      await mine(60 * 60) // 1 hour
      await vestingContract.connect(alice).claim()
      expect(await goong.balanceOf(alice.address)).to.be.closeTo(
        ethers.utils.parseEther("1200"),
        ethers.utils.parseEther("1")
      )
    })

    it("should reverted: `too early to claim` if the current timestamp is before start date", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await vestingContract.addTokenVesting(
        alice.address,
        startDate + 2 * 60 * 60,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )
      await mine(1 * 60 * 60)

      await expect(vestingContract.connect(alice).claim()).to.be.revertedWith(
        "too early to claim"
      )
    })

    it("should reverted: `already claimed all vested tokens` if the claimed amount >= initial locked amount", async function () {
      const [owner, alice] = await ethers.getSigners()
      const startDate = await currentBlockTimestamp()
      await approveTokens([goong], vestingContract.address)

      await vestingContract.addTokenVesting(
        alice.address,
        startDate + 2,
        2 * 60 * 60, // 2 hour
        ethers.utils.parseEther("2000")
      )
      await mine(3 * 60 * 60)
      await vestingContract.connect(alice).claim()

      await expect(vestingContract.connect(alice).claim()).to.be.revertedWith(
        "already claimed all vested tokens"
      )
    })
  })

  describe.skip("vestedDurationLeft", async function () {
    it("should returns 2,000 when block.timestamp < start date and start date + duration - current timestamp = 2000", async function () {})

    it("should returns 1,000 when block.timestamp >= start date and start date + duration - current timestamp = 1000", async function () {})

    it("should returns 0 when block.timestamp > start date + duration", async function () {})
  })

  describe.skip("remainingVestedAmount", async function () {
    it("should returns 2000 when the recipient has 2000 initial locked amount and never claimed vested tokens", async function () {})

    it("should returns 1000 when the recipient has 2000 initial locked amount and claimed amount is 1000", async function () {})

    it("should returns 0 when the recipient never vested tokens", async function () {})
  })

  describe.skip("claimableAmount", async function () {
    it("should returns 1000 when the recipient has 1000 initial locked amount and current block.timestamp >= start date + duration", async function () {})

    it("should returns 500 when the recipient has 1000 initial locked amount and current block.timestamp = start date + duration / 2", async function () {})

    it("should returns 0 when the recipient never locked amount", async function () {})
  })
})
