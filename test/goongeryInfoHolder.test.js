const { expect } = require("chai")
const { ethers } = require("hardhat")
const { deploy } = require("./libs/deploy")
const { mine, currentBlock, currentBlockTimestamp } = require("./libs/rpc")
const { approveTokens } = require("./libs/token")
const {
  calculateWinningNumbers,
  enterDrawingPhase
} = require("./libs/goongery")

describe("GoongeryInfoHolder", async function () {
  const goongPerTicket = ethers.utils.parseEther("100")
  let goong, goongery, nft, helper, infoHolder

  beforeEach(async () => {
    const [owner] = await ethers.getSigners()
    nft = await deploy("GoongeryNFT")
    helper = await deploy("GoongeryHelper")
    infoHolder = await deploy(
      "GoongeryInfoHolder",
      [owner.address, nft.address],
      {
        libraries: {
          GoongeryHelper: helper.address
        }
      }
    )
  })

  describe("setGoongeryInfo", async function () {
    it("should be reverted: `already set` given goongery info for corresponding `roundNumber` already existed", async function () {
      const timestamp = await currentBlockTimestamp()
      const allocation = [60, 20, 10]
      const info = [
        0,
        allocation,
        goongPerTicket,
        timestamp + 200,
        timestamp + 4200,
        [],
        [255, 255, 255],
        0,
        0,
        10,
        9
      ]
      await infoHolder.setGoongeryInfo(1, info)
      await expect(infoHolder.setGoongeryInfo(1, info)).to.be.revertedWith(
        `already set`
      )
    })

    it("should set goongery info correctly goongery info for given roundNumber has never been set", async function () {
      const timestamp = await currentBlockTimestamp()
      const allocation = [60, 20, 10]
      const info = [
        0,
        allocation,
        goongPerTicket,
        timestamp + 200,
        timestamp + 4200,
        [],
        [255, 255, 255],
        0,
        0,
        10,
        9
      ]
      await infoHolder.setGoongeryInfo(1, info)
      const gInfo = await infoHolder.getGoongeryInfo(1)
      expect(gInfo.allocation.map((a) => a.toNumber())).to.be.eql(allocation)
    })
  })

  describe("addUserTokenIdsByRound", async function () {
    it("should add user token id to the mapping", async function () {
      const [owner] = await ethers.getSigners()
      await infoHolder
        .addUserTokenIdsByRound(owner.address, 1, 1)
        .then((tx) => tx.wait())

      await infoHolder
        .addUserTokenIdsByRound(owner.address, 1, 2)
        .then((tx) => tx.wait())

      await infoHolder
        .addUserTokenIdsByRound(owner.address, 2, 3)
        .then((tx) => tx.wait())

      await infoHolder
        .addUserTokenIdsByRound(owner.address, 2, 4)
        .then((tx) => tx.wait())

      const tokenIdsRound1 = await infoHolder.getUserTokenIdsByRound(
        owner.address,
        1
      )
      const tokenIdsRound2 = await infoHolder.getUserTokenIdsByRound(
        owner.address,
        2
      )
      expect(tokenIdsRound1.map((a) => a.toNumber())).to.be.eql([1, 2])
      expect(tokenIdsRound2.map((a) => a.toNumber())).to.be.eql([3, 4])
    })
  })

  describe("calculateReward", async function () {
    let openingTimestamp, closingTimestamp, randomness
    beforeEach(async () => {
      const timestamp = await currentBlockTimestamp()
      randomness = timestamp
      const allocation = [4000, 3000, 1000]
      openingTimestamp = timestamp + 200
      closingTimestamp = timestamp + 4200
      const info = [
        0,
        allocation,
        goongPerTicket,
        openingTimestamp,
        closingTimestamp,
        [],
        [255, 255, 255],
        0,
        0,
        1000,
        9
      ]
      await infoHolder.setGoongeryInfo(1, info)
    })
    it("should return 4000 given total bought 10000 and buy option is three digits", async function () {
      const [owner] = await ethers.getSigners()
      const maxNumber = 9
      const winningNumbers = calculateWinningNumbers(randomness, maxNumber)
      const roundNumber = 1
      const boughtGoongAmount1 = 200
      const boughtGoongAmount2 = 9800

      // 1
      await nft.create(
        owner.address,
        winningNumbers,
        boughtGoongAmount1,
        roundNumber,
        0
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        winningNumbers,
        boughtGoongAmount1,
        0
      )

      // 2
      await nft.create(
        owner.address,
        [0, 1, 2],
        boughtGoongAmount2,
        roundNumber,
        0
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        [0, 1, 2],
        boughtGoongAmount2,
        0
      )

      await infoHolder.addGoongeryInfoTotalGoongPrize(
        roundNumber,
        boughtGoongAmount1 + boughtGoongAmount2
      )

      await infoHolder.setGoongeryInfoStatus(roundNumber, 2)
      await mine(5000)
      await infoHolder.drawWinningNumbersCallback(
        roundNumber,
        randomness,
        maxNumber
      )

      const winNftId = 1
      const reward = await infoHolder.calculateReward(winNftId, roundNumber, 0)
      expect(reward).to.be.eq(4000)
    })

    it("should return 3000 given total bought 10000 and buy option is permutable three digits", async function () {
      const [owner] = await ethers.getSigners()
      const maxNumber = 9
      const winningNumbers = calculateWinningNumbers(randomness, maxNumber)
      const roundNumber = 1
      const buyOption = 1
      const boughtGoongAmount1 = 200
      const boughtGoongAmount2 = 9800

      // 1
      await nft.create(
        owner.address,
        winningNumbers,
        boughtGoongAmount1,
        roundNumber,
        buyOption
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        winningNumbers,
        boughtGoongAmount1,
        buyOption
      )

      // 2
      await nft.create(
        owner.address,
        [0, 1, 2],
        boughtGoongAmount2,
        roundNumber,
        buyOption
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        [0, 1, 2],
        boughtGoongAmount2,
        buyOption
      )
      await infoHolder.addGoongeryInfoTotalGoongPrize(
        roundNumber,
        boughtGoongAmount1 + boughtGoongAmount2
      )

      await infoHolder.setGoongeryInfoStatus(roundNumber, 2)
      await mine(5000)
      await infoHolder.drawWinningNumbersCallback(
        roundNumber,
        randomness,
        maxNumber
      )

      const winNftId = 1
      const reward = await infoHolder.calculateReward(
        winNftId,
        roundNumber,
        buyOption
      )
      expect(reward).to.be.eq(3000)
    })

    it("should return 1000 given total bought 10000 and buy option is last two digits", async function () {
      const [owner] = await ethers.getSigners()
      const maxNumber = 9
      const winningNumbers = calculateWinningNumbers(randomness, maxNumber)
      const roundNumber = 1
      const buyOption = 2
      const boughtGoongAmount1 = 200
      const boughtGoongAmount2 = 9800

      // 1
      await nft.create(
        owner.address,
        winningNumbers,
        boughtGoongAmount1,
        roundNumber,
        buyOption
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        winningNumbers,
        boughtGoongAmount1,
        buyOption
      )

      // 2
      await nft.create(
        owner.address,
        [0, 1, 2],
        boughtGoongAmount2,
        roundNumber,
        buyOption
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        [0, 1, 2],
        boughtGoongAmount2,
        buyOption
      )

      await infoHolder.addGoongeryInfoTotalGoongPrize(
        roundNumber,
        boughtGoongAmount1 + boughtGoongAmount2
      )

      await infoHolder.setGoongeryInfoStatus(roundNumber, 2)
      await mine(5000)
      await infoHolder.drawWinningNumbersCallback(
        roundNumber,
        randomness,
        maxNumber
      )

      const winNftId = 1
      const reward = await infoHolder.calculateReward(
        winNftId,
        roundNumber,
        buyOption
      )
      expect(reward).to.be.eq(1000)
    })

    it("should return 0 given the ticket does not win", async function () {
      const [owner] = await ethers.getSigners()
      const maxNumber = 9
      const roundNumber = 1
      const buyOption = 0
      const boughtGoongAmount1 = 200
      const boughtGoongAmount2 = 9800
      await nft.create(
        owner.address,
        [0, 0, 0],
        boughtGoongAmount1,
        roundNumber,
        buyOption
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        [0, 0, 0],
        boughtGoongAmount1,
        buyOption
      )
      await nft.create(
        owner.address,
        [0, 1, 2],
        boughtGoongAmount2,
        roundNumber,
        buyOption
      )
      await infoHolder.addUserBuyAmountSum(
        roundNumber,
        [0, 1, 2],
        boughtGoongAmount2,
        buyOption
      )
      await infoHolder.addGoongeryInfoTotalGoongPrize(
        roundNumber,
        boughtGoongAmount1 + boughtGoongAmount2
      )

      await infoHolder.setGoongeryInfoStatus(roundNumber, 2)
      await mine(5000)
      await infoHolder.drawWinningNumbersCallback(
        roundNumber,
        randomness,
        maxNumber
      )

      const winNftId = 1
      const reward = await infoHolder.calculateReward(
        winNftId,
        roundNumber,
        buyOption
      )
      expect(reward).to.be.eq(0)
    })
  })

  describe("getNumbersForRewardCalculation", async function () {
    it("should return given numbers when `buyOption` is 0", async function () {})
    it("should return least permutable numbers given `_buyOption` is 1", async function () {})
    it("should return numbers where the first number is 255 given `buyOption` is 2", async function () {})
  })

  describe("calculateUnmatchedReward", async function () {
    it("should return 60% of `totalGoongPrize` given no one wins exact three digits prize", async function () {})

    it("should return 20% of `totalGoongPrize` given no one wins permutable three digits prize", async function () {})

    it("should return 10% of `totalGoongPrize` given no one wins last two digits prize", async function () {})

    it("should return 90% of `totalGoongPrize` when no one wins any prize", async function () {})

    it("should return 0 when there're at least one ticket won for every prizes", async function () {})
  })

  describe("addUserBuyAmountSum", async function () {
    it("should increase userBuyAmountSum given existing numbers", async function () {})

    it("should set userBuyAmountSum given non-existing numbers", async function () {})
  })

  describe("drawWinningNumbersCallback", async function () {
    it("should set status and winning numbers correctly", async function () {})

    it("should reverted: `Draw winning numbers first` given the status is not closed", async function () {})
  })
  describe("calculateGoongCost", async function () {
    it("should return correct goongCost for given goongPerTicket associated with roundNumber", async function () {})
  })
})
