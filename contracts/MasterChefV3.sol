// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libs/IBEP20.sol";
import "./libs/SafeBEP20.sol";
import {GoongToken} from "./GoongToken.sol";
import {IPancakePair} from "./libs/IPancakePair.sol";

interface IFactory {
    function getPair(address, address) external view returns (address);
}

// ████████╗░█████╗░███╗░░░███╗██╗░░░██╗██╗░░░██╗███╗░░░███╗░██████╗░░█████╗░░█████╗░███╗░░██╗░██████╗░
// ╚══██╔══╝██╔══██╗████╗░████║╚██╗░██╔╝██║░░░██║████╗░████║██╔════╝░██╔══██╗██╔══██╗████╗░██║██╔════╝░
// ░░░██║░░░██║░░██║██╔████╔██║░╚████╔╝░██║░░░██║██╔████╔██║██║░░██╗░██║░░██║██║░░██║██╔██╗██║██║░░██╗░
// ░░░██║░░░██║░░██║██║╚██╔╝██║░░╚██╔╝░░██║░░░██║██║╚██╔╝██║██║░░╚██╗██║░░██║██║░░██║██║╚████║██║░░╚██╗
// ░░░██║░░░╚█████╔╝██║░╚═╝░██║░░░██║░░░╚██████╔╝██║░╚═╝░██║╚██████╔╝╚█████╔╝╚█████╔╝██║░╚███║╚██████╔╝
// ░░░╚═╝░░░░╚════╝░╚═╝░░░░░╚═╝░░░╚═╝░░░░╚═════╝░╚═╝░░░░░╚═╝░╚═════╝░░╚════╝░░╚════╝░╚═╝░░╚══╝░╚═════╝░
//
//     ____________  \
//                 \ |
//                 / /
//      /=========== * ===
//     /=============-----
//    /=============\\
//   // |||| }}\\\\
//   |||
//    \\\
//     \\\

// Features:
// - User can deposit without fee by locked required $GOONG, depending on the deposit volume. Goong will be remained locked in the smart contract until unstaked.
contract MasterChefV3 is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of EGGs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accEggPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accEggPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. EGGs to distribute per block.
        uint256 lastRewardBlock; // Last block number that EGGs distribution occurs.
        uint256 accEggPerShare; // Accumulated EGGs per share, times 1e12. See below.
        uint16 depositFeeBP; // Deposit fee in basis points
    }

    address public bnb;
    address public busd;

    // The GOONG TOKEN!
    GoongToken public egg;
    // Dev address.
    address public devaddr;
    // GOONG tokens created per block.
    uint256 public eggPerBlock;

    // Bonus muliplier for early egg makers.
    uint256 public constant BONUS_MULTIPLIER = 1;
    // Max voucher rate allowed.
    uint256 public constant MAX_VOUCHER_RATE = 10;
    // Deposit Fee address
    address public feeAddress;
    // Multiplier rate from `PoolInfo.depositFeeBP` to deposit without fee
    uint256 public voucherRate = 0;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    // Info of user voucher that stakes LP tokens without fee.
    mapping(uint256 => mapping(address => uint256)) public voucherInfo;
    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when GOONG mining starts.
    uint256 public startBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );
    event SetFeeAddress(address indexed user, address indexed newAddress);
    event SetDevAddress(address indexed user, address indexed newAddress);
    event UpdateEmissionRate(address indexed user, uint256 goosePerBlock);

    constructor(
        GoongToken _egg,
        address _devaddr,
        address _feeAddress,
        uint256 _eggPerBlock,
        uint256 _startBlock,
        address _bnb,
        address _busd // bytes32 _initCodeHash
    ) public {
        egg = _egg;
        devaddr = _devaddr;
        feeAddress = _feeAddress;
        eggPerBlock = _eggPerBlock;
        startBlock = _startBlock;
        bnb = _bnb;
        busd = _busd;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    mapping(IBEP20 => bool) public poolExistence;
    modifier nonDuplicated(IBEP20 _lpToken) {
        require(poolExistence[_lpToken] == false, "nonDuplicated: duplicated");
        _;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function add(
        uint256 _allocPoint,
        IBEP20 _lpToken,
        uint16 _depositFeeBP,
        bool _withUpdate
    ) public onlyOwner nonDuplicated(_lpToken) {
        require(
            _depositFeeBP <= 10000,
            "add: invalid deposit fee basis points"
        );
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock =
            block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolExistence[_lpToken] = true;
        poolInfo.push(
            PoolInfo({
                lpToken: _lpToken,
                allocPoint: _allocPoint,
                lastRewardBlock: lastRewardBlock,
                accEggPerShare: 0,
                depositFeeBP: _depositFeeBP
            })
        );
    }

    // Update the given pool's GOONG allocation point and deposit fee. Can only be called by the owner.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        uint16 _depositFeeBP,
        bool _withUpdate
    ) public onlyOwner {
        require(
            _depositFeeBP <= 10000,
            "set: invalid deposit fee basis points"
        );
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(
            _allocPoint
        );
        poolInfo[_pid].allocPoint = _allocPoint;
        poolInfo[_pid].depositFeeBP = _depositFeeBP;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to)
        public
        pure
        returns (uint256)
    {
        return _to.sub(_from).mul(BONUS_MULTIPLIER);
    }

    // View function to see pending EGGs on frontend.
    function pendingEgg(uint256 _pid, address _user)
        external
        view
        returns (uint256)
    {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accEggPerShare = pool.accEggPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier =
                getMultiplier(pool.lastRewardBlock, block.number);
            uint256 eggReward =
                multiplier.mul(eggPerBlock).mul(pool.allocPoint).div(
                    totalAllocPoint
                );
            accEggPerShare = accEggPerShare.add(
                eggReward.mul(1e12).div(lpSupply)
            );
        }
        return user.amount.mul(accEggPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0 || pool.allocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 eggReward =
            multiplier.mul(eggPerBlock).mul(pool.allocPoint).div(
                totalAllocPoint
            );
        egg.mint(devaddr, eggReward.div(10));
        egg.mint(address(this), eggReward);
        pool.accEggPerShare = pool.accEggPerShare.add(
            eggReward.mul(1e12).div(lpSupply)
        );
        pool.lastRewardBlock = block.number;
    }

    function depositWithoutFee(uint256 _pid, uint256 _amount) public {
        require(voucherRate > 0, "voucherRate must be set");
        require(!isContract(), "caller must be EOA");
        uint256 goongAmount = calculateGoongCoverFee(_pid, _amount);
        egg.transferFrom(msg.sender, address(this), goongAmount);

        voucherInfo[_pid][msg.sender] = voucherInfo[_pid][msg.sender].add(
            goongAmount
        );

        _deposit(_pid, _amount, true);
    }

    /**
     * @dev Calculate how much LP value needed for required the same voucher's value.
     * @param _pid the id of the desired pool.
     * @param _amount the lp amount.
     */
    function calculateLpVoucherFee(uint256 _pid, uint256 _amount)
        private
        view
        returns (uint256)
    {
        PoolInfo memory pool = poolInfo[_pid];
        uint256 _depositFee = pool.depositFeeBP;
        return _amount.mul(_depositFee).mul(voucherRate).div(1e4);
    }

    // Deposit LP tokens to MasterChef for GOONG allocation.
    function deposit(uint256 _pid, uint256 _amount) public {
        _deposit(_pid, _amount, false);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 pending =
            user.amount.mul(pool.accEggPerShare).div(1e12).sub(user.rewardDebt);
        if (pending > 0) {
            safeEggTransfer(msg.sender, pending);
        }
        uint256 totalGoongLocked = voucherInfo[_pid][msg.sender];
        if (totalGoongLocked > 0) {
            uint256 goongAmount =
                _amount.mul(totalGoongLocked).div(user.amount);
            if (totalGoongLocked - goongAmount >= 0) {
                voucherInfo[_pid][msg.sender] -= goongAmount;
                safeEggTransfer(msg.sender, goongAmount);
            } else {
                safeEggTransfer(msg.sender, totalGoongLocked);
                voucherInfo[_pid][msg.sender] = 0;
            }
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(pool.accEggPerShare).div(1e12);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.lpToken.safeTransfer(address(msg.sender), amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // Safe egg transfer function, just in case if rounding error causes pool to not have enough EGGs.
    function safeEggTransfer(address _to, uint256 _amount) internal {
        uint256 eggBal = egg.balanceOf(address(this));
        bool transferSuccess = false;
        if (_amount > eggBal) {
            transferSuccess = egg.transfer(_to, eggBal);
        } else {
            transferSuccess = egg.transfer(_to, _amount);
        }
        require(transferSuccess, "safeEggTransfer: transfer failed");
    }

    // Update dev address by the previous dev.
    function dev(address _devaddr) public {
        require(msg.sender == devaddr, "dev: wut?");
        devaddr = _devaddr;
        emit SetDevAddress(msg.sender, _devaddr);
    }

    function setFeeAddress(address _feeAddress) public {
        require(msg.sender == feeAddress, "setFeeAddress: FORBIDDEN");
        feeAddress = _feeAddress;
        emit SetFeeAddress(msg.sender, _feeAddress);
    }

    function setVoucherRate(uint256 _voucherRate) public onlyOwner {
        require(_voucherRate <= MAX_VOUCHER_RATE);
        voucherRate = _voucherRate;
    }

    //Pancake has to add hidden dummy pools inorder to alter the emission, here we make it simple and transparent to all.
    function updateEmissionRate(uint256 _eggPerBlock) public onlyOwner {
        massUpdatePools();
        eggPerBlock = _eggPerBlock;
        emit UpdateEmissionRate(msg.sender, _eggPerBlock);
    }

    function getQuoteTokenReserveFromPair(IPancakePair pair, address quoteToken)
        private
        view
        returns (uint256)
    {
        uint256 _reserve;
        if (pair.token0() == quoteToken) {
            (_reserve, , ) = pair.getReserves();
        } else {
            (, _reserve, ) = pair.getReserves();
        }
        return _reserve;
    }

    function calculateGoongCoverFee(uint256 _pid, uint256 _amount)
        public
        view
        returns (uint256)
    {
        PoolInfo memory pool = poolInfo[_pid];
        IPancakePair pair = IPancakePair(address(pool.lpToken));
        bool isBusdPair = pair.token0() == busd || pair.token1() == busd;
        address quoteToken;
        if (isBusdPair) {
            quoteToken = busd;
        } else {
            quoteToken = bnb;
        }

        uint256 _lpVoucherFee = calculateLpVoucherFee(_pid, _amount);

        uint256 _reserve = getQuoteTokenReserveFromPair(pair, quoteToken);
        uint256 quoteTokenWorth =
            _lpVoucherFee.mul(_reserve).mul(2).div(pair.totalSupply());

        IFactory factory = IFactory(pair.factory());
        address goongQuoteTokenLP = factory.getPair(address(egg), quoteToken);

        IPancakePair goongQuoteTokenPair = IPancakePair(goongQuoteTokenLP);
        uint256 _reserveQuoteToken;
        uint256 _reserveGoong;
        if (goongQuoteTokenPair.token0() == quoteToken) {
            (_reserveQuoteToken, _reserveGoong, ) = goongQuoteTokenPair
                .getReserves();
        } else {
            (_reserveGoong, _reserveQuoteToken, ) = goongQuoteTokenPair
                .getReserves();
        }
        uint256 goongAmount =
            quoteTokenWorth.mul(_reserveGoong).div(_reserveQuoteToken);

        return goongAmount;
    }

    function isContract() private view returns (bool) {
        require(tx.origin == msg.sender, "caller must be EOA");
        uint32 size;
        address a = msg.sender;
        assembly {
            size := extcodesize(a)
        }
        return (size > 0);
    }

    function _deposit(
        uint256 _pid,
        uint256 _amount,
        bool skipDepositFee
    ) private nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending =
                user.amount.mul(pool.accEggPerShare).div(1e12).sub(
                    user.rewardDebt
                );
            if (pending > 0) {
                safeEggTransfer(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(
                address(msg.sender),
                address(this),
                _amount
            );
            if (pool.depositFeeBP > 0 && !skipDepositFee) {
                uint256 depositFee = _amount.mul(pool.depositFeeBP).div(10000);
                pool.lpToken.safeTransfer(feeAddress, depositFee);
                user.amount = user.amount.add(_amount).sub(depositFee);
            } else {
                user.amount = user.amount.add(_amount);
            }
        }
        user.rewardDebt = user.amount.mul(pool.accEggPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }
}
