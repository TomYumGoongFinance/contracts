# Production Deployment Guide

## Preparation

1. Config `VESTING_START_DATE` (Required for step 1)
2. Config `MASTERCHEF_START_BLOCK` (Required for step 1)
3. Config `VESTING_ADDRESS` (Required for step 2)
4. Config `DEV_ADDRESS` (Required for step 3)
5. Config `FEE_ADDRESS` (Required for step 3)
6. Config `WBNB`, `BUSD`, `GOONG`, and related tokens for 12 pools. (Required for step 3)
7. Config `PANCAKE_ROUTER_ADDRESS`, `PANCAKE_FACTORY_ADDRESS`, and `INIT_CODE_PAIR_HASH` (Required for step 3)
8. Config `TIMELOCK_ADDRESS` (Required for step 3)
9. Config `MASTERCHEF_ADDRESS` (Required for step 3)
10. Config `ECOSYSTEM_ADDRESS` (Required for step 4)
11. Config `DEV_1_ADDRESS` (Required for step 4)
12. Config `DEV_2_ADDRESS` (Required for step 4)
13. Config `BURN_ADDRESS` (Required for step 4)

## 1. Deploy all contracts

Run `npm run deploy mainnet`.

These four contracts will be deployed:

- Goong
- MasterChef
- Vesting
- Timelock

Copy all contract addresses to `scripts/libs/config.js`

## 2. Setup Goong Contract

Run `npm run goong mainnet`

The script will send the following transactions to goong contract:

1. Mint 30M Goong
2. Transfer ownership to MasterChefV3 contract
3. Approve Goong to Vesting contract

## 3. Setup MasterChefV3 Contract

Run `npm run verify mainnet` to check every configs are setup correctly.

If everything looks ok, then, runs `npm run masterchef mainnet`

The script will send the following transactions to masterchef contract:

1. Add 12 pools (see: https://docs.tomyumgoong.finance/tomyumgoong/farm)
2. Set `voucherRate` = 2
3. Set `eggPerBlock` = 100
4. Transfer ownership to Timelock contract

## 4. Setup Vesting Contract

Run `npm run vesting mainnet`

The script will send the following transactions to vesting contract:

1. Vested 1M Goong for `DEV_1_ADDRRESS` 180 days.
2. Vested 1M Goong for `DEV_2_ADDRRESS` 180 days.
3. Vested 7.99M Goong for `ECOSYSTEM_ADDRESS` 180 days.
4. Vested 18M Goong for `BURN_ADDRESS` 180 days.
