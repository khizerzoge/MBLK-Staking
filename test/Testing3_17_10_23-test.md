const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require('bignumber.js');

describe("MBLKStakingPool", function () {
  let mblkToken;
  let sMBLKToken;
  let sLPToken;
  let lpToken;
  let stakingPool;
  let owner;
  let user1;
  let user2;
  let user3;
  let newFeesCollectionWallet;
   
  async function advanceTime(timeInSeconds) {
    await network.provider.send("evm_increaseTime", [timeInSeconds]);
    await network.provider.send("evm_mine", []);
  }
  function customGreaterThan(value1, value2) {
    const bn1 = new BigNumber(value1);
    //console.log("V1 : ",bn1)
    const bn2 = new BigNumber(value2);
    //console.log("V2 : ",bn2)
    return bn1.isGreaterThan(bn2);
  };
  beforeEach(async () => {
    [owner, user1,user2,user3,newFeesCollectionWallet] = await ethers.getSigners();

    const initial_supply = ethers.utils.parseEther('5000000000')

    const MBLKToken = await ethers.getContractFactory("MBLK");
    mblkToken = await MBLKToken.deploy(initial_supply);

    const StakedMBLK = await ethers.getContractFactory("MBLKStaked");
    sMBLKToken = await StakedMBLK.deploy();

    const StakedLP = await ethers.getContractFactory("LPStaked");
    sLPToken = await StakedLP.deploy();

    const LPToken = await ethers.getContractFactory("LPtest");
    lpToken = await LPToken.deploy(initial_supply);

    const StakingPool = await ethers.getContractFactory("MBLKStakingPool");

    stakingPool = await StakingPool.deploy(
      mblkToken.address,
     // sMBLKToken.address,
     // sLPToken.address,
      lpToken.address,
      owner.address
    );

    await stakingPool.deployed();

    await mblkToken.connect(owner).transfer(stakingPool.address,ethers.utils.parseEther('100'));
    await stakingPool.connect(owner).addAdmin(owner.address);
    await stakingPool.connect(owner).setFeesPercentage('2');
    await stakingPool.connect(owner).setMinimumCalculateRewardTime("60");

    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(5000);
    await sLPToken.connect(owner).grantMinterRole(stakingPool.address);
    await sMBLKToken.connect(owner).grantMinterRole(stakingPool.address);
    await lpToken.connect(owner).transfer(user1.address,ethers.utils.parseEther('50'))
    await mblkToken.connect(owner).transfer(user1.address,ethers.utils.parseEther('50'))
    await lpToken.connect(owner).transfer(user2.address,ethers.utils.parseEther('50'))
    await mblkToken.connect(owner).transfer(user2.address,ethers.utils.parseEther('50'))
    await lpToken.connect(owner).transfer(user3.address,ethers.utils.parseEther('50'))
    await mblkToken.connect(owner).transfer(user3.address,ethers.utils.parseEther('50'))
  

  });

  it("should stake MBLK tokens", async function () {
 
    const mblkAmount = 1000;
    await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
    const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

    await stakingPool.connect(user1).stakeMBLK(mblkAmount);
    const userStake = await stakingPool.userMBLKStakes(user1.address);
    
    expect(userStake.mblkAmount).to.equal(mblkAmount);

  
      const stakedBalanceAfter = await mblkToken.balanceOf(stakingPool.address);
    // expect(stakedBalance).to.greaterThan(mblkAmount);
     expect(customGreaterThan(stakedBalanceAfter.toString(), stakedBalanceBefore.toString())).to.be.true;

      const totalStaked = await stakingPool.totalSMBLKminted();
     expect(totalStaked).to.equal(mblkAmount);
  
 
   
  });


  it("should stake LP tokens", async function () {
    const lpAmount = 1000;

    await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
    const stakedBalanceBefore = await lpToken.balanceOf(stakingPool.address);

    await stakingPool.connect(user1).StakeLPtoken(lpAmount);
    const userStake = await stakingPool.userLPstake(user1.address);
     expect(userStake.lpAmount).to.equal(lpAmount);

    
      // expect(lpAmount).to.be.above(0);

      const stakedBalanceAfter = await lpToken.balanceOf(stakingPool.address);
    // expect(stakedBalance).to.greaterThan(mblkAmount);
     expect(customGreaterThan(stakedBalanceAfter.toString(), stakedBalanceBefore.toString())).to.be.true;

      const totalStaked = await stakingPool.totalSLPminted();
     expect(totalStaked).to.equal(lpAmount);
 
  
  });
  it("Should update MBLK stake correctly", async function () {
    const amountToStake = 100;
    const isMBLK = true;
    await mblkToken.connect(user1).approve(stakingPool.address, amountToStake);

    await stakingPool.connect(user1).stakeMBLK(amountToStake);

    await mblkToken.connect(user1).approve(stakingPool.address, amountToStake);

    const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

    await stakingPool.connect(user1).updateStake(amountToStake, isMBLK);

      
    const userStake = await stakingPool.userMBLKStakes(user1.address);

    expect(userStake.mblkAmount).to.equal(200);
 

      const stakedBalanceAfter = await mblkToken.balanceOf(stakingPool.address);
    // expect(stakedBalance).to.greaterThan(mblkAmount);
     expect(customGreaterThan(stakedBalanceAfter.toString(), stakedBalanceBefore.toString())).to.be.true;

      const totalStaked = await stakingPool.totalSMBLKminted();
     expect(totalStaked).to.equal(userStake.mblkAmount);

  });

  it("Should update LP stake correctly", async function () {
    const amountToStake = 200;
    const isMBLK = false;
    await lpToken.connect(user1).approve(stakingPool.address, amountToStake);

    await stakingPool.connect(user1).StakeLPtoken(amountToStake);

    await lpToken.connect(user1).approve(stakingPool.address, amountToStake);

    const stakedBalanceBefore = await lpToken.balanceOf(stakingPool.address);

    await stakingPool.connect(user1).updateStake(amountToStake, isMBLK);

    const stakedBalanceAfter = await lpToken.balanceOf(stakingPool.address);

     const userStake = await stakingPool.userLPstake(user1.address);
    expect(userStake.lpAmount).to.equal(400);
 
    expect(customGreaterThan(stakedBalanceAfter.toString(), stakedBalanceBefore.toString())).to.be.true;

      const totalStaked = await stakingPool.totalSLPminted();
     expect(totalStaked).to.equal(userStake.lpAmount);


  });

  it("should calculate MBLK rewards", async function () {
    const mblkAmount = 1000;

    await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
   // console.log("CURRET CYCLE",await stakingPool.currentCycleId())
    await stakingPool.connect(owner).UpdateCycleId();

    await advanceTime(60 * 60)
    //console.log("CURRET CYCLE",await stakingPool.currentCycleId())

    await stakingPool.connect(owner).setDynamicReward(5320);
    await stakingPool.connect(owner).setFixedReward(5330);
    await stakingPool.connect(user1).stakeMBLK(mblkAmount);
    const userStake = await stakingPool.userMBLKStakes(user1.address);
   // console.log("USER STAKE: ",userStake)
    await stakingPool.connect(owner).UpdateCycleId();
   // console.log("CURRET CYCLE",await stakingPool.currentCycleId())
    await advanceTime(60 * 60)
    await stakingPool.connect(owner).setDynamicReward(1320);
    await stakingPool.connect(owner).setFixedReward(10);
     await stakingPool.connect(owner).UpdateCycleId();
   // console.log("CURRET CYCLE",await stakingPool.currentCycleId())
    await advanceTime(60 * 60)
    await stakingPool.connect(owner).setDynamicReward(1320);
    await stakingPool.connect(owner).setFixedReward(1022);
     await stakingPool.connect(owner).UpdateCycleId();

    const rewards = await stakingPool.calculateReward(user1.address, true);
   // console.log("REWARD: ",rewards.toNumber())

    expect(rewards.toNumber()).to.be.greaterThan(0);
  });

  it("should calculate LP rewards", async function () {
    const lpAmount = 1000;

    const userStake = await stakingPool.userLPstake(user1.address);
   // console.log("userStake: ",userStake)
   // console.log("CURRET CYCLE",await stakingPool.currentCycleId())
    await advanceTime(60 * 60)
    await lpToken.connect(user2).approve(stakingPool.address, lpAmount);

    await lpToken.connect(user3).approve(stakingPool.address, lpAmount);

    await stakingPool.connect(user2).StakeLPtoken(lpAmount);
   // console.log('LP STAKED2')
    await stakingPool.connect(user3).StakeLPtoken(lpAmount);
   // console.log('LP STAKED3')
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(5000);
     await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60)
   // console.log("CURRET CYCLE",await stakingPool.currentCycleId())
    await stakingPool.connect(owner).setDynamicReward(9000);
    await stakingPool.connect(owner).setFixedReward(1000);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60)
   // console.log("CURRET CYCLE",await stakingPool.currentCycleId())

    await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
    
  //  console.log("CURRET CYCLE",await stakingPool.currentCycleId())
    await advanceTime(60 * 60)
    await stakingPool.connect(user1).StakeLPtoken(lpAmount);
  //  console.log('LP STAKED')
    const userStake2 = await stakingPool.userLPstake(user1.address);
   // console.log("userStake: ",userStake2)
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(72220);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60)
  //  console.log("CURRET CYCLE",await stakingPool.currentCycleId())

    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60)
  //  console.log("CURRET CYCLE",await stakingPool.currentCycleId())
    const userStake3 = await stakingPool.userLPstake(user1.address);
    //console.log("userStake: ",userStake3)
    await stakingPool.connect(owner).UpdateCycleId();
    const currentCycleId = await stakingPool.currentCycleId();
    const RewardStruct = await stakingPool.getStakingInfo(currentCycleId)
    //console.log("CURRENT STRUCT INFO : ",RewardStruct)

    const rewards = await stakingPool.calculateReward(user1.address, false);
  //  console.log("REWARD: ",rewards.toNumber())
    expect(rewards.toNumber()).to.be.greaterThan(0);
  });

  it("should claim MBLK rewards", async function () {
    const mblkAmount = 1000;
    await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);

    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(720);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();

    await stakingPool.connect(user1).stakeMBLK(mblkAmount);
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();

    const rewardsBefore =  await mblkToken.balanceOf(user1.address) ;
    const before =  rewardsBefore.toString()
    //console.log(before)
    

    
    await stakingPool.connect(user1).claimRewardsMBLK();
    const rewardsAfter = await mblkToken.balanceOf(user1.address) ;

   
    const After =  rewardsAfter.toString()

    //console.log(rewardsAfter)
//  function customGreaterThan(value1, value2) {
//       const bn1 = new BigNumber(value1);
//       const bn2 = new BigNumber(value2);
//       return bn1.isGreaterThan(bn2);
//     }
   // const after= BigNumber.from(rewardsAfter)
   expect(customGreaterThan(After, before)).to.be.true;
  });

  it("should claim LP rewards", async function () {
    const lpAmount = 1000;
    await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
    await advanceTime(60 * 60) 
   // console.log("Current Cycle ",await stakingPool.currentCycleId())
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(720);
    await stakingPool.connect(owner).UpdateCycleId();
    //console.log("Current Cycle ",await stakingPool.currentCycleId())
   // console.log(await stakingPool.userLPstake(user1.address))
    //console.log("stakingInfo ",await stakingPool.stakingInfo(await stakingPool.currentCycleId()))

    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
    //console.log("Current Cycle ",await stakingPool.currentCycleId())
    await stakingPool.connect(user1).StakeLPtoken(lpAmount);

   // console.log("stakingInfo ",await stakingPool.stakingInfo(await stakingPool.currentCycleId()))
    //console.log(await stakingPool.userLPstake(user1.address))

    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
   // console.log("Current Cycle ",await stakingPool.currentCycleId())
    //console.log("stakingInfo ",await stakingPool.stakingInfo(await stakingPool.currentCycleId()))


    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
    //console.log("Current Cycle ",await stakingPool.currentCycleId())
    //console.log("stakingInfo ",await stakingPool.stakingInfo(await stakingPool.currentCycleId()))

    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
    //console.log("Current Cycle ",await stakingPool.currentCycleId())

    //console.log("stakingInfo ",await stakingPool.stakingInfo(await stakingPool.currentCycleId()))

       const rewardsBefore =  await mblkToken.balanceOf(user1.address) ;
    const before =  rewardsBefore.toString()
    //console.log(before)
    

    
    await stakingPool.connect(user1).ClaimRewardsLP();
    const rewardsAfter = await mblkToken.balanceOf(user1.address) ;

   
    const After =  rewardsAfter.toString()

    //console.log(rewardsAfter)
//  function customGreaterThan(value1, value2) {
//       const bn1 = new BigNumber(value1);
//       const bn2 = new BigNumber(value2);
//       return bn1.isGreaterThan(bn2);
//     }
   // const after= BigNumber.from(rewardsAfter)
   expect(customGreaterThan(After, before)).to.be.true;
  });

  it("should withdraw MBLK stakes", async function () {
    const mblkAmount = 1000;
    await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(720);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();

    await stakingPool.connect(user1).stakeMBLK(mblkAmount);
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();
    await advanceTime(60 * 60) 
    await stakingPool.connect(owner).setDynamicReward(5000);
    await stakingPool.connect(owner).setFixedReward(7220);
    await stakingPool.connect(owner).UpdateCycleId();

    const stakedMBLKBefore = await sMBLKToken.balanceOf(user1.address);
    const MBLKBalanceBefore = await mblkToken.balanceOf(user1.address);
   // console.log("BALANCE OF MBLK BEFORE",MBLKBalanceBefore)

    await stakingPool.connect(user1).claimRewardsMBLK();

    await stakingPool.connect(user1).withdrawMBLK(mblkAmount);
    const stakedMBLKAfter = await sMBLKToken.balanceOf(user1.address);
   // console.log("Staked",stakedMBLKAfter.toString())
    const MBLKBalanceAfter = await mblkToken.balanceOf(user1.address);
   // console.log("BALANCE OF MBLK AFTER",MBLKBalanceAfter)
 
    // function customGreaterThan(value1, value2) {
    //   const bn1 = new BigNumber(value1);
    //   //console.log("V1 : ",bn1)
    //   const bn2 = new BigNumber(value2);
    //   //console.log("V2 : ",bn2)
    //   return bn1.isGreaterThan(bn2);
    // }
    expect(customGreaterThan(MBLKBalanceAfter.toString(), MBLKBalanceBefore.toString())).to.be.true;
    expect(customGreaterThan(stakedMBLKBefore.toString(), stakedMBLKAfter.toString())).to.be.true;


  });

  it("should withdraw LP stakes", async function () {
    const lpAmount = 1000;
    await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
    await stakingPool.connect(user1).StakeLPtoken(lpAmount);

    const stakedLPBefore = await sLPToken.balanceOf(user1.address);
    await stakingPool.connect(user1).withdrawLP(lpAmount);
    const stakedLPAfter = await sLPToken.balanceOf(user1.address);

    //expect(stakedLPAfter).to.be.lessThan(stakedLPBefore);
    // function customGreaterThan(value1, value2) {
    //   const bn1 = new BigNumber(value1);
    //   //console.log("V1 : ",bn1)
    //   const bn2 = new BigNumber(value2);
    //   //console.log("V2 : ",bn2)
    //   return bn1.isGreaterThan(bn2);
    // }
    expect(customGreaterThan(stakedLPBefore.toString(), stakedLPAfter.toString())).to.be.true;
   // expect(customGreaterThan(stakedMBLKBefore.toString(), stakedMBLKAfter.toString())).to.be.true;
  });

 
  it("should Update Current Cycle ID and Information", async function () {
    await stakingPool.UpdateCycleId();
    const stakingInfo = await stakingPool.stakingInfo(1);

    expect(stakingInfo.CycleId).to.equal(1);
  });
   
  it("should set Minimum Stake Duration", async function () {
    await stakingPool.connect(owner).setMinimumStakeDuration(5);
    const mblkAmount = ethers.utils.parseEther('2');
    await mblkToken.connect(user1).approve(stakingPool.address,mblkAmount)
    await stakingPool.connect(user1).stakeMBLK(mblkAmount);
    const balanceBeforeWithdrawal = await mblkToken.balanceOf(user1.address);
   // console.log("BALANCE Before MBLK: ",balanceBeforeWithdrawal)
    await advanceTime(5 * 60) 
    await stakingPool.connect(user1).withdrawMBLK(mblkAmount)
    const balanceAfterWithdrawal = await mblkToken.balanceOf(user1.address);
   // console.log("BALANCE After MBLK: ",balanceAfterWithdrawal)

    expect(customGreaterThan(balanceAfterWithdrawal.toString(), balanceBeforeWithdrawal.toString())).to.be.true;

   });

   it("should set Minimum Threshold Time", async function () {
    await stakingPool.connect(owner).setMinimumThreshold(12);
    const minimumThresholdValue = await stakingPool.minimumThreshold()
    expect(minimumThresholdValue).to.be.equal(12*60);
   });

  //  it("should set Minimum Threshold Time", async function () {
  //   await stakingPool.connect(owner).setMinimumThreshold(12);
  //   const minimumThresholdValue = await stakingPool.minimumThreshold()
  //   expect(minimumThresholdValue).to.be.equal.to(12);
  //  });

   it('Should set fixed reward time', async function () {
    const newDuration = 10; // Duration in minutes

    await stakingPool.connect(owner).setFixedRewardTime(newDuration);

    const timeForFixedReward = await stakingPool.TimeForFixedReward();

    expect(timeForFixedReward).to.be.equal(newDuration * 60);
  });

  it('Should set dynamic reward time', async function () {
    const newDuration = 15; // Duration in minutes

    await stakingPool.connect(owner).setDynamicRewardTime(newDuration);

    const timeForDynamicReward = await stakingPool.TimeForDynamicReward();

    expect(timeForDynamicReward).to.be.equal(newDuration * 60);
  });
  it('Should set minimum calculate reward time', async function () {
    const newDuration = 20; // Duration in minutes

    await stakingPool.connect(owner).setMinimumCalculateRewardTime(newDuration);

    const calculateRewardMinimumTime = await stakingPool.calculateRewardMinimumTime();

    expect(calculateRewardMinimumTime).to.be.equal(newDuration * 60);
  });
  it('Should set fee wallet address', async function () {
    await stakingPool.connect(owner).setFeeWalletAddress(newFeesCollectionWallet.address);

    const updatedWalletAddress = await stakingPool.feesCollectionWallet();

    expect(updatedWalletAddress).to.be.equal(newFeesCollectionWallet.address);
  });

  it('Should add a new admin by owner', async function () {
    await stakingPool.connect(owner).addAdmin(user1.address);

    const isAdmin = await stakingPool.isAdmin(user1.address);

    expect(isAdmin).to.equal(true);
  });

  it('Should remove an admin by owner', async function () {

    await stakingPool.connect(owner).addAdmin(user1.address);

     
    await stakingPool.connect(owner).removeAdmin(user1.address);

    const isAdmin = await stakingPool.isAdmin(user1.address);

    expect(isAdmin).to.equal(false);
  });
  it('Should change MBLK token address by owner', async function () {
    await stakingPool.connect(owner).changeMBLKTokenAddress(user1.address);

    const updatedMBLKTokenAddress = await stakingPool.mblkToken();

    expect(updatedMBLKTokenAddress).to.equal(user1.address);
  });
  it('Should change LP token address by owner', async function () {
    await stakingPool.connect(owner).changeLPTokenAddress(user1.address);

    const updatedLPTokenAddress = await stakingPool.lpToken();

    expect(updatedLPTokenAddress).to.equal(user1.address);
  });
  it('Should change SLP token address by owner', async function () {
    await stakingPool.connect(owner).changeSLPTokenAddress(user1.address);

    const updatedSLPTokenAddress = await stakingPool.sLPToken();

    expect(updatedSLPTokenAddress).to.equal(user1.address);
  });
  it('Should change SMBLK token address by owner', async function () {
    await stakingPool.connect(owner).changeSMBLKTokenAddress(user1.address);

    const updatedSMBLKTokenAddress = await stakingPool.sMBLKToken();

    expect(updatedSMBLKTokenAddress).to.equal(user1.address);
  });
it("Should revert when MBLK staking amount is 0", async function () {
  const amountToStake = 0;
 
  await expect(stakingPool.connect(user1).stakeMBLK(amountToStake)).to.be.revertedWith("Amount must be greater than 0");
});

it("Should revert when LP staking amount is 0", async function () {
  const amountToStake = 0;
 
  await expect(stakingPool.connect(user1).StakeLPtoken(amountToStake)).to.be.revertedWith("Amount must be greater than 0");
});

it("Should revert when Update MBLK Stake amount is 0", async function () {
  const amountToStake = 0;
 
  await expect(stakingPool.connect(user1).updateStake(amountToStake,true)).to.be.revertedWith("Amount must be greater than 0");
});

it("Should revert when Update LP Stake amount is 0", async function () {
  const amountToStake = 0;
 
  await expect(stakingPool.connect(user1).updateStake(amountToStake,false)).to.be.revertedWith("Amount must be greater than 0");
});

it("Should revert when updating the MBLK stake before Staking some MBLK Amount", async function () {
  const amountToStake = 100;
 const isMBLK = true;
 
 await expect(stakingPool.connect(user1).updateStake(amountToStake, isMBLK)).to.be.revertedWith("No Stakes Found");
});

it("Should revert when updating the LP stake before Staking some LP Amount", async function () {
  const amountToStake = 100;
 const isMBLK = false;
 
 await expect(stakingPool.connect(user1).updateStake(amountToStake, isMBLK)).to.be.revertedWith("Existing active stake not found");
});

 

it("Should revert when claiming rewards before updating MBLK stake", async function () {
   const amountToStake = 100;
  const isMBLK = true;
  await mblkToken.connect(user1).approve(stakingPool.address,amountToStake);
  await stakingPool.connect(user1).stakeMBLK(amountToStake);
  // Perform an initial stake
  await advanceTime(60* 60) 
  await stakingPool.connect(owner).UpdateCycleId();

  //await stakingPool.connect(user1).updateStake(amountToStake, isMBLK);
  await advanceTime(60 * 60) 
  await stakingPool.connect(owner).UpdateCycleId();

  await advanceTime(60 * 60) 
  await stakingPool.connect(owner).UpdateCycleId();

  // Try to update the stake without claiming rewards
  await mblkToken.connect(user1).approve(stakingPool.address,amountToStake);

  await expect(stakingPool.connect(user1).updateStake(amountToStake, isMBLK)).to.be.revertedWith("Please claim the rewards first");
});

it("Should revert when claiming rewards before updating LP stake", async function () {
  const amountToStake = 100;
 const isMBLK = false;
 await lpToken.connect(user1).approve(stakingPool.address,amountToStake);
 await stakingPool.connect(user1).StakeLPtoken(amountToStake);
 // Perform an initial stake
 await advanceTime(60* 60) 
 await stakingPool.connect(owner).UpdateCycleId();

 //await stakingPool.connect(user1).updateStake(amountToStake, isMBLK);
 await advanceTime(60 * 60) 
 await stakingPool.connect(owner).UpdateCycleId();

 await advanceTime(60 * 60) 
 await stakingPool.connect(owner).UpdateCycleId();

  await lpToken.connect(user1).approve(stakingPool.address,amountToStake);

 await expect(stakingPool.connect(user1).updateStake(amountToStake, isMBLK)).to.be.revertedWith("Please claim the rewards first");
});


it("Should revert when trying to withdraw with zero MBLK staked amount", async function () {
   await expect(stakingPool.connect(user1).withdrawMBLK(100)
  ).to.be.revertedWith("No Stakes Found");
});

it("Should revert when trying to withdraw with zero LP staked amount", async function () {
  await expect(stakingPool.connect(user1).withdrawLP(100)
 ).to.be.revertedWith("No active stake found");
});
it("Should revert when withdrawing more MBLK tokens than staked", async function () {

  await mblkToken.connect(user1).approve(stakingPool.address,100);
  await stakingPool.connect(user1).stakeMBLK(100);
   const amountToWithdraw = 200;

  await expect(
    stakingPool.connect(user1).withdrawMBLK(amountToWithdraw)
  ).to.be.revertedWith("Not enough MBLK Staked");
});

it("Should revert when withdrawing more LP tokens than staked", async function () {

  await lpToken.connect(user1).approve(stakingPool.address,100);
  await stakingPool.connect(user1).StakeLPtoken(100);
   const amountToWithdraw = 200;

  await expect(
    stakingPool.connect(user1).withdrawLP(amountToWithdraw)
  ).to.be.revertedWith("Not enough LP Staked");
});

it("Should revert when withdrawing MBLK tokens within minimum Stake Duration", async function () {
  await stakingPool.connect(owner).setMinimumStakeDuration(20)
  const amountToStake = 100;
   await mblkToken.connect(user1).approve(stakingPool.address,amountToStake);
  await stakingPool.connect(user1).stakeMBLK(amountToStake);
 
   await expect(
    stakingPool.connect(user1).withdrawMBLK(amountToStake)
  ).to.be.revertedWith("Can not withdraw before Minimum Stake Duration");
});

it("Should revert when withdrawing LP tokens within minimum Stake Duration", async function () {
  await stakingPool.connect(owner).setMinimumStakeDuration(20)
  const amountToStake = 100;
   await lpToken.connect(user1).approve(stakingPool.address,amountToStake);
  await stakingPool.connect(user1).StakeLPtoken(amountToStake);
 
   await expect(
    stakingPool.connect(user1).withdrawLP(amountToStake)
  ).to.be.revertedWith("Can not withdraw before Minimum Stake Duration");
});
it("Should revert when withdrawing MBLK tokens within minimum Stake Duration After Updating the Stake", async function () {
  await stakingPool.connect(owner).setMinimumStakeDuration(20)
  const amountToStake = 100;
   await mblkToken.connect(user1).approve(stakingPool.address,amountToStake);
  await stakingPool.connect(user1).stakeMBLK(amountToStake);
  await mblkToken.connect(user1).approve(stakingPool.address,amountToStake);
  await stakingPool.connect(user1).updateStake(amountToStake,true);

 
   await expect(
    stakingPool.connect(user1).withdrawMBLK(amountToStake)
  ).to.be.revertedWith("Can not withdraw before Minimum Stake Duration");
});
it("Should revert when withdrawing LP tokens within minimum Stake Duration After Updating the Stake ", async function () {
  await stakingPool.connect(owner).setMinimumStakeDuration(20)
  const amountToStake = 100;
   await lpToken.connect(user1).approve(stakingPool.address,amountToStake);
  await stakingPool.connect(user1).StakeLPtoken(amountToStake);
  await lpToken.connect(user1).approve(stakingPool.address,amountToStake);
  await stakingPool.connect(user1).updateStake(amountToStake,false);
 
   await expect(
    stakingPool.connect(user1).withdrawLP(amountToStake)
  ).to.be.revertedWith("Can not withdraw before Minimum Stake Duration");
});

});

