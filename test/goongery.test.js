const { expect } = require("chai")
const { ethers } = require("hardhat")
const { mine, currentBlock, currentBlockTimestamp } = require("./libs/rpc")
const { approveTokens } = require("./libs/token")
const { smockit } = require("@eth-optimism/smock")

describe("Goongery", async function () {
  let goong, goongery, mockRandomGenerator, nft
  beforeEach(async () => {
    const [owner] = await ethers.getSigners()
    const GOONG = await ethers.getContractFactory("GoongToken")
    goong = await GOONG.deploy()
    await goong.deployed()

    const NFT = await ethers.getContractFactory("GoongeryNFT")
    nft = await NFT.deploy()
    await nft.deployed()

    const Goongery = await ethers.getContractFactory("Goongery")
    goongery = await Goongery.deploy()
    await goongery.deployed()

    await nft.transferOwnership(goongery.address).then((tx) => tx.wait())

    const GoongRandomGenerator = await ethers.getContractFactory(
      "GoongeryRandomGenerator"
    )
    const randomGeneratorParams = [
      owner.address,
      goong.address,
      goongery.address,
      "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186",
      1
    ]
    const goongRandomGenerator = await GoongRandomGenerator.deploy(
      ...randomGeneratorParams
    )
    await goongRandomGenerator.deployed()
    mockRandomGenerator = await smockit(GoongRandomGenerator)

    await goongery
      .initialize(goong.address, mockRandomGenerator.address, nft.address, 10)
      .then((tx) => tx.wait)

    const goongAmount = ethers.utils.parseEther("1000000")
    await goong["mint(uint256)"](goongAmount)
  })
  describe.skip("getLeastPermutableNumber", async function () {
    it("should returns ascending sorted array", async function () {
      expect(await goongery.getLeastPermutableNumber([3, 2, 1])).to.be.eql([
        1, 2, 3
      ])
      expect(await goongery.getLeastPermutableNumber([2, 3, 1])).to.be.eql([
        1, 2, 3
      ])
      expect(await goongery.getLeastPermutableNumber([1, 2, 3])).to.be.eql([
        1, 2, 3
      ])
      expect(await goongery.getLeastPermutableNumber([2, 1, 1])).to.be.eql([
        1, 1, 2
      ])
      expect(await goongery.getLeastPermutableNumber([1, 1, 1])).to.be.eql([
        1, 1, 1
      ])
    })
  })

  describe("createNewRound", async function () {
    const goongPerTicket = ethers.utils.parseEther("100")

    it("should create goongery info and increment roundNumber by 1 when pass all validations", async () => {
      const timestamp = await currentBlockTimestamp()
      const _allocation = [60, 20, 10]
      const _winningNumbers = [255, 255, 255]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000

      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        _openingTimestamp,
        _closingTimestamp
      )

      const currentRoundNumber = await goongery.roundNumber()
      const infos = await goongery.goongeryInfo(currentRoundNumber)
      const allocation = await goongery.getAllocation(currentRoundNumber)
      const winningNumbers = await goongery.getWinningNumbers(
        currentRoundNumber
      )

      expect(currentRoundNumber).to.be.eq(1)
      expect(winningNumbers).to.be.eql(_winningNumbers)
      expect(allocation).to.be.eql(_allocation)
      expect(infos.openingTimestamp).to.be.eq(_openingTimestamp)
      expect(infos.closingTimestamp).to.be.eq(_closingTimestamp)
      expect(infos.status).to.be.eq(0)
      expect(infos.totalGoongPrize).to.be.eq(0)
      expect(infos.goongPerTicket).to.be.eq(goongPerTicket)
    })
  })

  describe("buy", async function () {
    const goongPerTicket = ethers.utils.parseEther("100")

    it("should add totalGoongPrize by 200 when bought 2 tickets with 100 goong per ticket", async function () {
      const [owner] = await ethers.getSigners()
      const timestamp = await currentBlockTimestamp()
      const _allocation = [60, 20, 10]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000
      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        _openingTimestamp,
        _closingTimestamp
      )

      const numberOfTickets = 2
      const numbers = [1, 2, 3]
      const buyOption = 0

      await mine(300)
      await approveTokens([goong], goongery.address)

      await goongery
        .buy(numberOfTickets, numbers, buyOption)
        .then((tx) => tx.wait())
      const infos = await goongery.goongeryInfo(1)
      expect(infos.totalGoongPrize).to.be.eq(
        goongPerTicket.mul(numberOfTickets)
      )
      const tokenId = await goongery.userInfo(owner.address, 0)
      expect(tokenId).to.be.eq(1)
      const amount = await nft.getAmount(tokenId)
      expect(amount).to.be.eq(goongPerTicket.mul(numberOfTickets))
    })
  })

  describe("drawWinningNumbers", async function () {
    const goongPerTicket = ethers.utils.parseEther("100")
    it("should change status to `Closed` given valid params", async function () {
      const timestamp = await currentBlockTimestamp()
      const _allocation = [60, 20, 10]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000
      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        _openingTimestamp,
        _closingTimestamp
      )

      const numberOfTickets = 2
      const numbers = [1, 2, 3]
      const buyOption = 0

      await mine(300)
      await approveTokens([goong], goongery.address)

      await goongery
        .buy(numberOfTickets, numbers, buyOption)
        .then((tx) => tx.wait())

      await mine(4000)

      await goongery.drawWinningNumbers().then((tx) => tx.wait())
      const info = await goongery.goongeryInfo(1)
      expect(info.status).to.be.eq(2)
    })
  })

  describe("drawWinningNumbersCallback", async function () {
    const goongPerTicket = ethers.utils.parseEther("100")

    it("should set winner numbers correctly given valid params", async function () {
      const [owner] = await ethers.getSigners()

      const timestamp = await currentBlockTimestamp()
      const _allocation = [60, 20, 10]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000
      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        _openingTimestamp,
        _closingTimestamp
      )

      const numberOfTickets = 2
      const numbers = [1, 2, 3]
      const buyOption = 0

      await mine(300)
      await approveTokens([goong], goongery.address)

      await goongery
        .buy(numberOfTickets, numbers, buyOption)
        .then((tx) => tx.wait())

      await mine(4000)

      await goongery.drawWinningNumbers().then((tx) => tx.wait())

      await goongery.setGoongeryRandomGenerator(owner.address)
      const requestId = await goongery.requestId()
      const randomness = ethers.BigNumber.from(ethers.utils.randomBytes(32))
      await goongery
        .drawWinningNumbersCallback(1, requestId, randomness)
        .then((tx) => tx.wait())

      const winningNumbers = await goongery.getWinningNumbers(1)
      let _winningNumbers = new Array(3)
      for (let i = 0; i < 3; i++) {
        const hash = ethers.utils.solidityKeccak256(
          ["uint256", "uint256"],
          [randomness, i]
        )
        const hashNumber = ethers.BigNumber.from(hash)
        _winningNumbers[i] = hashNumber.mod(10).toNumber()
      }
      expect(winningNumbers).to.be.eql(_winningNumbers)
      const info = await goongery.goongeryInfo(1)
      expect(info.status).to.be.eq(3)
    })
  })

  describe("claimReward", async function () {})
})
