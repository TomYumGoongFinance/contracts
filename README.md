# TomYumGoong Finance

https://tomyumgoong-testnet.et.r.appspot.com/ Feel free to read the code. More details coming soon.

## Installation

Run `npm install`

## Run deploy script

- Edit `scripts/libs/config.js`
- Edit `secrets.json`

Example of `secrets.json`:

```
{
  "privateKey": "DEPLOYER_PRIVATE_KEY",
  "apiKey": "BSCSCAN_API_KEY"
}
```

> Note:
>
> - timelockAddress is required for running `scripts/timelock.js`
> - masterChefAddress is required for running `scripts/timelock.js` and `scripts/masterchef.js`

- `npm run deploy` (deploy goong, masterchef, multicall and timelock)

## Deployed Contracts / Hash

### Bsc Testnet

- Pancake Factory: https://testnet.bscscan.com/address/0x6725F303b657a9451d8BA641348b6761A6CC7a17
- Pancake Router: https://testnet.bscscan.com/address/0xD99D1c33F9fC3444f8101754aBC46c52416550D1
- GoongToken: https://testnet.bscscan.com/token/0x1890671a409bc4C2B9cEE1AD3fd904e25cC4332b
- MasterChef: https://testnet.bscscan.com/address/0xEE20E4c42F2099ECC0BcDB3DF0495d2cf546581a
- Timelock: https://testnet.bscscan.com/address/0xf1DfA9C0d039Dfb8bdA24974F402dA5263Cb92F3
- Busd: https://testnet.bscscan.com/address/0xf74C427EC673497b84Fd6FD0800264FDaf6A2Ff4
