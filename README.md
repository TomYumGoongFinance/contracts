# TomYumGoong Finance

Mainnet: https://tomyumgoong.finance
Testnet: https://testnet.tomyumgoong.finance

## Deployed Contracts / Hash

### Bsc Mainnet

- Pancake Factory: `0xca143ce32fe78f1f7019d7d551a6402fc5350c73`
- Pancake Router: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- GoongToken: `0x2afAB709fEAC97e2263BEd78d94aC2951705dB50`
- MasterChef: `0xdee8271179DCFB82e488c46060f022C48E61F327`
- Timelock: `0x0b38D64b22D3c968A3aE26B4C3C56dE3d5699831`
- Goongery: `0xBc4Ce051E2A0416eb01003F9b22A8095Ce74312f`
- Goongery Random Generator: `0x916e293BaB374D517A8F64D836Ec4c9Ec093D65E`
- Goongery NFT: `0xB437B572629Af65533ccfE58f1C701EbE33182D7`
- Goongery Helper: `0xe8DCcCebCc8a8C3dC51432A3D18b52DA5E3DfaC0`
- Goongery Info Holder: `0x5b02290A39eE67Bd9916Ed44E35CFED54B2F0c9c`

### Bsc Testnet

- Pancake Factory: `0x6725F303b657a9451d8BA641348b6761A6CC7a17`
- Pancake Router: `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`
- GoongToken: `0x480aa0d8475e138318a03f65387585e936a7d4ec`
- MasterChef: `0x4e5e015d3463b7c23e8638aa8ad7c5b8fd15479f`
- Timelock: `0x353a40551e1629bcd88140042ad2bd5d9747e6ec`
- Busd: `0xf74C427EC673497b84Fd6FD0800264FDaf6A2Ff4`
- Goongery: `0xDd91ab049082721670846cCB64cCc4DC5301C4e0`
- Goongery Random Generator: `0xA2A6CFae45DB245f7cb2695327C16628c6de7a47`
- Goongery NFT: `0x3294148DCCA55AD61413e7cB80B2a844F5c4db18`
- Goongery Helper: `0x7cB3c9f966f8e3EaaCee7F6D6dAB81EE38Ff97aD`
- Goongery Info Holder: `0xcdB395B5d1c0283E2Cd363693defA428c2753077`
- Fake Goongery Random Generator: `0xA2A6CFae45DB245f7cb2695327C16628c6de7a47`

## Resources

- LINK faucet on BSC Testnet: https://linkfaucet.protofire.io/bsctest
- LINK PegSwap: https://pegswap.chain.link/

## Test fake winning numbers

1. Go to https://testnet.bscscan.com/address/0x900458a4ca0e2aEFD9700C72dBFadD034c7585E1#writeContract
2. Call `fakeFulfillRandomness` function, then fill argument inputs as following:
   - requestId: current round number
   - randomness: `20052259531957290227908846442226815729851806064811316307199808275164939572480`
3. The winning numbers will be `[1, 2, 3]`
