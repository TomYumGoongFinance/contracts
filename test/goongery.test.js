const { expect } = require("chai")
const { ethers } = require("hardhat")
const { deploy } = require("./libs/deploy")
const { mine, currentBlock, currentBlockTimestamp } = require("./libs/rpc")
const {
  createNewRound,
  enterBuyingPhase,
  drawWinningNumbers,
  enterDrawingPhase,
  calculateWinningNumbers
} = require("./libs/goongery")
const { approveTokens } = require("./libs/token")

describe("Goongery", async function () {
  const goongPerTicket = ethers.utils.parseEther("100")
  let goong,
    goongery,
    nft,
    helper,
    infoHolder,
    protocolFee,
    goongeryRandomGenerator

  beforeEach(async () => {
    const signers = await ethers.getSigners()
    const owner = signers[0]
    protocolFee = signers[1]
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
    goongeryRandomGenerator = await deploy(
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
        infoHolder.address,
        protocolFee.address
      )
      .then((tx) => tx.wait)
  })

  describe("createNewRound", async function () {
    it("should create goongery info and increment roundNumber by 1 when pass all validations", async () => {
      const _winningNumbers = [255, 255, 255]
      let {
        allocation: _allocation,
        goongPerTicket,
        closingTimestamp,
        openingTimestamp
      } = await createNewRound(goongery)

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
      expect(infos.openingTimestamp).to.be.eq(openingTimestamp)
      expect(infos.closingTimestamp).to.be.eq(closingTimestamp)
      expect(infos.status).to.be.eq(0)
      expect(infos.totalGoongPrize).to.be.eq(0)
      expect(infos.goongPerTicket).to.be.eq(goongPerTicket)
    })

    it("should add previous round rewards when there're at least one allocation pool that no one wins", async () => {
      const {
        goongPerTicket,
        burnPercentage,
        openingTimestamp,
        closingTimestamp
      } = await createNewRound(goongery)
      await approveTokens([goong], goongery.address)

      await enterBuyingPhase(openingTimestamp)
      await goongery.buy(50, [0, 0, 0], 0).then((tx) => tx.wait())

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery)

      await createNewRound(goongery)
      const infos = await infoHolder.getGoongeryInfo(2)

      const expectedTotalGoongPrize = goongPerTicket
        .mul(50)
        .mul(10000 - burnPercentage)
        .div(10000)
      expect(infos.totalGoongPrize).to.be.eq(expectedTotalGoongPrize)
    })

    it("should not burn goong when no one burns in the current round", async function () {})

    it("should burn reward from previous round ", async function () {
      const {
        goongPerTicket,
        burnPercentage,
        openingTimestamp,
        closingTimestamp
      } = await createNewRound(goongery)
      const numberOfTickets = 1
      await approveTokens([goong], goongery.address)

      await enterBuyingPhase(openingTimestamp)
      await goongery.buy(numberOfTickets, [0, 0, 0], 0).then((tx) => tx.wait())

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery)

      const newRoundArgs = await createNewRound(goongery)

      const protocolFeeBalance = await goong.balanceOf(protocolFee.address)
      const burnBalance = await goong.balanceOf(
        "0x000000000000000000000000000000000000dEaD"
      )
      const protocolFeePercentage = await goongery.protocolFeePercent()
      expect(protocolFeeBalance).to.be.eq(
        goongPerTicket
          .mul(numberOfTickets)
          .mul(protocolFeePercentage)
          .mul(burnPercentage)
          .div(10000)
          .div(10000)
      )
      expect(burnBalance).to.be.eq(
        goongPerTicket
          .mul(numberOfTickets)
          .mul(10000 - protocolFeePercentage)
          .mul(burnPercentage)
          .div(10000)
          .div(10000)
      )
      const info = await infoHolder.getGoongeryInfo(1)
      expect(info.burnAmount).to.be.eq(0)

      // Check the carried prize is the same previous round's prize since no one wins
      await enterBuyingPhase(newRoundArgs.openingTimestamp)
      await enterDrawingPhase(
        newRoundArgs.openingTimestamp,
        newRoundArgs.closingTimestamp
      )
      await goongery
        .setGoongeryRandomGenerator(goongeryRandomGenerator.address)
        .then((tx) => tx.wait())
      await drawWinningNumbers(goongery, { roundNumber: 2 })
      await createNewRound(goongery)
      const newRoundInfo = await infoHolder.getGoongeryInfo(2)
      expect(newRoundInfo.totalGoongPrize).to.be.eq(info.totalGoongPrize)
    })

    it("should reverted: `goongPerTicket must be greater than MIN_GOONG_PER_TICKET` given goongPerTicket = 0.1", async () => {
      await expect(
        createNewRound(goongery, {
          goongPerTicket: ethers.utils.parseEther("0.1")
        })
      ).to.be.revertedWith(
        "goongPerTicket must be greater than MIN_GOONG_PER_TICKET"
      )
    })

    it("should reverted: `openingTimestamp cannot be the past` given the openingTimestamp is before block timestamp", async () => {
      const timestamp = await currentBlockTimestamp()
      await expect(
        createNewRound(goongery, { openingTimestamp: timestamp - 1 })
      ).to.be.revertedWith("openingTimestamp cannot be the past")
    })

    it("should reverted: `exceed max burn percentage` given the burn percentage is greater than the max burn percentage", async () => {
      await expect(
        createNewRound(goongery, { burnPercentage: 2100 })
      ).to.be.revertedWith("exceed max burn percentage")
    })

    it("should reverted: `max number must be greater than 9` give the max number is less than 9", async function () {
      await expect(
        createNewRound(goongery, { maxNumber: 8 })
      ).to.be.revertedWith("max number must be greater than 9")
    })

    it("should reverted: `closingTimestamp must be greater than openingTimestamp + MIN_BUY_TICKET_TIME` given the closingTimestamp <=  _openingTimestamp + MIN_BUY_TICKET_TIME", async function () {
      const timestamp = await currentBlockTimestamp()
      const MIN_BUY_TICKET_TIME = await goongery.MIN_BUY_TICKET_TIME()
      await expect(
        createNewRound(goongery, {
          openingTimestamp: timestamp + 2,
          closingTimestamp: timestamp + 3
        })
      ).to.be.revertedWith(
        "closingTimestamp must be greater than openingTimestamp + MIN_BUY_TICKET_TIME"
      )

      await expect(
        createNewRound(goongery, {
          openingTimestamp: timestamp + 4,
          closingTimestamp: timestamp + MIN_BUY_TICKET_TIME.toNumber()
        })
      ).to.be.revertedWith(
        "closingTimestamp must be greater than openingTimestamp + MIN_BUY_TICKET_TIME"
      )
    })

    it("should reverted: `previous round must be completed` given the closingTimestamp from last round is greater than current block timestamp", async function () {
      await createNewRound(goongery)

      // Still not finish the round
      mine(1800)

      await expect(createNewRound(goongery)).to.be.revertedWith(
        "previous round must be completed"
      )
    })

    it("should reverted: `winning number from previous round must be announced` given the previous round has not announced winning numbers yet", async function () {
      await createNewRound(goongery)

      await mine(4000)

      await expect(createNewRound(goongery)).to.be.revertedWith(
        "winning number from previous round must be announced"
      )

      await drawWinningNumbers(goongery)

      await createNewRound(goongery)
    })

    it("should reverted: `total allocation must be equal to 10000` given the total allocations plus burn percentage is not equal to 10000", async function () {
      await expect(
        createNewRound(goongery, { allocation: [1000, 1000, 1000] })
      ).to.be.revertedWith("total allocation must be equal to 10000")
      await expect(
        createNewRound(goongery, {
          allocation: [1000, 2000, 6000],
          burnPercentage: 2000
        })
      ).to.be.revertedWith("total allocation must be equal to 10000")
      await expect(createNewRound(goongery, { allocation: [1000, 2000, 7000] }))
    })
  })

  describe("buy", async function () {
    it("should set goongeryInfo correctly when bought 2 tickets with 100 goong per ticket", async function () {
      const [owner] = await ethers.getSigners()
      const { burnPercentage, goongPerTicket, openingTimestamp } =
        await createNewRound(goongery)

      const numberOfTickets = 2
      const numbers = [1, 2, 3]
      const buyOption = 0

      await approveTokens([goong], goongery.address)
      const initialBalance = await goong.balanceOf(owner.address)

      await enterBuyingPhase(openingTimestamp)
      await goongery
        .buy(numberOfTickets, numbers, buyOption)
        .then((tx) => tx.wait())

      const infos = await infoHolder.goongeryInfo(1)
      expect(infos.totalGoongPrize).to.be.eq(
        goongPerTicket
          .mul(numberOfTickets)
          .mul(10000 - burnPercentage)
          .div(10000)
      )
      const tokenId = await infoHolder.userInfo(owner.address, 0)
      const amount = await nft.getAmount(tokenId)
      const tokenIds = await infoHolder.getUserTokenIdsByRound(owner.address, 1)
      const latestBalance = await goong.balanceOf(owner.address)

      expect(tokenId).to.be.eq(1)
      expect(amount).to.be.eq(goongPerTicket.mul(numberOfTickets))
      expect(infos.status).to.be.eq(1)
      expect(infos.burnAmount).to.be.eq(amount.div(10))
      expect(tokenIds).to.be.eql([tokenId])
      expect(initialBalance.sub(latestBalance)).to.be.eq(amount)
    })

    it("should set token ids correctly given user bought all types of tickets", async function () {
      const { openingTimestamp } = await createNewRound(goongery)

      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)

      await goongery.buy(10, [1, 2, 3], 0)
      await goongery.buy(10, [3, 8, 6], 1)
      await goongery.buy(10, [2, 3, 0], 2)

      const [owner] = await ethers.getSigners()
      const tokenIds = await infoHolder
        .getUserTokenIdsByRound(owner.address, 1)
        .then((ids) => ids.map((id) => id.toNumber()))

      expect(tokenIds).to.be.eql([1, 2, 3])
      expect(await nft.getBuyOption(tokenIds[0])).to.be.eq(0)
      expect(await nft.getBuyOption(tokenIds[1])).to.be.eq(1)
      expect(await nft.getBuyOption(tokenIds[2])).to.be.eq(2)
      expect(await nft.getNumbers(tokenIds[0])).to.be.eql([1, 2, 3])
      expect(await nft.getNumbers(tokenIds[1])).to.be.eql([3, 8, 6])
      expect(await nft.getNumbers(tokenIds[2])).to.be.eql([255, 3, 0])
    })

    it("should set status from `NotStarted` to `Open` when bought after opening timestamp", async function () {
      const timestamp = await currentBlockTimestamp()
      const { openingTimestamp } = await createNewRound(goongery, {
        openingTimestamp: timestamp + 100
      })

      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)

      expect(
        await infoHolder.getGoongeryInfo(1).then((info) => info.status)
      ).to.be.eq(0)

      await goongery.buy(10, [1, 2, 3], 0).then((tx) => tx.wait())

      expect(
        await infoHolder.getGoongeryInfo(1).then((info) => info.status)
      ).to.be.eq(1)
    })

    it("should reverted: `block timestamp must be greater than opening timestamp` given bought before opening timestamp", async function () {
      const timestamp = await currentBlockTimestamp()
      await createNewRound(goongery, {
        openingTimestamp: timestamp + 100
      })
      await approveTokens([goong], goongery.address)
      await expect(
        goongery.buy(10, [1, 2, 3], 0).then((tx) => tx.wait())
      ).to.be.revertedWith(
        "block timestamp must be greater than opening timestamp"
      )
    })

    it("should reverted: `block timestamp must be less than closing timestamp` given bought after closing timestamp", async function () {
      await createNewRound(goongery)
      await approveTokens([goong], goongery.address)
      await mine(4200)
      await expect(
        goongery.buy(10, [1, 2, 3], 0).then((tx) => tx.wait())
      ).to.be.revertedWith(
        "block timestamp must be less than closing timestamp"
      )
    })

    it("should reverted: `exceed max number allowed` when bought one of three numbers is greater than max number for given round and buy option is ExactThreeDigits", async function () {
      const { openingTimestamp } = await createNewRound(goongery)
      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)
      await expect(goongery.buy(10, [1, 2, 10], 0)).to.be.revertedWith(
        `exceed max number allowed`
      )
      await expect(goongery.buy(10, [1, 2, 10], 1)).to.be.revertedWith(
        `exceed max number allowed`
      )
    })

    it("should reverted: `exceed max number allowed` when bought one of first two numbers is greater than max number for given round and buy option is LastTwoDigits", async function () {
      const { openingTimestamp } = await createNewRound(goongery)
      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)
      // should not revert
      await goongery.buy(10, [255, 2, 8], 2)
      await expect(goongery.buy(10, [255, 2, 11], 2)).to.be.revertedWith(
        "exceed max number allowed"
      )
    })
  })

  describe("drawWinningNumbers", async function () {
    it("should change status to `Closed` given valid params", async function () {
      const { openingTimestamp, closingTimestamp } = await createNewRound(
        goongery
      )

      const numberOfTickets = 2
      const numbers = [1, 2, 3]
      const buyOption = 0

      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)
      await goongery
        .buy(numberOfTickets, numbers, buyOption)
        .then((tx) => tx.wait())

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await goongery.drawWinningNumbers().then((tx) => tx.wait())
      const info = await infoHolder.goongeryInfo(1)
      expect(info.status).to.be.eq(2)
    })

    it.only("should not be able to draw twice in the same round", async function () {
      const { openingTimestamp, closingTimestamp } = await createNewRound(
        goongery
      )

      const numberOfTickets = 2
      const numbers = [1, 2, 3]
      const buyOption = 0

      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)
      await goongery
        .buy(numberOfTickets, numbers, buyOption)
        .then((tx) => tx.wait())

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness: 10000 })
      await expect(goongery.drawWinningNumbers()).to.be.revertedWith(
        "Already drawn"
      )
    })
  })

  describe("drawWinningNumbersCallback", async function () {
    it("should set winner numbers correctly given valid params", async function () {
      const { openingTimestamp, closingTimestamp, maxNumber } =
        await createNewRound(goongery)

      const numberOfTickets = 2
      const numbers = [1, 2, 3]
      const buyOption = 0

      await enterBuyingPhase(openingTimestamp)
      await approveTokens([goong], goongery.address)

      await goongery
        .buy(numberOfTickets, numbers, buyOption)
        .then((tx) => tx.wait())

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      const randomness = 10000
      await drawWinningNumbers(goongery, { randomness })

      const winningNumbers = await infoHolder.getWinningNumbers(1)
      const info = await infoHolder.goongeryInfo(1)
      expect(winningNumbers).to.be.eql(
        calculateWinningNumbers(randomness, maxNumber)
      )
      expect(info.status).to.be.eq(3)
    })
  })

  describe("claimReward", async function () {
    let numberOfTickets = 1
    let openingTimestamp,
      closingTimestamp,
      maxNumber,
      burnPercentage,
      allocation
    const randomness = ethers.BigNumber.from(ethers.utils.randomBytes(32))
    let _winningNumbers
    let owner
    beforeEach(async () => {
      const signers = await ethers.getSigners()
      owner = signers[0]
      const args = await createNewRound(goongery)
      allocation = args.allocation
      openingTimestamp = args.openingTimestamp
      closingTimestamp = args.closingTimestamp
      maxNumber = args.maxNumber
      burnPercentage = args.burnPercentage
      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)
      _winningNumbers = calculateWinningNumbers(randomness, maxNumber)
    })

    it("should receive 60% of total goong, given exact 3 digits ticket and all tickets win", async function () {
      const buyOption = 0

      const initialBalance = await goong.balanceOf(owner.address)
      const totalTicketCost =
        ethers.BigNumber.from(numberOfTickets).mul(goongPerTicket)

      await goongery
        .buy(numberOfTickets, _winningNumbers, buyOption)
        .then((tx) => tx.wait())

      const nftId = await infoHolder.userInfo(owner.address, 0)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const reward = totalTicketCost
        .mul(10000 - burnPercentage)
        .div(10000)
        .mul(allocation[0])
        .div(10000)

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

      const nftId = await infoHolder.userInfo(owner.address, 0)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const ownerReward = totalOwnerTicketCost
        .add(totalAliceTicketCost)
        .mul(totalOwnerTicketCost)
        .div(totalOwnerTicketCost.add(totalAliceTicketCost))
        .mul(10000 - burnPercentage)
        .div(10000)
        .mul(allocation[0])
        .div(10000)

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
        .buy(
          numberOfTickets,
          [_winningNumbers[0], _winningNumbers[2], _winningNumbers[1]],
          buyOption
        )
        .then((tx) => tx.wait())

      const nftId = await infoHolder.userInfo(owner.address, 0)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const reward = totalTicketCost
        .mul(10000 - burnPercentage)
        .div(10000)
        .mul(allocation[1])
        .div(10000)

      await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost).add(reward)).to.be.eq(
        balanceAfterClaimedReward
      )
    })

    it("should receive 1/6 of 20% of total goong each, given 6 addresses bought numbers which permutably matched with the winning numbers", async function () {
      const buyOption = 1
      const signers = await ethers.getSigners()

      const permutablyNumbers = [
        [_winningNumbers[0], _winningNumbers[1], _winningNumbers[2]],
        [_winningNumbers[0], _winningNumbers[2], _winningNumbers[1]],
        [_winningNumbers[1], _winningNumbers[0], _winningNumbers[2]],
        [_winningNumbers[1], _winningNumbers[2], _winningNumbers[0]],
        [_winningNumbers[2], _winningNumbers[0], _winningNumbers[1]],
        [_winningNumbers[2], _winningNumbers[1], _winningNumbers[0]],

        // doesn't match winning numbers
        [_winningNumbers[2], _winningNumbers[2], _winningNumbers[2]]
      ]

      const ticketCost =
        ethers.BigNumber.from(numberOfTickets).mul(goongPerTicket)

      for (let i = 0; i < permutablyNumbers.length; i++) {
        await goong.transfer(signers[i + 1].address, goongPerTicket)
        await approveTokens([goong.connect(signers[i + 1])], goongery.address)
        await goongery
          .connect(signers[i + 1])
          .buy(numberOfTickets, permutablyNumbers[i], buyOption)
          .then((tx) => tx.wait())
      }

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const reward = ticketCost
        .mul(permutablyNumbers.length)
        .mul(10000 - burnPercentage)
        .div(10000)
        .mul(allocation[1])
        .div(10000)
        .div(permutablyNumbers.length - 1)

      for (let i = 0; i < permutablyNumbers.length; i++) {
        const nftId = await infoHolder.userInfo(signers[i + 1].address, 0)
        await goongery
          .connect(signers[i + 1])
          .claimReward(1, nftId)
          .then((tx) => tx.wait())

        const balanceAfterClaimedReward = await goong.balanceOf(
          signers[i + 1].address
        )
        if (i < permutablyNumbers.length - 1) {
          expect(balanceAfterClaimedReward).to.be.eq(reward)
        } else {
          // numbers bought does't match
          expect(balanceAfterClaimedReward).to.be.eq(0)
        }
      }
    })

    it("should receive 10% of total goong, given there's only one ticket won last 2 digits prize", async function () {
      const buyOption = 2

      const initialBalance = await goong.balanceOf(owner.address)
      const totalTicketCost =
        ethers.BigNumber.from(numberOfTickets).mul(goongPerTicket)

      await goongery
        .buy(
          numberOfTickets,
          [255, _winningNumbers[1], _winningNumbers[2]],
          buyOption
        )
        .then((tx) => tx.wait())

      const nftId = await infoHolder.userInfo(owner.address, 0)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const reward = totalTicketCost
        .mul(allocation[2])
        .div(10000)
        .mul(10000 - burnPercentage)
        .div(10000)

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
          [255, _winningNumbers[1], _winningNumbers[2]],
          buyOption
        )
        .then((tx) => tx.wait())

      await goongery
        .buy(
          numberOfTickets,
          [255, _winningNumbers[1], _winningNumbers[2]],
          buyOption
        )
        .then((tx) => tx.wait())

      const nftId = await infoHolder.userInfo(owner.address, 0)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const totalGoongPrize = await infoHolder
        .getGoongeryInfo(1)
        .then((i) => i.totalGoongPrize)

      const reward = totalGoongPrize.mul(allocation[2]).div(10000).div(2)

      await goongery.claimReward(1, nftId).then((tx) => tx.wait())
      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost).add(reward)).to.be.eq(
        balanceAfterClaimedReward
      )
    })

    it("should receive 0 reward, given none of tickets bought matched and buy option is LastTwoDigits", async function () {
      const buyOption = 2

      const initialBalance = await goong.balanceOf(owner.address)
      let totalTicketCost = 0

      const txs = []
      for (let i = 0; i < 100; i++) {
        const numbers = [255, parseInt(i / 10) % 10, i % 10]
        const matchedCount = _winningNumbers
          .slice(1)
          .filter((num, i) => numbers.indexOf(num) == i + 1).length
        if (matchedCount < 2) {
          const tx = goongery
            .buy(numberOfTickets, numbers, buyOption)
            .then((tx) => tx.wait())
          txs.push(tx)
          totalTicketCost = ethers.BigNumber.from(numberOfTickets)
            .mul(goongPerTicket)
            .add(totalTicketCost)
        }
      }
      await Promise.all(txs)

      const nftIds = await infoHolder.getUserTokenIdsByRound(owner.address, 1)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const claimTxs = []
      for (id of nftIds) {
        claimTxs.push(goongery.claimReward(1, id).then((tx) => tx.wait()))
      }
      await Promise.all(claimTxs)

      const balanceAfterClaimedReward = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(totalTicketCost)).to.be.eq(
        balanceAfterClaimedReward
      )
    })
  })

  describe("batchClaimReward", async function () {
    let numberOfTickets = 1
    let openingTimestamp,
      closingTimestamp,
      maxNumber,
      burnPercentage,
      allocation
    const randomness = ethers.BigNumber.from(ethers.utils.randomBytes(32))
    let _winningNumbers
    let owner, signers
    beforeEach(async () => {
      signers = await ethers.getSigners()
      owner = signers[0]
      const args = await createNewRound(goongery)
      openingTimestamp = args.openingTimestamp
      closingTimestamp = args.closingTimestamp
      allocation = args.allocation
      burnPercentage = args.burnPercentage
      maxNumber = args.maxNumber
      await approveTokens([goong], goongery.address)
      await enterBuyingPhase(openingTimestamp)
      _winningNumbers = calculateWinningNumbers(randomness, maxNumber)
    })

    it("should claim reward from all tickets", async function () {
      const buyOption = 1
      const roundNumber = 1

      const permutablyNumbers = [
        [_winningNumbers[0], _winningNumbers[1], _winningNumbers[2]],
        [_winningNumbers[0], _winningNumbers[2], _winningNumbers[1]],
        [_winningNumbers[1], _winningNumbers[0], _winningNumbers[2]],
        [_winningNumbers[1], _winningNumbers[2], _winningNumbers[0]],
        [_winningNumbers[2], _winningNumbers[0], _winningNumbers[1]],
        [_winningNumbers[2], _winningNumbers[1], _winningNumbers[0]]
      ]

      const initialBalance = await goong.balanceOf(owner.address)

      for (let numbers of permutablyNumbers) {
        await goongery.buy(numberOfTickets, numbers, buyOption)
      }

      const buyingCost = goongPerTicket
        .mul(numberOfTickets)
        .mul(permutablyNumbers.length)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const nftIds = await infoHolder.getUserTokenIdsByRound(
        owner.address,
        roundNumber
      )

      const reward = buyingCost
        .mul(allocation[1])
        .div(10000)
        .mul(10000 - burnPercentage)
        .div(10000)

      await goongery.batchClaimReward(nftIds).then((tx) => tx.wait())

      const balance = await goong.balanceOf(owner.address)
      expect(initialBalance.sub(buyingCost).add(reward)).to.be.eq(balance)
    })

    it("should reverted: `Caller must own nft` given caller doesn not own nft", async function () {
      const buyOption = 1
      const roundNumber = 1

      const numbers = _winningNumbers
      await goongery.buy(numberOfTickets, numbers, buyOption)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const nftIds = await infoHolder.getUserTokenIdsByRound(
        owner.address,
        roundNumber
      )

      await expect(
        goongery.connect(signers[1]).batchClaimReward(nftIds)
      ).to.be.revertedWith(`Caller must own nft`)
    })

    it("should reverted: `Nft is already claimed` given caller already claimed nft", async function () {
      const buyOption = 1
      const roundNumber = 1

      const numbers = _winningNumbers
      await goongery.buy(numberOfTickets, numbers, buyOption)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)
      await drawWinningNumbers(goongery, { randomness })

      const nftIds = await infoHolder.getUserTokenIdsByRound(
        owner.address,
        roundNumber
      )

      await goongery.batchClaimReward(nftIds)

      await expect(goongery.batchClaimReward(nftIds)).to.be.revertedWith(
        `Nft is already claimed`
      )
    })

    it("should reverted: `Winning numbers are not chosen yet` given corresponding round for nft haven't drawn winning numbers yet", async function () {
      const buyOption = 1
      const roundNumber = 1

      const numbers = _winningNumbers
      await goongery.buy(numberOfTickets, numbers, buyOption)

      await enterDrawingPhase(openingTimestamp, closingTimestamp)

      const nftIds = await infoHolder.getUserTokenIdsByRound(
        owner.address,
        roundNumber
      )

      await expect(goongery.batchClaimReward(nftIds)).to.be.revertedWith(
        `Winning numbers are not chosen yet`
      )
    })
  })
})
