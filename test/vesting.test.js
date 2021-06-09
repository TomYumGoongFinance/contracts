const { expect } = require("chai")

describe("GoongVesting", function () {
  describe("addTokenVesting", async function () {
    it("should transfer goong token from sender wallet to vesting contract given valid params", async function () {})

    it("should reverted: `recipient is already vested goong` when recipient is already added to vestingInfo.", async function () {})

    it("should reverted: `vested amount must be greater than 1800 goong` when amount less than the minimum vested amount", async function () {})

    it("should reverted: `vested duration must be greater than 180 days` when the given duration is less than the minimum duration", async function () {})

    it("should reverted: `start date cannot be the past` when given start date is less than block.timestamp", async function () {})
  })

  describe("claim", async function () {
    it("should transfer goong from contract back to sender given current block timestamp < start date + duration", async function () {})

    it("should transfer all goong from contract back to sender given current block timestamp >= start date + duration", async function () {})

    it("should transfer total 10 goong from contract back to sender given locked amount is 30 and claim twice at 1/3 locked time passed and 2/3 locked time passed", async function () {})

    it("should reverted: `too early to claim` if the current timestamp is before start date", async function () {})

    it("should reverted: `already claimed all vested tokens` if the claimed amount >= initial locked amount", async function () {})
  })

  describe("vestedDurationLeft", async function () {
    it("should returns 2,000 when block.timestamp < start date and start date + duration - current timestamp = 2000", async function () {})

    it("should returns 1,000 when block.timestamp >= start date and start date + duration - current timestamp = 1000", async function () {})

    it("should returns 0 when block.timestamp > start date + duration", async function () {})
  })

  describe("remainingVestedAmount", async function () {
    it("should returns 2000 when the recipient has 2000 initial locked amount and never claimed vested tokens", async function () {})

    it("should returns 1000 when the recipient has 2000 initial locked amount and claimed amount is 1000", async function () {})

    it("should returns 0 when the recipient never vested tokens", async function () {})
  })

  describe("claimableAmount", async function () {
    it("should returns 1000 when the recipient has 1000 initial locked amount and current block.timestamp >= start date + duration", async function () {})

    it("should returns 500 when the recipient has 1000 initial locked amount and current block.timestamp = start date + duration / 2", async function () {})

    it("should returns 0 when the recipient never locked amount", async function () {})
  })
})
