# TomYumGoong Finance

https://tomyumgoong-testnet.et.r.appspot.com/ Feel free to read the code. More details coming soon.

## Deployed Contracts / Hash

### Bsc Mainnet

- Pancake Factory: `0xca143ce32fe78f1f7019d7d551a6402fc5350c73`
- Pancake Router: `0x10ED43C718714eb63d5aA57B78B54704E256024E`
- GoongToken: `0x2afAB709fEAC97e2263BEd78d94aC2951705dB50`
- MasterChef: `0xdee8271179DCFB82e488c46060f022C48E61F327`
- Timelock: `0x0b38D64b22D3c968A3aE26B4C3C56dE3d5699831`

### Bsc Testnet

- Pancake Factory: `0x6725F303b657a9451d8BA641348b6761A6CC7a17`
- Pancake Router: `0xD99D1c33F9fC3444f8101754aBC46c52416550D1`
- GoongToken: `0x480aa0d8475e138318a03f65387585e936a7d4ec`
- MasterChef: `0x4e5e015d3463b7c23e8638aa8ad7c5b8fd15479f`
- Timelock: `0x353a40551e1629bcd88140042ad2bd5d9747e6ec`
- Busd: `0xf74C427EC673497b84Fd6FD0800264FDaf6A2Ff4`
- Goongery: `0x49a6Da9683fda220c381cba49D3D8733Ae36ada9`
- Goongery Random Generator: `0x307cb563645bC69c1c71aB50ED9288F042d3D556`
- Goongery NFT: `0xbd65C6832984ed1a2629616d98180d40891Bfd5D`
- Goongery Helper: `0x96229c4BfAA55BEF6fc37342E3eE1CC097c4f51e`
- Goongery Info Holder: `0xc21052614fbd73113F0393127cB210c6c4DD977C`
- Fake Goongery Random Generator: `0x900458a4ca0e2aEFD9700C72dBFadD034c7585E1`

## Resources

- LINK faucet on BSC Testnet: https://linkfaucet.protofire.io/bsctest

## Test fake winning numbers

1. Go to https://testnet.bscscan.com/address/0x900458a4ca0e2aEFD9700C72dBFadD034c7585E1#writeContract
2. Call `fakeFulfillRandomness` function, then fill argument inputs as following:
   - requestId: current round number
   - randomness: `20052259531957290227908846442226815729851806064811316307199808275164939572480`
3. The winning numbers will be `[1, 2, 3]`
