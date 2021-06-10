const { expect } = require("chai")
const { ethers } = require("hardhat")
const chalk = require("chalk")
const { setupTests } = require("./setup")
const { mine, currentBlockNumber } = require("./libs/rpc")
const { balanceOfLP, getLPAddress } = require("./libs/pair")
const { log } = require("./libs/utils")
const {
  addLiquidity,
  addLiquidityETH,
  swapExactTokensForETH,
  getReserves,
  calculateSwapAmount,
  swapExactETHForTokens
} = require("./libs/router")
const { approveTokens } = require("./libs/token")

describe("MasterChefV3", function () {
  describe.skip("calculateGoongCoverFee with voucherRate: 10", async () => {
    let masterChef
    beforeEach(async () => {
      global.showLog = false
      await setupTests()
      const { goong, weth, busd } = global

      let [owner, feeAccount, alice] = await ethers.getSigners()

      const MasterChef = await ethers.getContractFactory("MasterChefV3")
      const currentBlock = await ethers.getDefaultProvider().getBlockNumber()
      const startBlock = currentBlock + 1
      const eggPerBlock = "1000000000000000000" // 1 EGG
      const constructorParams = [
        goong.address,
        owner.address,
        feeAccount.address,
        eggPerBlock,
        startBlock,
        weth.address,
        busd.address
      ]
      masterChef = await MasterChef.deploy(...constructorParams)
      await masterChef.deployed()
      log("Deployed MasterChefV3:", chalk.greenBright(masterChef.address))

      // 1. Set voucher rate
      await masterChef.setVoucherRate(10)

      // 2. Transfer goong ownership
      await goong.transferOwnership(masterChef.address)

      // 3. Send busd and goong from owner account to alice account
      const goongAmount = ethers.utils.parseEther("10000")
      const busdAmount = ethers.utils.parseEther("10000")
      await goong.transfer(alice.address, goongAmount)
      await busd.transfer(alice.address, busdAmount)
    })

    it("should return 0 when the deposit fee is 0%", async function () {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { goong, busd, pancakeRouter } = global
      const lpAddress = await getLPAddress(goong.address, busd.address)

      await addLiquidity(pancakeRouter, {
        tokenA: goong,
        tokenB: busd,
        tokenAmountA: ethers.utils.parseEther("100"),
        tokenAmountB: ethers.utils.parseEther("100"),
        senderAddress: alice.address
      })
      const aliceLPAmount = await balanceOfLP(goong, busd, alice.address)
      await masterChef.add(0, lpAddress, 0, false)
      const goongCoverFee = await masterChef.calculateGoongCoverFee(
        0,
        aliceLPAmount
      )
      expect(goongCoverFee).to.be.eq("0")
    })

    it("should return 4000 GOONG given deposit fee is 2% and 10000 GOONG / 10000 BUSD LP", async function () {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { goong, busd, pancakeRouter } = global
      const lpAddress = await getLPAddress(goong.address, busd.address)
      await addLiquidity(pancakeRouter, {
        tokenA: goong,
        tokenB: busd,
        tokenAmountA: ethers.utils.parseEther("10000"),
        tokenAmountB: ethers.utils.parseEther("10000"),
        senderAddress: alice.address
      })
      const aliceLPAmount = await balanceOfLP(goong, busd, alice.address)
      await masterChef.add(0, lpAddress, 200, false)
      const goongCoverFee = await masterChef.calculateGoongCoverFee(
        0,
        aliceLPAmount
      )
      expect(goongCoverFee).to.be.eq(ethers.utils.parseEther("4000"))
    })

    it("should return 1000 GOONG given deposit fee is 1% and 5 ETH / 5000 BUSD LP", async function () {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { weth, busd, goong } = global
      const lpAddress = await getLPAddress(weth.address, busd.address)
      await addLiquidityETH(global.pancakeRouter, {
        token: busd,
        tokenAmount: ethers.utils.parseEther("5000"),
        ethAmount: ethers.utils.parseEther("5"),
        senderAddress: alice.address
      })
      const aliceLPAmount = await balanceOfLP(weth, busd, alice.address)
      await masterChef.add(0, lpAddress, 100, false)
      const goongCoverFee = await masterChef.calculateGoongCoverFee(
        0,
        aliceLPAmount
      )
      expect(
        goongCoverFee.div(ethers.utils.parseEther("1")).toNumber()
      ).closeTo(1000, 1)
    })

    it("should return 800 GOONG given deposit fee is 2% and 2 ETH / 2000 GOONG LP", async function () {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { weth, goong } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await addLiquidityETH(global.pancakeRouter, {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await masterChef.add(0, lpAddress, 200, false)
      const goongCoverFee = await masterChef.calculateGoongCoverFee(
        0,
        aliceLPAmount
      )
      expect(
        goongCoverFee.div(ethers.utils.parseEther("1")).toNumber()
      ).closeTo(800, 1)
    })
  })

  describe.skip("depositWithoutFee", async () => {
    let masterChef
    beforeEach(async () => {
      global.showLog = false
      await setupTests()
      const { goong, weth, busd } = global

      let [owner, feeAccount, alice] = await ethers.getSigners()

      const MasterChef = await ethers.getContractFactory("MasterChefV3")
      const currentBlock = await ethers.getDefaultProvider().getBlockNumber()
      const startBlock = currentBlock + 1
      const eggPerBlock = "1000000000000000000" // 1 EGG
      const constructorParams = [
        goong.address,
        owner.address,
        feeAccount.address,
        eggPerBlock,
        startBlock,
        weth.address,
        busd.address
      ]
      masterChef = await MasterChef.deploy(...constructorParams)
      await masterChef.deployed()
      log("Deployed MasterChefV3:", chalk.greenBright(masterChef.address))

      // 1. Set voucher rate
      await masterChef.setVoucherRate(10)

      // 2. Transfer goong ownership
      await goong.transferOwnership(masterChef.address)

      // 3. Send busd and goong from owner account to alice account
      const goongAmount = ethers.utils.parseEther("10000")
      const busdAmount = ethers.utils.parseEther("10000")
      await goong.transfer(alice.address, goongAmount)
      await busd.transfer(alice.address, busdAmount)
    })

    it("should transfer 800 goong to masterchef contract when deposit 2 ETH / 2000 GOONG", async () => {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(global.pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)

      const { amount: beforeStakedLP } = await masterChef.userInfo(
        0,
        alice.address
      )
      expect(beforeStakedLP).to.be.eq("0")

      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )
      await masterChef.add(0, lpAddress, 200, false)
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      const goongInMasterChef = await goong.balanceOf(masterChef.address)
      const denom = ethers.utils.parseEther("1")

      // Validate goong is transferred to the masterchef contract
      expect(goongInMasterChef.div(denom).toNumber()).to.be.closeTo(800, 1)

      // Validate voucherInfo variable is updated its value correctly
      const voucher = await masterChef.voucherInfo(0, alice.address)
      expect(voucher.div(denom).toNumber()).to.be.closeTo(800, 1)

      // Validate stakedLP didn't get fee deduction.
      const { amount: stakedLP } = await masterChef.userInfo(0, alice.address)
      expect(stakedLP).to.be.eq(aliceLPAmount)
    })

    it("should transfer 800 goong to masterchef contract when deposit 1 ETH / 1000 GOONG twice", async () => {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)

      const { amount: beforeStakedLP } = await masterChef.userInfo(
        0,
        alice.address
      )
      expect(beforeStakedLP).to.be.eq("0")

      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )
      await masterChef.add(0, lpAddress, 200, false)
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)

      // Deposit half of LP
      await masterChef
        .connect(alice)
        .depositWithoutFee(0, aliceLPAmount.div("2"))

      // Deposit the rest of LP
      await masterChef
        .connect(alice)
        .depositWithoutFee(0, aliceLPAmount.div("2"))

      // Validate goong is transferred to the masterchef contract
      const goongInMasterChef = await goong.balanceOf(masterChef.address)
      const denom = ethers.utils.parseEther("1")
      expect(goongInMasterChef.div(denom).toNumber()).to.be.closeTo(800, 1)

      // Validate voucherInfo variable is updated its value correctly
      const voucher = await masterChef.voucherInfo(0, alice.address)
      expect(voucher.div(denom).toNumber()).to.be.closeTo(800, 1)

      // Validate stakedLP didn't get fee deduction.
      const { amount: stakedLP } = await masterChef.userInfo(0, alice.address)
      expect(stakedLP).to.be.closeTo(aliceLPAmount, 1)
    })

    it("should transfer 1600 goong to masterchef contract when deposit 2 ETH / 4000 GOONG and goong price is 0.5$", async () => {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { weth, goong, busd, pancakeRouter } = global

      // Approve busd and goong to router contract
      await approveTokens(
        [busd.connect(alice), goong.connect(alice)],
        pancakeRouter.address
      )

      // Swap goong until price drop from 1$ to 0.5$
      const [reserveA, reserveB] = await getReserves(goong, weth)
      const targetPrice = reserveA.div(reserveB).mul(2)
      const amountToken = await calculateSwapAmount(goong, weth, targetPrice)
      await swapExactTokensForETH(pancakeRouter.connect(alice), {
        amountToken,
        path: [goong.address, weth.address],
        to: alice.address
      })

      await addLiquidityETH(pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("4000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })

      // Approve goong and lp to masterchef contract
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const lpAddress = await getLPAddress(weth.address, goong.address)
      const pair = PancakePair.attach(lpAddress)
      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )

      // add pool weth/goong
      await masterChef.add(0, lpAddress, 200, false)

      // Deposit without fee
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)

      // Validate goong is transferred to the masterchef contract
      const goongInMasterChef = await goong.balanceOf(masterChef.address)
      const denom = ethers.utils.parseEther("1")
      expect(goongInMasterChef.div(denom).toNumber()).to.be.closeTo(1600, 1)

      // Validate voucherInfo variable is updated its value correctly
      const voucher = await masterChef.voucherInfo(0, alice.address)
      expect(voucher.div(denom).toNumber()).to.be.closeTo(1600, 1)

      // Validate stakedLP didn't get fee deduction.
      const { amount: stakedLP } = await masterChef.userInfo(0, alice.address)
      expect(stakedLP).to.be.closeTo(aliceLPAmount, 1)
    })

    it("should reverted: `transfer amount exceeds allowance` when goong is not approved", async () => {
      const [_owner, _dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      await masterChef.add(0, lpAddress, 200, false)
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await expect(
        masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      ).to.be.revertedWith("transfer amount exceeds allowance")
    })

    it("should reverted: `transfer amount exceeds balance` when goong is not enough", async () => {
      const [_owner, dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      await masterChef.add(0, lpAddress, 200, false)

      // Approve goong and LP to masterchef contract
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)
      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )

      // Get LP balance
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)

      // Transfer all goong to another account
      const balanceGoong = await goong.balanceOf(alice.address)
      await goong.connect(alice).transfer(dev.address, balanceGoong)

      // Validate transaction reverted because balance isn't enough
      await expect(
        masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      ).to.be.revertedWith("transfer amount exceeds balance")
    })

    it("should reverted: `voucherRate must be set` voucherRate is 0", async () => {
      const [_owner, dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      await masterChef.add(0, lpAddress, 200, false)

      // Approve goong and LP to masterchef contract
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)
      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )

      // Set voucherRate to zero
      await masterChef.setVoucherRate(0)

      // Get LP balance
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)

      // Validate transaction reverted because balance isn't enough
      await expect(
        masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      ).to.be.revertedWith("voucherRate must be set")
    })

    it("should reverted: `caller must be EOA` when sender is a contract address", async () => {
      const [_owner, dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      await masterChef.add(0, lpAddress, 200, false)

      // Approve goong and LP to masterchef contract
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)
      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )

      const MasterChefCaller = await ethers.getContractFactory(
        "MasterChefCaller"
      )
      const masterChefCaller = await MasterChefCaller.deploy()
      await masterChefCaller.deployed()

      const lpAmount = await pair.balanceOf(alice.address)
      await expect(
        masterChefCaller.depositWithoutFee(masterChef.address, 0, lpAmount)
      ).to.be.revertedWith("caller must be EOA")
    })
  })

  describe.skip("withdraw", async () => {
    let masterChef
    beforeEach(async () => {
      global.showLog = false
      await setupTests()
      const { goong, weth, busd } = global

      let [owner, feeAccount, alice] = await ethers.getSigners()

      const MasterChef = await ethers.getContractFactory("MasterChefV3")
      const currentBlock = await ethers.getDefaultProvider().getBlockNumber()
      const startBlock = currentBlock + 1
      const eggPerBlock = "1000000000000000000" // 1 EGG
      const constructorParams = [
        goong.address,
        owner.address,
        feeAccount.address,
        eggPerBlock,
        startBlock,
        weth.address,
        busd.address
      ]
      masterChef = await MasterChef.deploy(...constructorParams)
      await masterChef.deployed()
      log("Deployed MasterChefV3:", chalk.greenBright(masterChef.address))

      // 1. Set voucher rate
      await masterChef.setVoucherRate(10)

      // 2. Transfer goong ownership
      await goong.transferOwnership(masterChef.address)

      // 3. Send busd and goong from owner account to alice account
      const goongAmount = ethers.utils.parseEther("10000")
      const busdAmount = ethers.utils.parseEther("10000")
      await goong.transfer(alice.address, goongAmount)
      await busd.transfer(alice.address, busdAmount)
    })

    it("should get all goong back when withdraw all even someone swapped goong", async () => {
      const [_owner, dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(global.pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)

      const { amount: beforeStakedLP } = await masterChef.userInfo(
        0,
        alice.address
      )
      expect(beforeStakedLP).to.be.eq("0")

      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )
      await masterChef.add(0, lpAddress, 200, false)
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      const goongInMasterChef = await goong.balanceOf(masterChef.address)

      await swapExactETHForTokens(pancakeRouter.connect(alice), {
        amountEth: ethers.utils.parseEther("2"),
        path: [weth.address, goong.address],
        to: alice.address
      })

      await goong
        .connect(alice)
        .transfer(dev.address, await goong.balanceOf(alice.address))

      const pendingGoong = await masterChef.pendingEgg(0, alice.address)

      await masterChef.connect(alice).withdraw(0, aliceLPAmount)
      const goongInWallet = await goong.balanceOf(alice.address)
      expect(goongInWallet).to.be.eq(goongInMasterChef.add(pendingGoong), 1)

      const voucher = await masterChef.voucherInfo(0, alice.address)
      expect(voucher).to.be.eq(0)
    })

    it("should get half of locked goong back after withdraw half of LP", async () => {
      const [_owner, dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(global.pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)

      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )
      await masterChef.add(0, lpAddress, 200, false)
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      const goongInMasterChef = await goong.balanceOf(masterChef.address)
      expect(goongInMasterChef).to.be.closeTo(
        ethers.utils.parseEther("800"),
        10000
      )

      await goong
        .connect(alice)
        .transfer(dev.address, await goong.balanceOf(alice.address))

      await masterChef.connect(alice).withdraw(0, aliceLPAmount.div(2))
      const voucher = await masterChef.voucherInfo(0, alice.address)
      const goongInWallet = await goong.balanceOf(alice.address)
      expect(goongInWallet).to.be.closeTo(ethers.utils.parseEther("400"), 10000)
      expect(voucher).to.be.closeTo(ethers.utils.parseEther("400"), 10000)

      await masterChef.connect(alice).withdraw(0, aliceLPAmount.div(2))
      const voucherLeft = await masterChef.voucherInfo(0, alice.address)
      const goongInWalletLeft = await goong.balanceOf(alice.address)
      expect(goongInWalletLeft).to.be.closeTo(
        ethers.utils.parseEther("800"),
        10000
      )
      expect(voucherLeft).to.be.closeTo(ethers.BigNumber.from("0"), 10000)
    })
  })

  describe("updatePool", async function () {
    let masterChef
    beforeEach(async () => {
      global.showLog = false
      await setupTests()
      const { goong, weth, busd } = global

      let [owner, feeAccount, alice] = await ethers.getSigners()

      const MasterChef = await ethers.getContractFactory("MasterChefV3")
      const currentBlock = await currentBlockNumber()
      const startBlock = currentBlock + 1
      const eggPerBlock = ethers.utils.parseEther("1000000") // 1M goong per block
      const constructorParams = [
        goong.address,
        owner.address,
        feeAccount.address,
        eggPerBlock,
        startBlock,
        weth.address,
        busd.address
      ]
      masterChef = await MasterChef.deploy(...constructorParams)
      await masterChef.deployed()
      log("Deployed MasterChefV3:", chalk.greenBright(masterChef.address))

      // 1. Set voucher rate
      await masterChef.setVoucherRate(10)

      // 2. Transfer goong ownership
      await goong.transferOwnership(masterChef.address)

      // 3. Send busd and goong from owner account to alice account
      const goongAmount = ethers.utils.parseEther("10000")
      const busdAmount = ethers.utils.parseEther("10000")
      await goong.transfer(alice.address, goongAmount)
      await busd.transfer(alice.address, busdAmount)
    })

    it("should mint goong if reward <= max supply - total supply", async function () {
      const [_owner, dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(global.pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)

      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )
      await masterChef.add(1, lpAddress, 200, false)
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      const initialSupply = await goong.totalSupply()
      await mine(10)
      await masterChef.updatePool(0)
      const totalSupply = await goong.totalSupply()
      expect(totalSupply).to.be.gt(initialSupply)
    })

    it("should not mint goong if reward > max supply - total supply", async function () {
      const [_owner, dev, alice] = await ethers.getSigners()
      const { weth, goong, pancakeRouter } = global
      const lpAddress = await getLPAddress(weth.address, goong.address)
      await approveTokens([goong.connect(alice)], pancakeRouter.address)
      await addLiquidityETH(global.pancakeRouter.connect(alice), {
        token: goong,
        tokenAmount: ethers.utils.parseEther("2000"),
        ethAmount: ethers.utils.parseEther("2"),
        senderAddress: alice.address
      })
      const PancakePair = await ethers.getContractFactory("PancakePair")
      const pair = PancakePair.attach(lpAddress)

      await approveTokens(
        [goong.connect(alice), pair.connect(alice)],
        masterChef.address
      )
      await masterChef.add(1, lpAddress, 200, false)
      const aliceLPAmount = await balanceOfLP(weth, goong, alice.address)
      await masterChef.connect(alice).depositWithoutFee(0, aliceLPAmount)
      const initialSupply = await goong.totalSupply()
      await mine(90)
      await masterChef.updatePool(0)
      const totalSupply = await goong.totalSupply()
      expect(totalSupply).to.be.eq(initialSupply)
    })
  })
})
