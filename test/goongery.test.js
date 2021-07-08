const { expect } = require("chai")
const { ethers } = require("hardhat")
const { deploy } = require("./libs/deploy")
const { mine, currentBlock, currentBlockTimestamp } = require("./libs/rpc")
const { approveTokens } = require("./libs/token")

describe("Goongery", async function () {
  const goongPerTicket = ethers.utils.parseEther("100")
  let goong, goongery, nft, helper, infoHolder
  const burnPercentage = 1000
  const maxNumber = 9

  beforeEach(async () => {
    const [owner] = await ethers.getSigners()
    goong = await deploy("GoongToken")
    link = await deploy("LinkToken")
    nft = await deploy("GoongeryNFT")
    helper = await deploy("GoongeryHelper")
    goongery = await deploy("Goongery")
    infoHolder = await deploy(
      "GoongeryInfoHolder",
      [goongery.address, nft.address],
      {
        libraries: {
          GoongeryHelper: helper.address
        }
      }
    )

    await nft.transferOwnership(goongery.address).then((tx) => tx.wait())

    const randomGeneratorParams = [
      owner.address,
      link.address,
      goongery.address,
      "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186",
      1
    ]
    const goongeryRandomGenerator = await deploy(
      "GoongeryRandomGenerator",
      randomGeneratorParams
    )

    const goongAmount = ethers.utils.parseEther("1000000")
    await goong["mint(uint256)"](goongAmount)

    await link["transfer(address,uint256)"](
      goongeryRandomGenerator.address,
      ethers.utils.parseEther("100000000")
    )

    await goongery
      .initialize(
        goong.address,
        goongeryRandomGenerator.address,
        nft.address,
        infoHolder.address
      )
      .then((tx) => tx.wait)
  })

  describe("createNewRound", async function () {
    it("should create goongery info and increment roundNumber by 1 when pass all validations", async () => {
      const timestamp = await currentBlockTimestamp()
      const _allocation = ["6000", "2000", "1000"]
      const _winningNumbers = [255, 255, 255]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000

      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        burnPercentage,
        maxNumber,
        _openingTimestamp,
        _closingTimestamp
      )

      const currentRoundNumber = await goongery.roundNumber()
      const infos = await infoHolder.goongeryInfo(currentRoundNumber)
      const allocation = await infoHolder
        .getAllocation(currentRoundNumber)
        .then((allocs) => allocs.map((alloc) => alloc.toString()))
      const winningNumbers = await infoHolder.getWinningNumbers(
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

    it("should add previous round rewards when there're at least one allocation pool that no one wins", async () => {
      const timestamp = await currentBlockTimestamp()
      const _allocation = ["6000", "2000", "1000"]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000

      await goongery
        .createNewRound(
          _allocation,
          goongPerTicket,
          burnPercentage,
          maxNumber,
          _openingTimestamp,
          _closingTimestamp
        )
        .then((tx) => tx.wait())

      await approveTokens([goong], goongery.address)

      await mine(_openingTimestamp - timestamp)

      await goongery.buy(50, [0, 0, 0], 0).then((tx) => tx.wait())

      await mine(_closingTimestamp - _openingTimestamp + 1)
      await goongery.drawWinningNumbers().then((tx) => tx.wait())
      const [owner] = await ethers.getSigners()
      await goongery.setGoongeryRandomGenerator(owner.address)
      const requestId = await goongery.requestId()
      const randomness = 10000
      await goongery
        .drawWinningNumbersCallback(1, requestId, randomness)
        .then((tx) => tx.wait())

      await goongery
        .createNewRound(
          _allocation,
          goongPerTicket,
          burnPercentage,
          maxNumber,
          _closingTimestamp + 100,
          _closingTimestamp + 4000
        )
        .then((tx) => tx.wait())

      const infos = await infoHolder.getGoongeryInfo(2)
      const expectedTotalGoongPrize = goongPerTicket
        .mul(50)
        .mul(10000 - burnPercentage)
        .div(10000)
      expect(infos.totalGoongPrize).to.be.eq(expectedTotalGoongPrize)
    })
  })

  describe("buy", async function () {
    it("should add totalGoongPrize by 200 when bought 2 tickets with 100 goong per ticket", async function () {
      const [owner] = await ethers.getSigners()
      const timestamp = await currentBlockTimestamp()
      const _allocation = [6000, 2000, 1000]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000
      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        burnPercentage,
        maxNumber,
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
      const infos = await infoHolder.goongeryInfo(1)
      expect(infos.totalGoongPrize).to.be.eq(
        goongPerTicket.mul(numberOfTickets)
      )
      const tokenId = await goongery.userInfo(owner.address, 0)
      expect(tokenId).to.be.eq(1)
      const amount = await nft.getAmount(tokenId)
      expect(amount).to.be.eq(goongPerTicket.mul(numberOfTickets))
      expect(infos.status).to.be.eq(1)
    })
  })

  describe("drawWinningNumbers", async function () {
    it("should change status to `Closed` given valid params", async function () {
      const timestamp = await currentBlockTimestamp()
      const _allocation = [6000, 2000, 1000]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000
      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        burnPercentage,
        maxNumber,
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
      const info = await infoHolder.goongeryInfo(1)
      expect(info.status).to.be.eq(2)
    })
  })

  describe("drawWinningNumbersCallback", async function () {
    it("should set winner numbers correctly given valid params", async function () {
      const [owner] = await ethers.getSigners()

      const timestamp = await currentBlockTimestamp()
      const _allocation = [6000, 2000, 1000]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000
      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        burnPercentage,
        maxNumber,
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

      const winningNumbers = await infoHolder.getWinningNumbers(1)
      let _winningNumbers = new Array(3)
      for (let i = 0; i < 3; i++) {
        const hash = ethers.utils.solidityKeccak256(
          ["uint256", "uint256"],
          [randomness, i]
        )
        const hashNumber = ethers.BigNumber.from(hash)
        _winningNumbers[i] = hashNumber.mod(maxNumber).toNumber()
      }
      expect(winningNumbers).to.be.eql(_winningNumbers)
      const info = await infoHolder.goongeryInfo(1)
      expect(info.status).to.be.eq(3)
    })
  })

  describe("claimReward", async function () {
    let numberOfTickets = 1
    const randomness = ethers.BigNumber.from(ethers.utils.randomBytes(32))
    let _winningNumbers
    let owner
    beforeEach(async () => {
      const signers = await ethers.getSigners()
      owner = signers[0]
      const timestamp = await currentBlockTimestamp()
      const _allocation = [6000, 2000, 1000]
      const _openingTimestamp = timestamp + 200
      const _closingTimestamp = timestamp + 4000
      await goongery.createNewRound(
        _allocation,
        goongPerTicket,
        burnPercentage,
        maxNumber,
        _openingTimestamp,
        _closingTimestamp
      )

      await mine(300)
      await approveTokens([goong], goongery.address)

      _winningNumbers = new Array(3)
      for (let i = 0; i < 3; i++) {
        const hash = ethers.utils.solidityKeccak256(
          ["uint256", "uint256"],
          [randomness, i]
        )
        const hashNumber = ethers.BigNumber.from(hash)
        _winningNumbers[i] = hashNumber.mod(10).toNumber()
      }
    })

    async function drawWinningNumbers() {
      await mine(4000)
      await goongery.drawWinningNumbers().then((tx) => tx.wait())
      await goongery.setGoongeryRandomGenerator(owner.address)
      const requestId = await goongery.requestId()
      await goongery
        .drawWinningNumbersCallback(1, requestId, randomness)
        .then((tx) => tx.wait())
    }

    it("should receive 60% of total goong, given non-permutable 3 digits ticket and all tickets win", async function () {
      const buyOption = 0

      const initialBalance = await goong.balanceOf(owner.address)
      const totalTicketCost =
        ethers.BigNumber.from(numberOfTickets).mul(goongPerTicket)

      await goongery
        .buy(numberOfTickets, _winningNumbers, buyOption)
        .then((tx) => tx.wait())

      const nftId = await goongery.userInfo(owner.address, 0)

      await drawWinningNumbers()

      const reward = totalTicketCost.mul(60).div(100)

      await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost).add(reward)).to.be.eq(
        balanceAfterClaimedReward
      )
    })

    it("should receive 1/3 of 60% of total goong, given non-permutable 3 digits ticket, the numbers match the winning numbers, but there're total 3 tickets win", async function () {
      const signers = await ethers.getSigners()
      const alice = signers[1]
      await goong.transfer(alice.address, goongPerTicket.mul(2))
      const buyOption = 0
      const ownerTicketsBought = 1
      const aliceTicketsBought = 2

      const initialBalance = await goong.balanceOf(owner.address)

      await approveTokens([goong.connect(alice)], goongery.address)
      await goongery
        .connect(alice)
        .buy(aliceTicketsBought, _winningNumbers, buyOption)
        .then((tx) => tx.wait())

      await goongery
        .buy(ownerTicketsBought, _winningNumbers, buyOption)
        .then((tx) => tx.wait())

      const totalOwnerTicketCost =
        ethers.BigNumber.from(ownerTicketsBought).mul(goongPerTicket)
      const totalAliceTicketCost =
        ethers.BigNumber.from(aliceTicketsBought).mul(goongPerTicket)

      const nftId = await goongery.userInfo(owner.address, 0)

      await drawWinningNumbers()

      const ownerReward = totalOwnerTicketCost
        .add(totalAliceTicketCost)
        .mul(totalOwnerTicketCost)
        .mul(60)
        .div(100)
        .div(totalOwnerTicketCost.add(totalAliceTicketCost))

      await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(
        initialBalance.sub(totalOwnerTicketCost).add(ownerReward)
      ).to.be.eq(balanceAfterClaimedReward)
    })

    it("should receive 20% of total goong, given permutable 3 digits ticket and all tickets win", async function () {
      const buyOption = 1

      const initialBalance = await goong.balanceOf(owner.address)
      const totalTicketCost =
        ethers.BigNumber.from(numberOfTickets).mul(goongPerTicket)

      await goongery
        .buy(numberOfTickets, _winningNumbers, buyOption)
        .then((tx) => tx.wait())

      const nftId = await goongery.userInfo(owner.address, 0)

      await drawWinningNumbers()

      const reward = totalTicketCost.mul(20).div(100)

      await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost).add(reward)).to.be.eq(
        balanceAfterClaimedReward
      )
    })

    it("should receive 20% of total goong, given the number bought is permutably matched with winning numbers", async function () {
      const buyOption = 1

      const initialBalance = await goong.balanceOf(owner.address)

      const permutablyNumbers = [
        [_winningNumbers[0], _winningNumbers[1], _winningNumbers[2]],
        [_winningNumbers[0], _winningNumbers[2], _winningNumbers[1]],
        [_winningNumbers[1], _winningNumbers[0], _winningNumbers[2]],
        [_winningNumbers[1], _winningNumbers[2], _winningNumbers[0]],
        [_winningNumbers[2], _winningNumbers[0], _winningNumbers[1]],
        [_winningNumbers[2], _winningNumbers[1], _winningNumbers[0]]
      ]

      const totalTicketCost = ethers.BigNumber.from(
        numberOfTickets * permutablyNumbers.length
      ).mul(goongPerTicket)

      for (let i = 0; i < permutablyNumbers.length; i++) {
        await goongery
          .buy(numberOfTickets, permutablyNumbers[i], buyOption)
          .then((tx) => tx.wait())
      }

      await drawWinningNumbers()

      const reward = totalTicketCost.mul(20).div(100)

      for (let i = 0; i < permutablyNumbers.length; i++) {
        const nftId = await goongery.userInfo(owner.address, i)
        await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      }

      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost).add(reward)).to.be.eq(
        balanceAfterClaimedReward
      )
    })

    it("should receive 10% of total goong, given there's only one ticket won last 2 digits prize", async function () {
      const buyOption = 2

      const initialBalance = await goong.balanceOf(owner.address)
      const totalTicketCost =
        ethers.BigNumber.from(numberOfTickets).mul(goongPerTicket)

      await goongery
        .buy(
          numberOfTickets,
          [_winningNumbers[1], _winningNumbers[2], 255],
          buyOption
        )
        .then((tx) => tx.wait())

      const nftId = await goongery.userInfo(owner.address, 0)

      await drawWinningNumbers()

      const reward = totalTicketCost.mul(10).div(100)

      await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost).add(reward)).to.be.eq(
        balanceAfterClaimedReward
      )
    })

    it("should receive half of 10% of total goong per ticket, given there's two tickets won last 2 digits prize equally", async function () {
      const buyOption = 2

      const initialBalance = await goong.balanceOf(owner.address)
      const totalTicketCost = ethers.BigNumber.from(numberOfTickets)
        .mul(goongPerTicket)
        .mul(2)

      await goongery
        .buy(
          numberOfTickets,
          [_winningNumbers[1], _winningNumbers[2], 255],
          buyOption
        )
        .then((tx) => tx.wait())

      await goongery
        .buy(
          numberOfTickets,
          [_winningNumbers[1], _winningNumbers[2], 255],
          buyOption
        )
        .then((tx) => tx.wait())

      const nftId = await goongery.userInfo(owner.address, 0)

      await drawWinningNumbers()

      const totalGoongPrize = await infoHolder
        .getGoongeryInfo(1)
        .then((i) => i.totalGoongPrize)

      const reward = totalGoongPrize.mul(10).div(100).div(2)

      await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost).add(reward)).to.be.eq(
        balanceAfterClaimedReward
      )
    })
  })
})
