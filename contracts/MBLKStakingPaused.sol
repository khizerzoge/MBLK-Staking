// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
 import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MBLKStake.sol";
import "./LPStake.sol";

contract MBLKStakingPool is  Ownable,ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable mblkToken;     
    MBLKStaked public immutable smblkToken;  
    LPStaked public immutable slpToken;  
    IERC20 public immutable lpToken;       
  
    // Struct to represent MBLK staking details for a user
    struct MBLKStake {
        uint256 mblkAmount;           // Amount of MBLK tokens staked
        uint256 startTimestamp;       // Timestamp when the staking started
        uint256 endTime;              // Timestamp when the staking ends
        uint256 claimedReward;        // Amount of claimed rewards by the user
        uint256 lastClaimedTimeStamp; // Timestamp of the last claimed reward
        uint256 smblkMinted;          // Amount of sMBLK (staking MBLK) tokens minted as rewards
        uint256 cycleId;              // Identifier of the staking cycle
    }
    
    // Struct representing the LP staking details for a user
    struct LPStake {
        uint256 lpAmount;               // Amount of liquidity provider tokens staked
        uint256 startTimestamp;         // Timestamp when the LP staking started
        uint256 endTime;                // Timestamp when the LP staking ends
        uint256 claimedReward;          // Amount of claimed rewards by the LP
        uint256 lastClaimedTimeStamp;   // Timestamp of the last claimed reward by the LP
        uint256 slpMinted;              // Amount of sLP (staking LP) tokens minted as rewards
        uint256 cycleId;                // Identifier of the staking cycle for LPs
    }

   // Struct representing information related to a staking cycle
    struct StakingInfo {
        uint256 cycleId;           // Identifier for the staking cycle
        uint256 blockTimeStamp;    // Timestamp of the block when the staking cycle was created
        uint256 totalReward;       // Total reward allocated for current cycle 
        uint256 totalLpStaked;     // Total amount of Liquidity Provider (LP) tokens staked in this cycle
        uint256 totalMblkStaked;   // Total amount of MBLK tokens staked in this cycle
    }

    // Mapping to store MBLKStake struct information associated with user addresses
    mapping(address => MBLKStake) public userMblkStakes;

    // Mapping to store LPStake struct information associated with user addresses
    mapping(address => LPStake) public userLpStakes;

    // Mapping to manage administrator privileges for specific addresses
    mapping(address => bool) public isAdmin;

    // Mapping to maintain StakingInfo struct data corresponding to specific cycle IDs
    mapping(uint256 => StakingInfo) public stakingInfo;

    // Total amount of MBLK tokens staked 
    uint256 public totalMblkStaked;

    // Total amount of LP tokens staked 
    uint256 public totalLpStaked;

    // Total amount of sMBLK tokens minted  
    uint256 public totalSmblkMinted;

    // Total amount of sLP tokens minted  
    uint256 public totalSlpMinted;

    // Current cycle identifier
    uint256 public currentCycleId;

    // Timestamp of the last dynamic reward set
    uint256 public lastDynamicRewardSet;

    // Minimum time required to calculate rewards
    uint256 public calculateRewardMinimumTime;

    // Time allocated for fixed rewards
    uint256 public constant TIME_FOR_FIXED_REWARD = 24 hours;

    // Time allocated for dynamic rewards
    uint256 public constant TIME_FOR_DYNAMIC_REWARD = 24 hours;

    // Timestamp of the last fixed reward setting
    uint256 public lastFixedRewardSet;

    // Timestamp of the last total reward setting
    uint256 public lastTotalRewardSetTimestamp;

    // Fixed reward amount
    uint256 public fixedReward;

    // Dynamic reward amount
    uint256 public dynamicReward;

    // Total rewards across the platform
    uint256 public totalRewards;

    // Minimum duration for stake locking
    uint256 public minimumStakeDuration;

    // Boolean to check if rewards are set or not
    bool isRewardSent;

    //Boolean for Pause and unpause
    bool isPaused;

    // Wallet address for collecting fees
    address public feesCollectionWallet;

    // Percentage of fees charged  
    uint256 public feesPercentage;

    // mblk Reward percentage
    uint256 public constant mblkRewardPercentage = 30;

    // Lp Reward Percentage
    uint256 public constant lpRewardPercentage = 70;

    
 
    //Events
    event StakeMblk(address indexed user,uint256 mblkAmount);
    event StakeLp(address indexed user,uint256 lpAmount);
    event ClaimedRewardsMblk(address indexed user,uint256 rewardsAmount);
    event ClaimedRewardsLp(address indexed user,uint256 rewardsAmount);
    event MblkStakeUpdated(address userAddress, uint256 amount);
    event LpStakeUpdated(address userAddress, uint256 amount);
    event WithdrawnMblk(address indexed user, uint256 rewardsAmount);
    event WithdrawnLp(address indexed user, uint256 rewardsAmount); 
    event FeesPercentageSet(uint256 percentage);
    event TotalRewardSet(uint256 totalReward);
    event DynamicRewardSet(uint256 dynamicReward);
    event FixedRewardSet(uint256 newFixedReward);
    event MinimumStakeDurationSet(uint256 duration);
    event AdminRemoved( address adminToRemove);
    event AdminAdded( address adminAddress);
    event UpdatedCycleId(uint256 currentCycleId);
    event WithDrawnAll(address owner,uint256 BalanceMBLK);
    event FeesWalletSet(address feesCollectionWallet);
    event MinimumCalculateRewardTimeSet(uint256 time);
    event PausedStaking();
    event UnpausedStaking();

    /*
    * @dev Modifer which allows ADMIN LIST TO ACCESS THE FUNCTION
    */ 
    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Only admins can call this function");
        _;
    } 

    constructor(
        address mblkTokenAddress,              // Address of the MBLK token contract
        address lptokenAddress,                // Address of the LP token contract
        address feesCollectionWalletAddress    // Address to collect fees or rewards
    ) payable {
        mblkToken = IERC20(mblkTokenAddress);  // Initializing MBLK token contract interface
        lpToken = IERC20(lptokenAddress);      // Initializing LP token contract interface
        feesCollectionWallet = feesCollectionWalletAddress; // Assigning the fees collection wallet address
        smblkToken = new MBLKStaked();         // Deploying a new instance of MBLKStaked contract
        slpToken = new LPStaked();             // Deploying a new instance of LPStaked contract
        isRewardSent = false;                  // Setting the initial state for isRewardSent
        calculateRewardMinimumTime = 6 hours;    // Setting the calculateRewardMinimumTime as 6 hours
        isPaused = false; 
        feesPercentage = 20;
    }

    /**
     * @dev Stake a specified amount of MBLK tokens.
     * @param mblkAmount The amount of MBLK tokens to stake.
     *
     * Requirements:
     * - The staked amount must be greater than 0.
     * - The user must not have an active MBLK stake (mblkAmount must be 0).
     * - Transfer MBLK tokens from the sender to the staking contract.
     * - Record stake-related information including start and end times, rewards, and cycle ID.
     * - Mint and distribute SMBLK tokens to the staker.
     * - Update the total MBLK staked and total SMBLK minted.
     *
     * Emits a StakeMBLK event to log the staking action.
    */
    function stakeMBLK(uint256 mblkAmount) nonReentrant external {
        require(isPaused == false,"Contract is paused");
        require(mblkAmount > 0, "Amount must be greater than 0");
        require(
            mblkToken.balanceOf(msg.sender) >= mblkAmount,
            "Not enough Balance"
        );
        require(
            userMblkStakes[msg.sender].mblkAmount == 0,
            "Existing active stake found"
        ); 
        MBLKStake memory userStake = userMblkStakes[msg.sender];    

        mblkToken.safeTransferFrom(msg.sender, address(this), mblkAmount);
        uint256 blocktimestamp = block.timestamp;   
        totalMblkStaked += mblkAmount;
        userStake.mblkAmount = mblkAmount;
        userStake.startTimestamp = blocktimestamp;
        userStake.endTime = blocktimestamp + minimumStakeDuration;
        userStake.lastClaimedTimeStamp = blocktimestamp;
        smblkToken.mint(msg.sender,mblkAmount);  
        totalSmblkMinted += mblkAmount;
        userStake.cycleId = currentCycleId + 1;
        userStake.smblkMinted += mblkAmount;
        userMblkStakes[msg.sender] = userStake;
        emit StakeMblk(msg.sender,mblkAmount);
    }

    /**
     * @dev Stake a specified amount of LP (Liquidity Provider) tokens.
     * @param lpAmount The amount of LP tokens to stake.
     *
     * Requirements:
     * - The staked amount must be greater than 0.
     * - The sender must have a sufficient balance of LP tokens to stake.
     * - The user must not have an active LP stake (lpAmount must be 0).
     * - Transfer LP tokens from the sender to the staking contract.
     * - Record stake-related information including start and end times, rewards, and cycle ID.
     * - Mint and distribute SLP tokens to the staker.
     * - Update the total LP tokens staked and total SLP tokens minted.
     *
     * Emits a StakeLP event to log the staking action.
    */  
    function stakeLP(uint256 lpAmount) nonReentrant external {
        require(isPaused == false,"Contract is paused");
        require(lpAmount > 0, "Amount must be greater than 0 " );
        require(
            lpToken.balanceOf(msg.sender) >= lpAmount,
            "Not enough Balance"
        );
        require(
            userLpStakes[msg.sender].lpAmount == 0,
            "Existing LP Stake Found"
        );
        LPStake memory userStake = userLpStakes[msg.sender];

        lpToken.safeTransferFrom(msg.sender,address(this), lpAmount);
        totalLpStaked += lpAmount;
        uint256 blocktimestamp = block.timestamp;
        userStake.lpAmount += lpAmount;
        userStake.startTimestamp = blocktimestamp;
        userStake.endTime = blocktimestamp + minimumStakeDuration;
        userStake.lastClaimedTimeStamp = blocktimestamp;  
        slpToken.mint(msg.sender,lpAmount);          //Staked LP Token MInted to User Address
        totalSlpMinted += lpAmount;
        userStake.slpMinted += lpAmount;
        userStake.cycleId = currentCycleId + 1; 
        userLpStakes[msg.sender] = userStake;
        emit StakeLp(msg.sender, lpAmount); 
    }

     /**
     * @dev Update a user's stake with additional tokens.
     * @param amount The amount of tokens to add to the user's stake.
     * @param isMblk A boolean indicating whether the stake is for MBLK (true) or LP (false).
     *
     * Requirements:
     * - The added amount must be greater than 0.
     * - The calculated rewards must be claimed first (calculatedRewards must be 0).
     * - If the stake is for MBLK, the user must have an existing active MBLK stake; if the stake is for LP, the user must have an existing active LP stake.
     * - Transfer tokens from the sender to the staking contract.
     * - Update stake-related information, including start and end times, rewards, and cycle ID.
     *
     * Emits an MblkStakeUpdated event if updating an MBLK stake, or an LpStakeUpdated event if updating an LP stake, to log the stake update.
    */
    function updateStake(uint256 amount, bool isMblk) public {
        require(isPaused == false,"Contract is paused");
        require(amount > 0, "Amount must be greater than 0");
        if(isMblk){
            require(
                mblkToken.balanceOf(msg.sender)>= amount,
                "Not enough balance"
            );
            MBLKStake memory userStake = userMblkStakes[msg.sender];    
            uint256 calculatedRewards = calculateReward(msg.sender,0,true);
            require(calculatedRewards == 0, "Please claim the rewards first");
            require(userStake.mblkAmount > 0,"Existing active stake not found");
            mblkToken.safeTransferFrom(msg.sender, address(this), amount);
            totalMblkStaked += amount;
            userStake.mblkAmount += amount;
            uint256 blockTimeStamp = block.timestamp; 
            userStake.startTimestamp = blockTimeStamp;
            userStake.endTime = blockTimeStamp + minimumStakeDuration;
            smblkToken.mint(msg.sender, amount);   
            totalSmblkMinted += amount;
            
            userStake.smblkMinted += amount;
            userStake.cycleId = currentCycleId + 1; 
            userMblkStakes[msg.sender] = userStake;
            emit MblkStakeUpdated(msg.sender,amount);   
        } else {
            require(
                lpToken.balanceOf(msg.sender)>= amount,
                "Not enough balance"
            );
            LPStake memory userStake = userLpStakes[msg.sender];
            uint256 calculatedRewards = calculateReward(msg.sender,0,false);
            require(calculatedRewards == 0, "Please claim the rewards first");
            require(userStake.lpAmount > 0, "Existing active stake not found");
            lpToken.safeTransferFrom(msg.sender,address(this), amount);  
            totalLpStaked += amount;
            userStake.lpAmount += amount;
            uint256 blockTimeStamp = block.timestamp; 
            userStake.startTimestamp = blockTimeStamp;
            userStake.endTime = blockTimeStamp + minimumStakeDuration;
            slpToken.mint(msg.sender, amount);  
            totalSlpMinted += amount;
            userStake.slpMinted += amount;
            userStake.cycleId = currentCycleId + 1;
            userLpStakes[msg.sender] = userStake;

            emit LpStakeUpdated(msg.sender,amount);
        }
    }

    /**
     * @dev Calculate the rewards for a user based on their staking Parcentage.
     * @param userAddress The address of the user.
     * @param isMblk A boolean indicating whether the user has MBLK staked (true) or LP staked (false).
     * @return The calculated reward amount for the user 
     *
     * Requirements:
     * - The user must have a staking amount greater than 0.
     * - The owner/admin must have set the minimum time for calculating rewards (calculateRewardMinimumTime).
     *
     * The function calculates rewards by iterating through cycles, determining the user's stake percentage, and applying it to the total rewards.
     * The calculated reward is based on the User Stake Percentage each cycle.
    */
    function calculateReward(address userAddress,uint256 uptoCycleId, bool isMblk) public view returns(uint256){ 
        require(isPaused == false,"Contract is paused");
        require(
            uptoCycleId <= currentCycleId,
            "uptoCycleId is out of range"
        );
        require(
            calculateRewardMinimumTime > 0,
            "Owner Haven't Set calculate Reward minimum Time"
        );
        uint256 totalRewardsCalculated;
        uint256 _iether = 10**18;
        uint256 terminationValue;
        uint256 blockTimeStamp = block.timestamp;

        if( uptoCycleId == 0){
            terminationValue = currentCycleId;
        }else{
            terminationValue = uptoCycleId;
        }

        if(isMblk){
            MBLKStake memory userStake = userMblkStakes[userAddress];
            require(
                userStake.mblkAmount > 0,
                "No Stakes Found"
            ); 
            uint256 elapsedTimeFromLastClaimed = blockTimeStamp - userStake.lastClaimedTimeStamp;
            if(elapsedTimeFromLastClaimed >= calculateRewardMinimumTime){
                for(uint256 i = userStake.cycleId; i <= terminationValue; i++){
                    if(stakingInfo[i].totalMblkStaked == 0 ){ continue; }
                    uint256 totalRewardFromStakeInfo = stakingInfo[i].totalReward;
                    uint256 totalMblkStakedFromStakeInfo = stakingInfo[i].totalMblkStaked;
                    uint256 mblkStakePercentage = (userStake.mblkAmount * 100 * _iether)/(totalMblkStakedFromStakeInfo);
                    uint256 numerator = mblkStakePercentage * totalRewardFromStakeInfo * _iether * mblkRewardPercentage;
                    uint256 denominator = _iether * 10000 * _iether; 
                    uint256 totalRewardsPerCycle = numerator/denominator;
                    totalRewardsCalculated += totalRewardsPerCycle;
                }
                return totalRewardsCalculated;
            } else {
                return 0;
            }
        } else {
            LPStake memory userStake = userLpStakes[userAddress];
            require(
                userStake.lpAmount > 0,
                "No Stakes Found"
            );
            uint256 elapsedTimeFromLastClaimed = blockTimeStamp - userStake.lastClaimedTimeStamp;
            if(elapsedTimeFromLastClaimed >= calculateRewardMinimumTime){
                for(uint256 i = userStake.cycleId; i <= terminationValue; i++){
                    if(stakingInfo[i].totalLpStaked == 0 ) { continue; }
                    uint256 totalRewardFromStakeInfo = stakingInfo[i].totalReward;
                    uint256 totalLpStakedFromStakeInfo = stakingInfo[i].totalLpStaked;
                    uint256 lpStakePercentage = ( userStake.lpAmount * 100 * _iether )/(totalLpStakedFromStakeInfo);
                    uint256 numerator = lpStakePercentage * totalRewardFromStakeInfo * _iether * lpRewardPercentage;
                    uint256 denominator = _iether * 10000 * _iether;  
                    uint256 totalRewardsPerCycle = numerator/denominator;
                    totalRewardsCalculated += totalRewardsPerCycle;
                }
            return totalRewardsCalculated;
            }else{
                return 0;
            }
        }
    }


    /**
     * @dev Claim MBLK rewards for a user.
     *
     * This function allows a user to claim their MBLK rewards based on their staking Parcentage. The rewards are calculated using the 'calculateReward' function.
     * A fee is deducted from the total rewards, and the remaining amount is transferred to the user. The fee amount is also transferred to a specified feesCollectionWallet.
     *
     * Requirements:
     * - The user must have an active MBLK stake.
     * - The calculated reward must be greater than 0.
     *
     * Emits a ClaimedRewardsMblk event to log the claimed rewards.
    */
    function claimRewardsMBLK(uint256 uptoCycleId) nonReentrant public{
        require(isPaused == false,"Contract is paused");
        uint256 cycleIdConsidered;
        MBLKStake memory userStake = userMblkStakes[msg.sender];
        require(
            uptoCycleId <= currentCycleId,
            "uptoCycleId is greated than currentCycleId"
        );
        require(
            userStake.mblkAmount > 0,
            "No single MBLK stake found"
        );
        if( uptoCycleId == 0){
            cycleIdConsidered = currentCycleId;
        }else {
            cycleIdConsidered = uptoCycleId;
        }

        uint256 rewards = calculateReward(msg.sender,uptoCycleId,true);
        require( rewards > 0, "No rewards to claim");
        require(
            mblkToken.balanceOf(address(this)) - (totalMblkStaked) >= rewards,
            "not enough balance in the contract"
        ); 
        uint256 feeAmount = (rewards * feesPercentage)/10000;
        uint256 amountToSend = rewards - feeAmount;
        mblkToken.safeTransfer(msg.sender, amountToSend); 
        mblkToken.safeTransfer(feesCollectionWallet, feeAmount);
        userStake.lastClaimedTimeStamp = block.timestamp;
        userStake.claimedReward += rewards;
        userStake.cycleId = cycleIdConsidered + 1;
        userMblkStakes[msg.sender] = userStake;

        emit ClaimedRewardsMblk(msg.sender, rewards);
    }

    /**
     * @dev Claim LP token rewards for a user.
     *
     * This function allows a user to claim their LP token rewards based on their staking Parcentage. The rewards are calculated using the 'calculateReward' function.
     * A fee is deducted from the total rewards, and the remaining amount is transferred to the user. The fee amount is also transferred to a specified feesCollectionWallet.
     *
     * Requirements:
     * - The user must have an active LP token stake.
     * - The calculated reward must be greater than 0.
     * - the rewards must be less then or equal to balanceOf totalRewards
     *
     * Emits a ClaimedRewardsLp event to log the claimed rewards.
    */
    function claimRewardsLP(uint256 uptoCycleId) nonReentrant public{
        require(isPaused == false,"Contract is paused");
        uint256 cycleIdConsidered;
        LPStake memory userStake = userLpStakes[msg.sender];
        require(
            uptoCycleId <= currentCycleId,
            "uptoCycleId is greated than currentCycleId"
        );
        require(
            userStake.lpAmount > 0,
            "No LP Stake found"
        );
        if(uptoCycleId == 0){
            cycleIdConsidered = currentCycleId;
        }else {
            cycleIdConsidered = uptoCycleId;
        }
        uint256 rewards = calculateReward(msg.sender,cycleIdConsidered,false);
        require( rewards > 0 , "No rewards to claim");
        require(
            mblkToken.balanceOf(address(this)) - totalMblkStaked >= rewards,
            "not enough balance in the contract"
        );
        uint256 feeAmount = (rewards * feesPercentage)/10000;
        uint256 amountToSend = rewards - feeAmount;
        mblkToken.safeTransfer(msg.sender, amountToSend);
        mblkToken.safeTransfer(feesCollectionWallet, feeAmount);
        userStake.claimedReward += rewards;
        userStake.cycleId = cycleIdConsidered + 1;
        userStake.lastClaimedTimeStamp = block.timestamp;
        userLpStakes[msg.sender] = userStake;

        emit ClaimedRewardsLp(msg.sender, rewards);
    }

    /**
     * @dev Withdraw a specified amount of MBLK tokens from the user's stake.
     * @param amountTowithdraw The amount of MBLK tokens to withdraw.
     *
     * Requirements:
     * - The user must have an active MBLK stake.
     * - The calculated rewards must be claimed first (calculatedRewards must be 0).
     * - The withdrawal can only occur after the minimum stake duration has passed.
     * - The contract must have a sufficient balance of MBLK tokens.
     *
     * Effects:
     * - Transfers the specified amount of MBLK tokens to the user.
     * - Burns an equivalent amount of SMBLK tokens from the user's balance.
     * - Updates the user's stake and total MBLK and SMBLK minted values.
     *
     * Emits a WithdrawnMblk event to log the MBLK withdrawal.
    */
    function withdrawMBLK(uint256 amountTowithdraw) nonReentrant external {
        MBLKStake memory userStake = userMblkStakes[msg.sender];
        require(amountTowithdraw > 0,"Amount to withdraw should be greater than 0");
        if( isPaused == false){
                require(
                        userStake.endTime < block.timestamp,
                        "Can not withdraw before Minimum Stake Duration"
                );
                uint256 calculatedRewards = calculateReward(msg.sender,0,true);   
                require(calculatedRewards == 0,"Please claim the rewards first");
        } 

        require(userStake.mblkAmount > 0,"No active stake found");
        require(
            userStake.mblkAmount >= amountTowithdraw,
            "Not enough MBLK Staked"
        );
        require(
            mblkToken.balanceOf(address(this)) >= amountTowithdraw,
            "Contract balance is not enough"
        );
        mblkToken.safeTransfer(msg.sender, amountTowithdraw);  
        smblkToken.burnFrom(msg.sender, amountTowithdraw);
        userStake.mblkAmount -= amountTowithdraw;
        userStake.smblkMinted -= amountTowithdraw;
        totalSmblkMinted -= amountTowithdraw;
        totalMblkStaked -= amountTowithdraw;
        userMblkStakes[msg.sender] = userStake;
        emit WithdrawnMblk(msg.sender,amountTowithdraw);
    }

    /**
     * @dev Withdraw a specified amount of LP (Liquidity Provider) tokens from the user's stake.
     * @param amountToWithdraw The amount of LP tokens to withdraw.
     *
     * Requirements:
     * - The user must have an active LP token stake.
     * - The calculated rewards must be claimed first (calculatedRewards must be 0).
     * - The withdrawal can only occur after the minimum stake duration has passed.
     * - The contract must have a sufficient balance of LP tokens and SMBLK tokens.
     *
     * Effects:
     * - Transfers the specified amount of LP tokens to the user.
     * - Burns an equivalent amount of SMBLK tokens from the user's balance.
     * - Updates the user's stake, total LP staked, and total SLP minted values.
     *
     * Emits a WithdrawnLp event to log the LP token withdrawal.
    */
    function withdrawLP(uint256 amountToWithdraw) nonReentrant external {
        LPStake memory userStake = userLpStakes[msg.sender];
        require(amountToWithdraw > 0,"Amount to withdraw should be greater than 0");
        if( isPaused == false){
                require(
                        userStake.endTime < block.timestamp,
                        "Can not withdraw before Minimum Stake Duration"
                );
                uint256 calculatedRewards = calculateReward(msg.sender,0,false);   
                require(calculatedRewards == 0,"Please claim the rewards first");
        } 
        require(userStake.lpAmount > 0,"No active stake found");
        require(userStake.lpAmount >= amountToWithdraw,"Not enough LP Staked");
        require(
            userStake.lpAmount >= amountToWithdraw, 
            "Contract balance is not enough"
        );
        require(
            slpToken.balanceOf(msg.sender) >= amountToWithdraw,
            "user smblk Balance is not enough"
        );
        require(
            lpToken.balanceOf(address(this)) >= amountToWithdraw,
            "Contract Balance is not enough"
        );
        slpToken.burnFrom(msg.sender,amountToWithdraw);
        lpToken.safeTransfer(msg.sender, amountToWithdraw);
        userStake.lpAmount -= amountToWithdraw;
        totalLpStaked -= amountToWithdraw;
        totalSlpMinted -= amountToWithdraw;
        userStake.slpMinted -= amountToWithdraw;
        userLpStakes[msg.sender] = userStake;
        emit WithdrawnLp(msg.sender, amountToWithdraw);
    }
 
    /**
     * @dev Update the current staking cycle information.
     *
     * This function increments the currentCycleId, records the block timestamp, and updates the staking information for the new cycle, including total rewards, LP tokens staked, and MBLK tokens staked.
     *
     * Requirements:
     * - Only the admin can call this function.
     *
     * Emits an UpdatedCycleId event with the new cycle's identifier.
    */  
    function updateCycleId() public onlyAdmin{
        require(isRewardSent == true,"Rewards are not set");
        currentCycleId++;
        uint256 blockTimeStamp = block.timestamp;
        stakingInfo[currentCycleId].cycleId =  currentCycleId;
        stakingInfo[currentCycleId].blockTimeStamp = blockTimeStamp;
        stakingInfo[currentCycleId].totalReward = totalRewards;
        stakingInfo[currentCycleId].totalLpStaked = totalLpStaked;
        stakingInfo[currentCycleId].totalMblkStaked = totalMblkStaked;
        isRewardSent = false;

        emit UpdatedCycleId(currentCycleId);
    }
 
    /**
     * @dev Set a fixed reward value for staking.
     * @param newFixedReward The fixed reward value to be set.
     *
     * Requirements:
     * - Only the admin can call this function.
     * - The time since the last fixed reward update must be greater than or equal to 'TIME_FOR_FIXED_REWARD'.
     *
     * Effects:
     * - Updates the 'fixedReward' value.
     * - Calls 'setTotalRewards' to set total rewards based on the fixed reward.
     *
     * Emits a FixedRewardSet event to log the update of the fixed reward value.
    */
    function setFixedReward(address vestingAddress, uint256 newFixedReward) external onlyAdmin{
        uint256 blocktimeStamp = block.timestamp;
        uint256 timeSpent = blocktimeStamp - lastFixedRewardSet; 
        require(timeSpent >= TIME_FOR_FIXED_REWARD, "Can not set before Minimum Time");
        mblkToken.safeTransferFrom(vestingAddress,address(this),newFixedReward);
        lastFixedRewardSet = blocktimeStamp;
        fixedReward = newFixedReward;
        setTotalRewards();

        emit FixedRewardSet(newFixedReward);
    }


    /**
     * @dev Set the dynamic reward value, but only if enough time has passed since the last update.
     * @param newDynamicReward The new dynamic reward value to set.
     *
     * Requirements:
     * - The function can only be called by the admin.
     * - The time elapsed since the last dynamic reward update must be greater than or equal to `TIME_FOR_DYNAMIC_REWARD`.
     * - If the time requirement is met, the dynamic reward value is updated, and `setTotalRewards` is called.
     *
     * Emits a DynamicRewardSet event with the new dynamic reward value.
    */
    function setDynamicReward(address vestingAddress, uint256 newDynamicReward) external onlyAdmin{
        uint256 blocktimeStamp = block.timestamp;
        uint256 timeSpent = blocktimeStamp - lastDynamicRewardSet;
        require(timeSpent >= TIME_FOR_DYNAMIC_REWARD,"Can not set Before minimum time");
        mblkToken.safeTransferFrom(vestingAddress,address(this),newDynamicReward);
        lastDynamicRewardSet = blocktimeStamp;
        dynamicReward = newDynamicReward; 
        setTotalRewards();

        emit DynamicRewardSet(newDynamicReward);
    }

    /**
     * @dev Set the total rewards for staking.
     *
     * Effects:
     * - Calculates the 'totalRewards' by adding the 'fixedReward' and 'dynamicReward'.
     * - Records the timestamp when the total rewards were last set.
     *
     * Emits a TotalRewardSet event to log the update of the total rewards.
    */
    function setTotalRewards() internal {
        totalRewards = fixedReward + dynamicReward;
        lastTotalRewardSetTimestamp = block.timestamp;
        if(isRewardSent == false){
            isRewardSent = true;
        } 
        emit TotalRewardSet(totalRewards);
    }

    /**
     * @dev Set the fees percentage for reward distribution.
     * @param percentage The fees percentage to be set (0-10000, where 10000 represents 100%).
     *
     * Requirements:
     * - Only the admin can call this function.
     * - The provided percentage must be within the valid range (0-10000).
     *
     * Effects:
     * - Updates the 'feesPercentage' for fee calculations.
     *
     * Emits a FeesPercentageSet event to log the update of the fees percentage.
    */
    function setFeesPercentage(uint256 percentage) external onlyAdmin{
        require(percentage > 0 && percentage <= 1500, "Percentage out of range (0-1500)");
        feesPercentage = percentage;
        emit FeesPercentageSet(percentage);
    } 

    /**
     * @dev Add a new address as an admin.
     * @param newAdmin The address to be added as a new admin.
     *
     * Requirements:
     * - Only the contract owner can call this function.
     *
     * Effects:
     * - Grants administrative privileges to the specified address by setting 'isAdmin[newAdmin]' to true.
     *
     * Emits an AdminAdded event to log the addition of a new admin.
    */
    function addAdmin(address newAdmin) public onlyOwner {
        isAdmin[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    /**
     * @dev Remove an address from the list of admins.
     * @param adminAddress The address to be removed from the list of admins.
     *
     * Requirements:
     * - Only the contract owner can call this function.
     *
     * Effects:
     * - Revokes administrative privileges from the specified address by setting 'isAdmin[adminAddress]' to false.
     *
     * Emits an AdminRemoved event to log the removal of an admin.
     */
    function removeAdmin(address adminAddress) public onlyOwner{
        isAdmin[adminAddress] = false; 
        emit AdminRemoved(adminAddress);
    }

    /**
     * @dev Set the minimum stake duration in minutes.
     * @param durationInMinutes The minimum stake duration in minutes to be set.
     *
     * Requirements:
     * - The provided duration must be greater than 0.
     *
     * Effects:
     * - Converts the input duration in minutes to seconds and updates the 'minimumStakeDuration' variable.
     *
     * Emits a MinimumStakeDurationSet event to log the update of the minimum stake duration.
    */
    function setMinimumStakeDuration(uint256 durationInMinutes) external onlyOwner{
        require(durationInMinutes > 0, "Given Value is 0"); 
        minimumStakeDuration = durationInMinutes * 60;
        emit MinimumStakeDurationSet(durationInMinutes);
    }

    /**
     * @dev Set the address where collected fees will be sent.
     * @param walletAddress The address where collected fees will be transferred to.
     *
     * Requirements:
     * - Only the contract owner can call this function.
     *
     * Effects:
     * - Updates the 'feesCollectionWallet' with the provided wallet address.
    */
    function setFeeWalletAddress(address walletAddress) public onlyOwner{
        feesCollectionWallet = walletAddress;
        emit FeesWalletSet(walletAddress);
    }

    /**
     * @dev Set the minimum time duration for calculating rewards.
     * @param durationInMinutes The minimum time duration in minutes for calculating rewards.
     *
     * Requirements:
     * - Only the contract owner can call this function.
     *
     * Effects:
     * - Converts the input duration in minutes to seconds and updates 'calculateRewardMinimumTime'.
    */
    function setMinimumCalculateRewardTime(uint256 durationInMinutes) public onlyOwner{  
        require(durationInMinutes > 0, "calculate reward minimum time can not be 0");    
        calculateRewardMinimumTime = durationInMinutes * 60;
        emit MinimumCalculateRewardTimeSet(calculateRewardMinimumTime);
    }

    /**
     * @dev Withdraw MBLK from the contract by the owner.
     *
     * Requirements:
     * - Only the contract owner can call this function.
     *
     * Effects:
     * - Transfers the amount of Rewards Deposited of MBLK by owner from the contract to the owner's address.
     *
     * Emits a WithDrawnAll event to log the withdrawal of MBLK 
    */ 
    function withdrawOnlyOwner() public onlyOwner{
        uint256 ownersDepositedFundsAsRewards = mblkToken.balanceOf(address(this)) - totalMblkStaked;
        mblkToken.safeTransfer(msg.sender, ownersDepositedFundsAsRewards);
        emit WithDrawnAll(msg.sender,ownersDepositedFundsAsRewards );
    }

    function pauseStaking() public onlyOwner{
        require( isPaused == false, "Already Paused");
        isPaused = true;
        emit PausedStaking();
    }

    function unPauseStaking() public onlyOwner {
        require( isPaused == true,"Already Unpaused");
        isPaused = false;
        emit UnpausedStaking();
    }
    /**
     * @dev Get the total amount of SMBLK (Staked MBLK) minted.
     * @return The total number of SMBLK tokens that have been minted as rewards.
    */
    function totalSMBLK()public view returns(uint256){
        return totalSmblkMinted;
    }
 
    /**
     * @dev Get the total amount of SLP (Staked LP) tokens minted.
     * @return The total number of SLP tokens that have been minted as rewards.
    */
    function totalSLP()public view returns(uint256){
        return totalSlpMinted;
    }

    /**
     * @dev Get information about a user's MBLK stake.
     * @param userAddress The address of the user.
     * @return (
     *   1. The amount of MBLK staked by the user,
     *   2. The start timestamp of the stake,
     *   3. The end timestamp of the stake,
     *   4. The claimed reward amount,
     *   5. The last claimed timestamp,
     *   6. The amount of Staked MBLK minted,
     * )
    */
    function userMBLKStakeInformation( 
        address userAddress
    ) 
        public 
        view 
        returns(
            uint256,
            uint256,
            uint256,
            uint256, 
            uint256,
            uint256
        )
    {
        MBLKStake memory userStake = userMblkStakes[userAddress];
        return(
            userStake.mblkAmount,
            userStake.startTimestamp,
            userStake.endTime,
            userStake.claimedReward, 
            userStake.lastClaimedTimeStamp,
            userStake.smblkMinted
        );
    }

    /**
     * @dev Get information about a user's LP stake.
     * @param userAddress The address of the user.
     * @return (
     *   1. The amount of LP tokens staked by the user,
     *   2. The start timestamp of the stake,
     *   3. The end timestamp of the stake,
     *   4. The claimed reward amount,
     *   5. The last claimed timestamp,
     *   6. The amount of Staked LP tokens minted,
     * )
    */
    function userLPStakesInformation( 
        address userAddress
    ) 
        public 
        view 
        returns(
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
         
        )
    {
        LPStake memory userStake = userLpStakes[userAddress]; 
        return(
            userStake.lpAmount,
            userStake.startTimestamp,
            userStake.endTime,
            userStake.claimedReward, 
            userStake.lastClaimedTimeStamp, 
            userStake.slpMinted
           
        ); 
    }

    /**
     * @dev Get the total amount of rewards available for distribution.
     * @return The total number of rewards 
     */

    function getTotalRewards()public view returns(uint256) {
        return totalRewards;
    } 
 
    /**
     * @dev Get staking information for a specific cycle.
     * @param _cycleId The identifier of the staking cycle to retrieve information for.
     * @return (
     *   1. The cycle ID,
     *   2. The block timestamp when the cycle was updated,
     *   3. The total amount of MBLK tokens staked in the cycle,
     *   4. The total reward associated with the cycle,
     *   5. The total amount of LP tokens staked in the cycle.
     * )
     *
     * Requirements:
     * - The provided _cycleId must be within a valid range (not exceeding currentCycleId).
     */
    function getStakingInfo(
        uint256 _cycleId
    ) 
        public 
        view 
        returns(
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    { 
        require(_cycleId <= currentCycleId, "Cycle Id is out of Range");
        return(
            stakingInfo[_cycleId].cycleId,
            stakingInfo[_cycleId].blockTimeStamp,
            stakingInfo[_cycleId].totalMblkStaked,
            stakingInfo[_cycleId].totalReward, 
            stakingInfo[_cycleId].totalLpStaked
        ); 
    } 
   
}
