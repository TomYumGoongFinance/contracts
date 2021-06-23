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

describe.skip("GoongIllusion", function () {
  let fakeGoong1, fakeGoong2, goong, weth
  let pancakeRouter
  let goongIllusion
  beforeEach(async () => {
    let [owner] = await ethers.getSigners()
    const WETH = await ethers.getContractFactory("WETH")
    const PancakeFactory = await ethers.getContractFactory("PancakeFactory")
    const PancakeRouterV2 = await ethers.getContractFactory("PancakeRouter")
    const GOONG = await ethers.getContractFactory("GoongToken")
    const GoongIllusion = await ethers.getContractFactory("GoongIllusion")

    weth = await WETH.deploy()
    const pancakeFactory = await PancakeFactory.deploy(owner.address)
    await weth.deployed()
    pancakeRouter = await PancakeRouterV2.deploy(
      pancakeFactory.address,
      weth.address
    )
    await pancakeRouter.deployed()
    global.pancakeFactory = pancakeFactory

    goong = await GOONG.deploy()
    fakeGoong1 = await GOONG.deploy()
    fakeGoong2 = await GOONG.deploy()

    goongIllusion = await GoongIllusion.deploy(pancakeRouter.address)

    await goongIllusion.deployed()

    await goong["mint(uint256)"](ethers.utils.parseEther("1000000"))
    await fakeGoong1["mint(uint256)"](ethers.utils.parseEther("1000000"))
    await fakeGoong2["mint(uint256)"](ethers.utils.parseEther("1000000"))
  })

  describe("tripleLiquidity", async function () {
    it("should add 3 liquidity and sent lp back to the sender", async () => {
      let [owner] = await ethers.getSigners()
      await approveTokens(
        [goong, fakeGoong1, fakeGoong2],
        goongIllusion.address
      )

      await goongIllusion.tripleLiquidity(
        goong.address,
        fakeGoong1.address,
        fakeGoong2.address,
        {
          value: ethers.utils.parseEther("9")
        }
      )

      const goongBnb = await balanceOfLP(goong, weth, owner.address)
      const [reserveGoong, reserveBnb] = await getReserves(goong, weth)

      expect(goongBnb).to.be.gt("0")
      expect(reserveGoong).to.be.eq(ethers.utils.parseEther("10000"))
      expect(reserveBnb).to.be.eq(ethers.utils.parseEther("3"))

      const fakeGoong1Bnb = await balanceOfLP(fakeGoong1, weth, owner.address)
      const [reserveFakeGoong1, reserveBnb1] = await getReserves(
        fakeGoong1,
        weth
      )
      expect(fakeGoong1Bnb).to.be.gt("0")
      expect(reserveFakeGoong1).to.be.eq(ethers.utils.parseEther("10000"))
      expect(reserveBnb1).to.be.eq(ethers.utils.parseEther("3"))

      const fakeGoong2Bnb = await balanceOfLP(goong, weth, owner.address)
      const [reserveFakeGoong2, reserveBnb2] = await getReserves(
        fakeGoong2,
        weth
      )
      expect(fakeGoong2Bnb).to.be.gt("0")
      expect(reserveFakeGoong2).to.be.eq(ethers.utils.parseEther("10000"))
      expect(reserveBnb2).to.be.eq(ethers.utils.parseEther("3"))
    })

    it("should add 3 liquidity, given the LP is already existed and get dust bnb back", async () => {
      let [owner] = await ethers.getSigners()

      await approveTokens([goong], pancakeRouter.address)

      await addLiquidityETH(pancakeRouter, {
        token: goong,
        tokenAmount: ethers.utils.parseEther("10"),
        senderAddress: owner.address,
        ethAmount: ethers.utils.parseEther("0.002")
      })

      await approveTokens(
        [goong, fakeGoong1, fakeGoong2],
        goongIllusion.address
      )

      await goongIllusion.tripleLiquidity(
        goong.address,
        fakeGoong1.address,
        fakeGoong2.address,
        {
          value: ethers.utils.parseEther("9")
        }
      )

      const goongBnb = await balanceOfLP(goong, weth, owner.address)
      const [reserveGoong, reserveBnb] = await getReserves(goong, weth)

      expect(goongBnb).to.be.gt("0")
      expect(reserveGoong).to.be.eq(ethers.utils.parseEther("10010"))
      expect(reserveBnb).to.be.eq(ethers.utils.parseEther("2.002"))

      const fakeGoong1Bnb = await balanceOfLP(fakeGoong1, weth, owner.address)
      const [reserveFakeGoong1, reserveBnb1] = await getReserves(
        fakeGoong1,
        weth
      )
      expect(fakeGoong1Bnb).to.be.gt("0")
      expect(reserveFakeGoong1).to.be.eq(ethers.utils.parseEther("10000"))
      expect(reserveBnb1).to.be.eq(ethers.utils.parseEther("3"))

      const fakeGoong2Bnb = await balanceOfLP(goong, weth, owner.address)
      const [reserveFakeGoong2, reserveBnb2] = await getReserves(
        fakeGoong2,
        weth
      )
      expect(fakeGoong2Bnb).to.be.gt("0")
      expect(reserveFakeGoong2).to.be.eq(ethers.utils.parseEther("10000"))
      expect(reserveBnb2).to.be.eq(ethers.utils.parseEther("3"))
    })
  })
})
