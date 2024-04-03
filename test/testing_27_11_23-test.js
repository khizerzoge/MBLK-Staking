const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('MBLKstaking Contract', function () {
  let stakingPool;
  let mblkToken;
  let smblkToken;
  let lpToken;
  let slpToken;
  let owner;
  let user1;
  let user2;
  let user3;
  let feesCollectionWallet;
  let newFeesCollectionWallet;

  async function advanceTime(timeInSeconds) {
    await network.provider.send("evm_increaseTime", [timeInSeconds]);
    await network.provider.send("evm_mine", []);
  }

  //  function customGreaterThan(value1, value2) {
  //         const bn1 = new BigNumber(value1);
  //         //console.log("V1 : ",bn1)
  //         const bn2 = new BigNumber(value2);
  //         //console.log("V2 : ",bn2)
  //         return bn1.isGreaterThan(bn2);
  //       };

  beforeEach(async function () {
    [owner, user1, user2, user3, feesCollectionWallet, newFeesCollectionWallet] = await ethers.getSigners();

    const initial_supply = ethers.utils.parseEther('5000000000')

    const MBLKToken = await ethers.getContractFactory("MBLK");
    mblkToken = await MBLKToken.deploy(initial_supply);

    const LPToken = await ethers.getContractFactory("LPtest");
    lpToken = await LPToken.deploy(initial_supply);

    const StakingPool = await ethers.getContractFactory("MBLKStakingPool");

    stakingPool = await StakingPool.deploy(
      mblkToken.address,
      // smblkToken.address,
      //slpToken.address,
      lpToken.address,
      feesCollectionWallet.address
    );

    await stakingPool.deployed();

    await stakingPool.connect(owner).addAdmin(owner.address);
    await stakingPool.connect(owner).setFeesPercentage('2');
    await stakingPool.connect(owner).setMinimumCalculateRewardTime("60");
    // await stakingPool.connect(owner).setMinimumThreshold(60)
    await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
    await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('500'));
    await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('500'));

    await stakingPool.connect(owner).updateCycleId()
    //console.log("CYCLE ID ",await stakingPool.currentCycleId())



  });
  describe('Staking MBLK', function () {

    it('Allows user to stake NON-Zero MBLK tokens', async function () {
      const mblkAmount = ethers.utils.parseEther('1000');
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);
      await stakingPool.connect(user1).stakeMBLK(mblkAmount);
      const userStake = await stakingPool.userMblkStakes(user1.address);
      expect(userStake.mblkAmount).to.equal(mblkAmount);
      const stakedBalanceAfter = await mblkToken.balanceOf(stakingPool.address);
      expect(stakedBalanceAfter.toString()).to.equal("2000000000000000000000");
      const totalStaked = await stakingPool.totalSmblkMinted();
      expect(totalStaked).to.equal(mblkAmount);
      const totalMBLKStakedValue = await stakingPool.totalMblkStaked();
      expect(totalMBLKStakedValue).to.equal(mblkAmount);
      expect(userStake.cycleId).to.equal(2);
    });





    it('Reverts when staking zero amount', async function () {
      await expect(
        stakingPool.connect(user1).stakeMBLK(0)
      ).to.be.revertedWith('Amount must be greater than 0');
    });

    it('Reverts when staking negative amount', async function () {
      await expect(
        stakingPool.connect(user1).stakeMBLK(-1000)
      ).to.be.reverted;
    });
    it('Reverts when User balance is lesser than the Amount to stake', async function () {
      let mblkAmount = ethers.utils.parseEther('10000000');
      await expect(
        stakingPool.connect(user1).stakeMBLK(mblkAmount)
      ).to.be.reverted;
    });
    it('Reverts when amount to stake is not approved', async function () {
      let mblkAmount = ethers.utils.parseEther('10000000');
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);

      await expect(
        stakingPool.connect(user1).stakeMBLK(mblkAmount)
      ).to.be.reverted;
    });
    it('Reverts when User stake again', async function () {
      let mblkAmount = ethers.utils.parseEther('10000000');
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
      await stakingPool.connect(user1).stakeMBLK(mblkAmount);

      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
      await expect(
        stakingPool.connect(user1).stakeMBLK(mblkAmount)
      ).to.be.revertedWith('Existing active stake found');
    });


  })

  describe('Staking LP tokens', function () {

    it('Allows user to stake NON-Zero LP tokens', async function () {
      const lpAmount = ethers.utils.parseEther('1000');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      const stakedBalanceBefore = await lpToken.balanceOf(stakingPool.address);

      await stakingPool.connect(user1).stakeLP(lpAmount);
      const userStake = await stakingPool.userLpStakes(user1.address);

      expect(userStake.lpAmount).to.equal(lpAmount);
      const stakedBalanceAfter = await lpToken.balanceOf(stakingPool.address);

      expect(stakedBalanceAfter).to.equal(lpAmount);

      const totalStaked = await stakingPool.totalSlpMinted();
      expect(totalStaked).to.equal(lpAmount);
      const totalLPStakedValue = await stakingPool.totalLpStaked();
      expect(totalLPStakedValue).to.equal(lpAmount);

      expect(userStake.cycleId).to.equal(2);

    });



    it('Reverts when staking zero amount', async function () {
      await expect(
        stakingPool.connect(user1).stakeLP(0)
      ).to.be.revertedWith('Amount must be greater than 0');
    });

    it('Reverts when staking negative amount', async function () {
      await expect(
        stakingPool.connect(user1).stakeLP(-1000)
      ).to.be.reverted;
    });
    it('Reverts when User balance is lesser than the Amount to stake', async function () {
      let lpAmount = ethers.utils.parseEther('10000000');
      await expect(
        stakingPool.connect(user1).stakeLP(lpAmount)
      ).to.be.revertedWith('Not enough Balance');;
    });
    it('Reverts when amount to stake is not approved', async function () {
      let lpAmount = ethers.utils.parseEther('10000000');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);

      await expect(
        stakingPool.connect(user1).stakeLP(lpAmount)
      ).to.be.reverted;
    });
    it('Reverts when User stake again', async function () {
      let lpAmount = ethers.utils.parseEther('10000000');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      await stakingPool.connect(user1).stakeLP(lpAmount);

      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      await expect(
        stakingPool.connect(user1).stakeLP(lpAmount)
      ).to.be.revertedWith('Existing LP Stake Found');
    });


  })
  describe('Calculate Rewards For MBLK Stake', function () {

    it('Should Calculate Correct rewards for three Cycles', async function () {
      const mblkAmount = ethers.utils.parseEther('10');
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

      await stakingPool.connect(user1).stakeMBLK(mblkAmount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const userReward3 = await stakingPool.calculateReward(user1.address, 0, true);
      console.log("User reward", userReward3.toString());
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).updateCycleId();
      const userReward2 = await stakingPool.calculateReward(user1.address, 0, true);
      console.log("User reward", userReward2.toString());
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();

      const userReward = await stakingPool.calculateReward(user1.address, 0, true);
      console.log("User reward", userReward.toString());

      const estimatedUserRewards = 90000000000000000000;

      expect(userReward.toString()).to.equal(estimatedUserRewards.toString());
    });

    it('should skip the cycles when totalStake is 0', async function () {
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const Amount = ethers.utils.parseEther('10');
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      await stakingPool.connect(user1).stakeMBLK(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const r1 = await stakingPool.calculateReward(user1.address, 0, true)
      console.log('r1', r1)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const r2 = await stakingPool.calculateReward(user1.address, 0, true)
      console.log('r2', r2)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const r3 = await stakingPool.calculateReward(user1.address, 0, true)
      console.log('r2', r3)
      expect(r3.toString()).to.equal("90000000000000000000")

    })
    it('should calculate rewards from specific cycle for MBLK stake', async function () {
      // Simulate a scenario where the user has stakes in multiple cycles for MBLK
      const mblkAmount = ethers.utils.parseEther('10');
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

      await stakingPool.connect(user1).stakeMBLK(mblkAmount);
      // Set up stakingInfo and userMblkStakes for different cycles in the contract
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();

      const userReward2 = await stakingPool.calculateReward(user1.address, 3, true);
      expect(userReward2.toString()).to.equal(ethers.utils.parseEther('60'))

    });

    it('should handle when uptoCycleId is 0 for MBLK stake', async function () {
      // Simulate a scenario where uptoCycleId is set as 0 for MBLK stakes
      const mblkAmount = ethers.utils.parseEther('10');
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

      await stakingPool.connect(user1).stakeMBLK(mblkAmount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const userReward2 = await stakingPool.calculateReward(user1.address, 0, true);
      expect(userReward2.toString()).to.equal(ethers.utils.parseEther('60'))

    });
    it('should revert back when staking information is missing for MBLK stake', async function () {

      await expect(stakingPool.calculateReward(user1.address, 0, true)).to.be.revertedWith('No Stakes Found')

    });
    it('should handle when current cycle ID is less than uptoCycleId for MBLK stake', async function () {
      await expect(stakingPool.calculateReward(user1.address, 50, true)).to.be.revertedWith('uptoCycleId is out of range')
    });

    it('Should revert when No stakes found', async function () {
      const mblkAmount = ethers.utils.parseEther('100');
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);

      await expect(
        stakingPool.calculateReward(user1.address, 0, true)
      ).to.be.revertedWith('No Stakes Found');
      //expect(userReward.toString()).to.equal(estimatedUserRewards.toString()); 
    });



    it('Should return 0 when elapsed time from last claim is less than MinimumRewardTime', async function () {
      const mblkAmount = ethers.utils.parseEther('100');
      await stakingPool.connect(owner).setMinimumCalculateRewardTime(60); //Setting it 1 hour
      await mblkToken.connect(owner).transfer(user1.address, mblkAmount);
      await mblkToken.connect(user1).approve(stakingPool.address, mblkAmount);
      await stakingPool.connect(user1).stakeMBLK(mblkAmount);

      const rewards = await stakingPool.calculateReward(user1.address, 0, true)
      expect(rewards).to.equal(0)

    });


  })
  describe('Calculate Rewards For LP Stake', function () {

    it('Should Calculate Correct rewards for three Cycles', async function () {
      const lpAmount = ethers.utils.parseEther('10');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

      await stakingPool.connect(user1).stakeLP(lpAmount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const userReward3 = await stakingPool.calculateReward(user1.address, 0, false);
      console.log("User reward", userReward3.toString());
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const userReward2 = await stakingPool.calculateReward(user1.address, 0, false);
      console.log("User reward", userReward2.toString());
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).updateCycleId();

      const userReward = await stakingPool.calculateReward(user1.address, 0, false);
      console.log("User reward", userReward.toString());

      const estimatedUserRewards = 210000000000000000000;

      expect(userReward.toString()).to.equal(estimatedUserRewards.toString());
    });

    it('should calculate rewards from specific cycle for LP stake', async function () {
      // Simulate a scenario where the user has stakes in multiple cycles for MBLK
      const Amount = ethers.utils.parseEther('10');
      await lpToken.connect(owner).transfer(user1.address, Amount);
      await lpToken.connect(user1).approve(stakingPool.address, Amount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

      await stakingPool.connect(user1).stakeLP(Amount);
      // Set up stakingInfo and userMblkStakes for different cycles in the contract
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();

      const userReward2 = await stakingPool.calculateReward(user1.address, 3, false);
      expect(userReward2.toString()).to.equal(ethers.utils.parseEther('140'))

    });

    it('should handle when uptoCycleId is 0 for LP stake', async function () {
      // Simulate a scenario where uptoCycleId is set as 0 for MBLK stakes
      const Amount = ethers.utils.parseEther('10');
      await lpToken.connect(owner).transfer(user1.address, Amount);
      await lpToken.connect(user1).approve(stakingPool.address, Amount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);

      await stakingPool.connect(user1).stakeLP(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const userReward2 = await stakingPool.calculateReward(user1.address, 0, false);
      expect(userReward2.toString()).to.equal(ethers.utils.parseEther('140'))

    });
    it('should revert back when staking information is missing for LP stake', async function () {

      await expect(stakingPool.calculateReward(user1.address, 0, false)).to.be.revertedWith('No Stakes Found')

    });
    it('should handle when current cycle ID is less than uptoCycleId for LP stake', async function () {
      await expect(stakingPool.calculateReward(user1.address, 50, false)).to.be.revertedWith('uptoCycleId is out of range')
    });

    it('should skip the cycles when totalStake is 0', async function () {
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const Amount = ethers.utils.parseEther('10');
      await lpToken.connect(owner).transfer(user1.address, Amount);
      await lpToken.connect(user1).approve(stakingPool.address, Amount);
      await stakingPool.connect(user1).stakeLP(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const r1 = await stakingPool.calculateReward(user1.address, 0, false)
      console.log('r1', r1)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const r2 = await stakingPool.calculateReward(user1.address, 0, false)
      console.log('r2', r2)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('50'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('50'))

      await stakingPool.connect(owner).updateCycleId();
      const r3 = await stakingPool.calculateReward(user1.address, 0, false)
      console.log('r3', r3)
      expect(r3.toString()).to.equal("210000000000000000000")

    })


    it('Should revert when No stakes found', async function () {
      const lpAmount = ethers.utils.parseEther('100');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);

      await expect(
        stakingPool.calculateReward(user1.address, 0, false)
      ).to.be.revertedWith('No Stakes Found');
      //expect(userReward.toString()).to.equal(estimatedUserRewards.toString()); 
    });



    it('Should return 0 when elapsed time from last claim is less than MinimumTimeSet', async function () {
      const lpAmount = ethers.utils.parseEther('100');
      await stakingPool.connect(owner).setMinimumCalculateRewardTime(60); //Setting it 0 
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      await stakingPool.connect(user1).stakeLP(lpAmount);

      const rewards = await stakingPool.calculateReward(user1.address, 0, false)
      expect(rewards).to.equal(0)

    });
  })


  describe('Claim Rewards For LP stakes', function () {
    it('Allows user to Claim the rewards', async function () {
      const lpAmount = ethers.utils.parseEther('10');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);
      //console.log("STAKING POOL BALANCE: ",stakedBalanceBefore)
      await stakingPool.connect(user1).stakeLP(lpAmount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();

      const stakedBalanceAFter = await mblkToken.balanceOf(stakingPool.address);
      // console.log("BALANCE AFTER: ",stakedBalanceAFter)
      await stakingPool.connect(user1).claimRewardsLP(0);
      //console.log("User reward",userReward.toString());
      const balanceUserAfter = await mblkToken.balanceOf(user1.address);

      const estimatedUserRewards = 419916000000000000000; // rewards after Subtracting the 2% fees

      expect(balanceUserAfter.toString()).to.equal(estimatedUserRewards.toString());

      const feeswalletBalance = await mblkToken.balanceOf(feesCollectionWallet.address);
      //console.log("FeesCollected: ",feeswalletBalance);
      expect(feeswalletBalance.toString()).to.equal('84000000000000000')
    })

    it('should revert when user tries to stake without claiming total Cycle reward', async function () {
      const Amount = ethers.utils.parseEther('10');
      const balanceofUserBefore = await lpToken.balanceOf(user1.address)
      //console.log("Balance of user before: ",balanceofUserBefore)
      await lpToken.connect(owner).transfer(user1.address, Amount);
      await lpToken.connect(user1).approve(stakingPool.address, Amount);

      await stakingPool.connect(user1).stakeLP(Amount);
      //const r0 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r0)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      //const r1 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r1)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      //const r2 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      // console.log("Rewards for cycle1: ", r2)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      //const r3 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r3)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      //const r4 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      // console.log("Rewards for cycle1: ", r4)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();


      const userReward = await stakingPool.connect(user1).claimRewardsLP(4);

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      const AmountAgain = ethers.utils.parseEther('20');
      await lpToken.connect(owner).transfer(user1.address, AmountAgain);
      await lpToken.connect(user1).approve(stakingPool.address, AmountAgain)
      await expect(stakingPool.connect(user1).updateStake(AmountAgain, false)).to.be.revertedWith('Please claim the rewards first');

    })

    it('Allows user to Claim the rewards for 4 cycles', async function () {
      const lpAmount = ethers.utils.parseEther('10');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);
      //console.log("STAKING POOL BALANCE: ",stakedBalanceBefore)
      await stakingPool.connect(user1).stakeLP(lpAmount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();

      const stakedBalanceAFter = await mblkToken.balanceOf(stakingPool.address);
      // console.log("BALANCE AFTER: ",stakedBalanceAFter)
      await stakingPool.connect(user1).claimRewardsLP(4);
      //console.log("User reward",userReward.toString());
      const balanceUserAfter = await mblkToken.balanceOf(user1.address);

      const estimatedUserRewards = 419916000000000000000; // rewards after Subtracting the 2% fees

      expect(balanceUserAfter.toString()).to.equal(estimatedUserRewards.toString());

      const feeswalletBalance = await mblkToken.balanceOf(feesCollectionWallet.address);

      expect(feeswalletBalance.toString()).to.equal('84000000000000000')
    })



    it('Should revert when no Stakes Found', async function () {
      const lpAmount = ethers.utils.parseEther('100');
      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      const stakedBalanceBefore = await lpToken.balanceOf(stakingPool.address);
      await expect(
        stakingPool.connect(user1).claimRewardsLP(0)
      ).to.be.revertedWith("No LP Stake found");


    })

    it('Should return 0 rewards if there is no rewards', async function () {
      const lpAmount = ethers.utils.parseEther('100');
      //await stakingPool.connect(owner).setDynamicReward(ethers.utils.parseEther('500'))
      //await stakingPool.connect(owner).setFixedReward(ethers.utils.parseEther('500'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('500'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('500'))

      await lpToken.connect(owner).transfer(user1.address, lpAmount);
      await lpToken.connect(user1).approve(stakingPool.address, lpAmount);
      const mblkBalanceBefore = await mblkToken.balanceOf(user1.address);
      await stakingPool.connect(user1).stakeLP(lpAmount)


      //const mblkBalanceAfter = await mblkToken.balanceOf(user1.address);
      await expect(stakingPool.connect(user1).claimRewardsLP(0)).to.be.revertedWith('No rewards to claim')

    })

  })

  describe('Claim Rewards For MBLK stakes', function () {
    it('Allows user to Claim the rewards', async function () {
      const Amount = ethers.utils.parseEther('10');
      const balanceofUserBefore = await mblkToken.balanceOf(user1.address)
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);
      //console.log("STAKING POOL BALANCE: ",stakedBalanceBefore)
      await stakingPool.connect(user1).stakeMBLK(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();

      const stakedBalanceAFter = await mblkToken.balanceOf(stakingPool.address);
      // console.log("BALANCE AFTER: ",stakedBalanceAFter)

      const userReward = await stakingPool.connect(user1).claimRewardsMBLK(0);
      //console.log("User reward",userReward.toString());
      const balanceUserAfter = await mblkToken.balanceOf(user1.address);


      const estimatedUserRewards = 179964000000000000000; // rewards after Subtracting the 2% fees
      expect(balanceUserAfter.toString()).to.equal(estimatedUserRewards.toString())


      const feeswalletBalance = await mblkToken.balanceOf(feesCollectionWallet.address);
      expect(feeswalletBalance.toString()).to.equal('36000000000000000') //2% of rewards
    })

    it('Allows user to Claim the rewards for 4 cycles', async function () {
      const Amount = ethers.utils.parseEther('10');
      const balanceofUserBefore = await mblkToken.balanceOf(user1.address)
      //console.log("Balance of user before: ",balanceofUserBefore)
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);
      //console.log("STAKING POOL BALANCE: ",stakedBalanceBefore)
      await stakingPool.connect(user1).stakeMBLK(Amount);
      //const r0 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r0)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      //const r1 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r1)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      //const r2 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      // console.log("Rewards for cycle1: ", r2)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      //const r3 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r3)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      //const r4 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      // console.log("Rewards for cycle1: ", r4)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();

      //  const stakedBalanceAFter = await mblkToken.balanceOf(stakingPool.address);
      // console.log("BALANCE AFTER: ",stakedBalanceAFter)

      const userReward = await stakingPool.connect(user1).claimRewardsMBLK(4);
      //console.log("User reward",userReward.toString());
      const balanceUserAfter = await mblkToken.balanceOf(user1.address);
      console.log("Balance After", balanceUserAfter)

      const feeswalletBalance = await mblkToken.balanceOf(feesCollectionWallet.address);
      console.log("FEES WALLET: ", feeswalletBalance)
      expect(feeswalletBalance.toString()).to.equal('36000000000000000') //2% of rewards
      const estimatedUserRewards = 179964000000000000000; // rewards after Subtracting the 2% fees
      expect(balanceUserAfter.toString()).to.equal(estimatedUserRewards.toString())


    })
    it('should revert when user tries to stake without claiming total Cycle reward', async function () {
      const Amount = ethers.utils.parseEther('10');
      const balanceofUserBefore = await mblkToken.balanceOf(user1.address)
      //console.log("Balance of user before: ",balanceofUserBefore)
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);
      //console.log("STAKING POOL BALANCE: ",stakedBalanceBefore)
      await stakingPool.connect(user1).stakeMBLK(Amount);
      //const r0 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r0)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      //const r1 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r1)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      //const r2 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      // console.log("Rewards for cycle1: ", r2)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      //const r3 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      //console.log("Rewards for cycle1: ", r3)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      //const r4 = await stakingPool.connect(user1).calculateReward(user1.address,0,true)
      // console.log("Rewards for cycle1: ", r4)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();


      const userReward = await stakingPool.connect(user1).claimRewardsMBLK(4);

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();
      const AmountAgain = ethers.utils.parseEther('20');
      await mblkToken.connect(owner).transfer(user1.address, AmountAgain);
      await mblkToken.connect(user1).approve(stakingPool.address, AmountAgain)
      await expect(stakingPool.connect(user1).updateStake(AmountAgain, true)).to.be.revertedWith('Please claim the rewards first');

    })

    it('Should revert when no Stakes Found', async function () {
      const Amount = ethers.utils.parseEther('100');
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      const stakedBalanceBefore = await mblkToken.balanceOf(stakingPool.address);
      await expect(
        stakingPool.connect(user1).claimRewardsMBLK(0)
      ).to.be.revertedWith("No single MBLK stake found");


    })

    it('Should revert when no rewards if there is no rewards', async function () {
      const Amount = ethers.utils.parseEther('100');
      //await stakingPool.connect(owner).setDynamicReward(owner.address,ethers.utils.parseEther('100'))
      //await stakingPool.connect(owner).setFixedReward(ethers.utils.parseEther('100'))



      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      const mblkBalanceBefore = await mblkToken.balanceOf(user1.address);
      await stakingPool.connect(user1).stakeMBLK(Amount)

      await expect(stakingPool.connect(user1).claimRewardsMBLK(0)).to.be.revertedWith('No rewards to claim')


    })
  })

  describe('Updating the MBLK stakes', function () {
    it('Allows user to Update the existing MBLK stake', async function () {
      const Amount = ethers.utils.parseEther('100');
      const balanceofUserBefore = await mblkToken.balanceOf(user1.address)
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      await stakingPool.connect(user1).stakeMBLK(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      await stakingPool.connect(owner).updateCycleId();

      const stakedBalanceAFter = await mblkToken.balanceOf(stakingPool.address);
      // console.log("BALANCE AFTER: ",stakedBalanceAFter)

      const userReward = await stakingPool.connect(user1).claimRewardsMBLK(0);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await stakingPool.connect(user1).updateStake(Amount, true);
      const userStake = await stakingPool.userMblkStakes(user1.address)
      //console.log("userStakes: ",userStake)
      expect(userStake.mblkAmount.toString()).to.equal(ethers.utils.parseEther('200'))
      expect(userStake.smblkMinted.toString()).to.equal(ethers.utils.parseEther('200'))
      const tsmblkMinted = await stakingPool.totalSmblkMinted()
      expect(tsmblkMinted.toString()).to.equal(ethers.utils.parseEther('200'))
      expect(userStake.cycleId).to.equal(5)

    })


    it('Should revert if reward not claimed', async function () {
      const Amount = ethers.utils.parseEther('10');
      const balanceofUserBefore = await mblkToken.balanceOf(user1.address)
      await mblkToken.connect(owner).transfer(user1.address, Amount);
      await mblkToken.connect(user1).approve(stakingPool.address, Amount);
      await stakingPool.connect(user1).stakeMBLK(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();

      const stakedBalanceAFter = await mblkToken.balanceOf(stakingPool.address);

      await mblkToken.connect(owner).transfer(user1.address, Amount);

      // console.log("BALANCE AFTER: ",stakedBalanceAFter)
      await expect(
        stakingPool.connect(user1).updateStake(20, true)
      ).to.be.revertedWith("Please claim the rewards first");

    })



    it('Should revert if Stake does not exist', async function () {
      const Amount = ethers.utils.parseEther('10');
      await mblkToken.connect(owner).transfer(user1.address, Amount)

      await expect(
        stakingPool.connect(user1).updateStake(Amount, true)
      ).to.be.revertedWith("No Stakes Found");

    })
    it('Should revert if Stake is negative number', async function () {
      const Amount = -1000;
      //mblkToken.connect(owner).transfer(user1.address,Amount)

      await expect(
        stakingPool.connect(user1).updateStake(Amount, true)
      ).to.be.reverted;

    })
    it('Should revert if stake amount is 0', async function () {
      const Amount = 0;
      await mblkToken.connect(owner).transfer(user1.address, Amount)

      await expect(
        stakingPool.connect(user1).updateStake(Amount, true)
      ).to.be.reverted;

    })

  })
  describe('Updating the Lp stakes', function () {
    it('Allows user to Update the existing LP stake', async function () {

      const Amount = ethers.utils.parseEther('10');
      const balanceofUserBefore = await mblkToken.balanceOf(user1.address)
      await lpToken.connect(owner).transfer(user1.address, Amount);
      await lpToken.connect(user1).approve(stakingPool.address, Amount);
      await stakingPool.connect(user1).stakeLP(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))


      const currentCycleId1 = await stakingPool.currentCycleId();
      console.log("currentCycleId", currentCycleId1)
      const userCycleID1 = await stakingPool.userLpStakes(user1.address);
      console.log("USER CYCLE ID1: ", userCycleID1)
      await stakingPool.connect(owner).updateCycleId();

      const stakedBalanceAFter = await mblkToken.balanceOf(stakingPool.address);
      // console.log("BALANCE AFTER: ",stakedBalanceAFter)

      const userReward = await stakingPool.connect(user1).claimRewardsLP(0);
      const currentCycleId = await stakingPool.currentCycleId();
      console.log("currentCycleId", currentCycleId)
      const userCycleID = await stakingPool.userLpStakes(user1.address);
      console.log("USER CYCLE ID: ", userCycleID)
      await lpToken.connect(owner).transfer(user1.address, Amount);
      await lpToken.connect(user1).approve(stakingPool.address, Amount);

      await stakingPool.connect(user1).updateStake(Amount, false);
      const userStake = await stakingPool.userLpStakes(user1.address)
      //console.log('userStake LP ',userStake)

      expect(userStake.lpAmount.toString()).to.equal(ethers.utils.parseEther('20'))

    })
    it('Should revert if reward not claimed', async function () {
      const Amount = ethers.utils.parseEther('10');
      const balanceofUserBefore = await lpToken.balanceOf(user1.address)
      await lpToken.connect(owner).transfer(user1.address, Amount);
      await lpToken.connect(user1).approve(stakingPool.address, Amount);
      await stakingPool.connect(user1).stakeLP(Amount);
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))



      await stakingPool.connect(owner).updateCycleId();
      await lpToken.connect(owner).transfer(user1.address, Amount)

      // console.log("BALANCE AFTER: ",stakedBalanceAFter)
      await expect(
        stakingPool.connect(user1).updateStake(Amount, false)
      ).to.be.revertedWith("Please claim the rewards first");

    })

    it('Should revert if Stake does not exist', async function () {
      const Amount = ethers.utils.parseEther('10');
      await lpToken.connect(owner).transfer(user1.address, Amount);

      await expect(
        stakingPool.connect(user1).updateStake(Amount, false)
      ).to.be.revertedWith("No Stakes Found");

    })

    it('Should revert if Stake is negative number', async function () {
      const Amount = -1000;
      await lpToken.connect(owner).transfer(user1.address, 1000000);

      await expect(
        stakingPool.connect(user1).updateStake(Amount, false)
      ).to.be.reverted;

    })
    it('Should revert if stake amount is 0', async function () {
      const Amount = 0;
      await lpToken.connect(owner).transfer(user1.address, 5000000);

      await expect(
        stakingPool.connect(user1).updateStake(Amount, false)
      ).to.be.reverted;

    })


  })
  describe('Owner Only Functions', function () {
    it('Allows Owner to set OnlyOwner Functions', async function () {
      advanceTime(24 * 60 * 60)

      //await mblkToken.connect(owner).transfer(stakingPool.address,ethers.utils.parseEther('1000'))
      const amount = ethers.utils.parseEther('10')
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, amount)
      await stakingPool.connect(owner).setFixedReward(owner.address, amount)
      await expect(stakingPool.connect(owner).updateCycleId()).to.not.be.reverted;
      await stakingPool.connect(owner).withdrawOnlyOwner()

      await stakingPool.connect(owner).setMinimumStakeDuration(60);
      const minimumStakeDuration = await stakingPool.minimumStakeDuration()
      expect(minimumStakeDuration).to.equal(3600)



      await stakingPool.connect(owner).setFeeWalletAddress(user1.address)
      const feesW = await stakingPool.feesCollectionWallet()
      expect(feesW).to.equal(user1.address)

      //await stakingPool.connect(owner).setMinimumCalculateRewardTime(60)
      const calculateRewardMinimumTime = await stakingPool.calculateRewardMinimumTime()
      expect(calculateRewardMinimumTime).to.equal(3600)

      await stakingPool.connect(owner).addAdmin(user2.address);
      await expect(stakingPool.connect(user2).setFeesPercentage(6)).to.not.be.reverted;




    })

    it('Should revert if not called by owner', async function () {

      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('1000'))
      await expect(stakingPool.connect(user1).withdrawOnlyOwner()).to.be.reverted;

      await expect(stakingPool.connect(user1).setMinimumStakeDuration(60)).to.be.reverted;

      await expect(stakingPool.connect(user1).setFeeWalletAddress(user1.address)).to.be.reverted;

      await expect(stakingPool.connect(user1).setMinimumCalculateRewardTime(60)).to.be.reverted;

    })
    it('Should revert if set Garbage values', async function () {

      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('1000'))
      await expect(stakingPool.connect(user1).withdrawOnlyOwner()).to.be.reverted;

      await expect(stakingPool.connect(user1).setMinimumStakeDuration(-100)).to.be.reverted;


      await expect(stakingPool.connect(user1).setFeeWalletAddress(123123)).to.be.reverted;

      await expect(stakingPool.connect(user1).setMinimumCalculateRewardTime(-10000)).to.be.reverted;

    })
    it('should be reverted if owner calls updateCycleId without setting the rewards', async function () {
      advanceTime(24 * 60 * 60)

      const amount = ethers.utils.parseEther('10')
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))

      await stakingPool.connect(owner).setDynamicReward(owner.address, amount)
      await stakingPool.connect(owner).setFixedReward(owner.address, amount)
      await stakingPool.connect(owner).updateCycleId();
      advanceTime(24 * 60 * 60)
      await expect(stakingPool.connect(owner).updateCycleId()).to.be.revertedWith('Rewards are not set');


    })
  })
  describe('Withdraw MBLK', function () {

    it('Allows User to withDraw Some Amount of tokens ', async function () {
      const Amount = ethers.utils.parseEther("50")
      const balanceBeforeUser = await mblkToken.balanceOf(user1.address)

      await mblkToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      const balanceBefore = await mblkToken.balanceOf(user1.address);
      //console.log("BALANCE AFTER TRANSFER: ",balanceBefore)
      await mblkToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeMBLK(Amount)
      const BalanceStaked = await mblkToken.balanceOf(user1.address);
      //console.log("BALANCE AFTER BalanceStaked: ",BalanceStaked)


      await stakingPool.connect(user1).withdrawMBLK(ethers.utils.parseEther('45'))
      let balanceAfter = await mblkToken.balanceOf(user1.address);
      expect(balanceAfter).to.equal("45000000000000000000")

    })
    it('Allows User to withDraw Some Amount of tokens after claiming', async function () {
      const Amount = ethers.utils.parseEther("50")
      const balanceBeforeUser = await mblkToken.balanceOf(user1.address)
      // console.log("BALANCE BEFORE ",balanceBeforeUser)
      await mblkToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      const balanceBefore = await mblkToken.balanceOf(user1.address);
      //console.log("BALANCE AFTER TRANSFER: ",balanceBefore)
      await mblkToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeMBLK(Amount)
      const BalanceStaked = await mblkToken.balanceOf(user1.address);

      advanceTime(24 * 60 * 60)

      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).updateCycleId()

      advanceTime(24 * 60 * 60)
      await stakingPool.connect(user1).claimRewardsMBLK(0)
      const balanceClaimed = await mblkToken.balanceOf(user1.address);
      // console.log("BALANCE AFTER balanceClaimed: ",balanceClaimed) //Rewards 
      await stakingPool.connect(user1).withdrawMBLK(ethers.utils.parseEther('45'))
      let balanceAfter = await mblkToken.balanceOf(user1.address);
      expect(balanceAfter).to.equal("104988000000000000000")
      const smblkMinted = await stakingPool.totalSmblkMinted()
      expect(smblkMinted).to.equal(ethers.utils.parseEther('5'))
      const mblkStaked = await stakingPool.totalMblkStaked()

      expect(mblkStaked).to.equal(ethers.utils.parseEther('5').toString())

    })

    it('Revert when withdrawing without claiming rewards ', async function () {
      const Amount = ethers.utils.parseEther("50")
      await mblkToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await mblkToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeMBLK(Amount)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5800'));

      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5800'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)


      await expect(stakingPool.connect(user1).withdrawMBLK(ethers.utils.parseEther('45'))).to.be.reverted;


    })

    it('Revert when withdrawing Amount greater than staked ', async function () {
      const Amount = ethers.utils.parseEther("1")
      await mblkToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await mblkToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeMBLK(Amount)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)


      await expect(stakingPool.connect(user1).withdrawMBLK(ethers.utils.parseEther('45'))).to.be.reverted;


    })
    it('Revert when withdrawing same Amount as staked', async function () {
      const Amount = ethers.utils.parseEther("45")
      await mblkToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await mblkToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeMBLK(Amount)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)


      await expect(stakingPool.connect(user1).withdrawMBLK(ethers.utils.parseEther('45'))).to.be.reverted;


    })
    it('Revert when withdrawing Before minimum time stake', async function () {
      const Amount = ethers.utils.parseEther("45")
      await stakingPool.connect(owner).setMinimumStakeDuration(50)
      await mblkToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await mblkToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeMBLK(Amount)

      await expect(stakingPool.connect(user1).withdrawMBLK(ethers.utils.parseEther('45'))).to.be.reverted;


    })
    it('Revert when withdrawing 0 amount', async function () {
      const Amount = ethers.utils.parseEther("45")
      await stakingPool.connect(owner).setMinimumStakeDuration(50)
      await mblkToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await mblkToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeMBLK(Amount)

      await expect(stakingPool.connect(user1).withdrawMBLK(ethers.utils.parseEther('0'))).to.be.reverted;


    })


  })
  describe('Withdraw LP Token', function () {

    it('Allows User to withDraw Some Amount of tokens ', async function () {
      const Amount = ethers.utils.parseEther("50")
      //console.log("BALANCE BEFORE ",balanceBeforeUser)
      await lpToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      //console.log("BALANCE AFTER TRANSFER: ",balanceBefore)
      await lpToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeLP(Amount)
      const BalanceStaked = await lpToken.balanceOf(user1.address);
      //console.log("BALANCE AFTER BalanceStaked: ",BalanceStaked)


      await stakingPool.connect(user1).withdrawLP(ethers.utils.parseEther('45'))
      let balanceAfter = await lpToken.balanceOf(user1.address);
      expect(balanceAfter).to.equal("45000000000000000000")

    })
    it('Allows User to withDraw Some Amount of tokens after claiming', async function () {
      const Amount = ethers.utils.parseEther("50")
      const balanceBeforeUser = await mblkToken.balanceOf(user1.address)
      // console.log("BALANCE BEFORE ",balanceBeforeUser)
      await lpToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('51'));
      const balanceBefore = await lpToken.balanceOf(user1.address);
      //console.log("BALANCE AFTER TRANSFER: ",balanceBefore)
      await lpToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeLP(Amount)
      const BalanceStaked = await lpToken.balanceOf(user1.address);

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1000'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('100'))
      await stakingPool.connect(owner).updateCycleId()

      advanceTime(24 * 60 * 60)
      await stakingPool.connect(user1).claimRewardsLP(0)
      const balanceClaimed = await mblkToken.balanceOf(user1.address);
      //console.log("BALANCE AFTER balanceClaimed: ",balanceClaimed) //Rewards 
      await stakingPool.connect(user1).withdrawLP(ethers.utils.parseEther('45'))
      let balanceAfter = await lpToken.balanceOf(user1.address);
      expect(balanceAfter).to.equal("46000000000000000000")
      const slpMinted = await stakingPool.totalSlpMinted()
      expect(slpMinted).to.equal(ethers.utils.parseEther('5'))
      const lpStaked = await stakingPool.totalLpStaked()

      expect(lpStaked).to.equal(ethers.utils.parseEther('5').toString())

    })

    it('Revert when withdrawing without claiming rewards ', async function () {
      const Amount = ethers.utils.parseEther("50")
      await lpToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await lpToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeLP(Amount)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('50000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)


      await expect(stakingPool.connect(user1).withdrawLP(ethers.utils.parseEther('45'))).to.be.reverted;

    })

    it('Revert when withdrawing Amount greater than staked ', async function () {
      const Amount = ethers.utils.parseEther("1")
      await lpToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await lpToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeLP(Amount)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)


      await expect(stakingPool.connect(user1).withdrawLP(ethers.utils.parseEther('45'))).to.be.reverted;


    })
    it('Revert when withdrawing same Amount as staked', async function () {
      const Amount = ethers.utils.parseEther("45")
      await lpToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await lpToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeLP(Amount)
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('5000'));
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther("100"))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther("100"))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('200'));
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)

      await expect(stakingPool.connect(user1).withdrawLP(ethers.utils.parseEther('45'))).to.be.reverted;


    })

    it('Revert when withdrawing Before minimum time stake', async function () {
      const Amount = ethers.utils.parseEther("45")
      await stakingPool.connect(owner).setMinimumStakeDuration(50)
      await lpToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await lpToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeLP(Amount)

      await expect(stakingPool.connect(user1).withdrawLP(ethers.utils.parseEther('45'))).to.be.reverted;

    })

    it('Revert when 0 Amount', async function () {
      const Amount = ethers.utils.parseEther("45")
      //wait stakingPool.connect(owner).setMinimumStakeDuration(50)
      await lpToken.connect(owner).transfer(user1.address, ethers.utils.parseEther('50'));
      await lpToken.connect(user1).approve(stakingPool.address, Amount)
      await stakingPool.connect(user1).stakeLP(Amount)

      await expect(stakingPool.connect(user1).withdrawLP(ethers.utils.parseEther('0'))).to.be.reverted;


    })
  })

  describe('Contract When Paused', function () {

    it('Should Revert the Functions for staking when paused', async function () {
      await stakingPool.connect(owner).pauseStaking();
      let amount = ethers.utils.parseEther('100')
      await mblkToken.connect(owner).transfer(user1.address, amount);
      await mblkToken.connect(user1).approve(stakingPool.address, amount);
      await lpToken.connect(owner).transfer(user1.address, amount);
      await lpToken.connect(user1).approve(stakingPool.address, amount);
      await expect(stakingPool.connect(user1).stakeMBLK(amount)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(user1).stakeLP(amount)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(user1).updateStake(amount, true)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(user1).updateStake(amount, false)).to.be.revertedWith('Contract is paused')

    })
    it('Should Revert the Functions for calculate and Claiming when Paused', async function () {
      let amount = ethers.utils.parseEther('100')
      await mblkToken.connect(owner).transfer(user1.address, amount);
      await mblkToken.connect(user1).approve(stakingPool.address, amount);
      await lpToken.connect(owner).transfer(user1.address, amount);
      await lpToken.connect(user1).approve(stakingPool.address, amount);

      await stakingPool.connect(user1).stakeMBLK(amount)

      await stakingPool.connect(user1).stakeLP(amount)

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('24'))
      await stakingPool.connect(owner).updateCycleId()
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('24'))
      await stakingPool.connect(owner).updateCycleId()
      await stakingPool.connect(owner).pauseStaking();
      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('24'))
      await stakingPool.connect(owner).updateCycleId()
      await expect(stakingPool.connect(owner).calculateReward(user1.address, 0, true)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(owner).calculateReward(user1.address, 0, false)).to.be.revertedWith('Contract is paused')

      await expect(stakingPool.connect(owner).claimRewardsMBLK(0)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(owner).claimRewardsLP(0)).to.be.revertedWith('Contract is paused')

    })
    it('Should allow withdraw staking when paused', async function () {
      let amount = ethers.utils.parseEther('100')
      await mblkToken.connect(owner).transfer(user1.address, amount);
      await mblkToken.connect(user1).approve(stakingPool.address, amount);
      await lpToken.connect(owner).transfer(user1.address, amount);
      await lpToken.connect(user1).approve(stakingPool.address, amount);

      await stakingPool.connect(user1).stakeMBLK(amount)
      await stakingPool.connect(user1).stakeLP(amount)

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('24'))
      await stakingPool.connect(owner).updateCycleId()

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('24'))
      await stakingPool.connect(owner).updateCycleId()
      await stakingPool.connect(owner).pauseStaking();

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await mblkToken.connect(owner).transfer(stakingPool.address, ethers.utils.parseEther('24'))
      await stakingPool.connect(owner).updateCycleId()
      const userStakeMblk1 = await stakingPool.userMblkStakes(user1.address)
      console.log("MBLK: ", userStakeMblk1)
      const userStakeLp1 = await stakingPool.userLpStakes(user1.address)
      console.log("LP: ", userStakeLp1)

      const mblkBalanceBefore = await mblkToken.balanceOf(user1.address)
      const lpBalanceBefore = await lpToken.balanceOf(user1.address)

      await stakingPool.connect(user1).withdrawMBLK(amount);
      const mblkBalanceAfter = await mblkToken.balanceOf(user1.address)
      await stakingPool.connect(user1).withdrawLP(amount);
      const lpBalanceAfter = await lpToken.balanceOf(user1.address)
      expect(mblkBalanceAfter.toString()).to.equal(amount)
      expect(lpBalanceAfter.toString()).to.equal(amount)
      const userStakeMblk = await stakingPool.userMblkStakes(user1.address)
      console.log("MBLK: ", userStakeMblk)
      const userStakeLp = await stakingPool.userLpStakes(user1.address)
      console.log("LP: ", userStakeLp)

      console.log('AMounts: ', userStakeMblk.mblkAmount.toString(), userStakeLp.lpAmount.toString())
      await expect(userStakeMblk.mblkAmount.toString().toString()).to.equal('0')
      await expect(userStakeLp.lpAmount.toString().toString()).to.equal('0')
      // await expect(stakingPool.totalMblkStaked().toString()).to.equal(0)

    })
    it('Should allow Staking After unpausing', async function () {
      let amount = ethers.utils.parseEther('1')
      await mblkToken.connect(owner).transfer(user1.address, amount);
      await mblkToken.connect(user1).approve(stakingPool.address, amount);
      await lpToken.connect(owner).transfer(user1.address, amount);
      await lpToken.connect(user1).approve(stakingPool.address, amount);

      await stakingPool.connect(owner).pauseStaking()
      await expect(stakingPool.connect(user1).stakeMBLK(amount)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(user1).stakeLP(amount)).to.be.revertedWith('Contract is paused')

      await stakingPool.connect(owner).unPauseStaking()
      await stakingPool.connect(user1).stakeMBLK(amount)
      await stakingPool.connect(user1).stakeLP(amount)
      const userStakesmblk = await stakingPool.userMblkStakes(user1.address)
      const userStakesLp = await stakingPool.userLpStakes(user1.address)
      console.log("AMOUNTS STAKED: ", userStakesmblk.mblkAmount, userStakesLp.lpAmount)
      expect(userStakesmblk.mblkAmount.toString()).to.equal(amount)
      expect(userStakesLp.lpAmount.toString()).to.equal(amount)

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).updateCycleId()

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).updateCycleId()


      await stakingPool.connect(owner).pauseStaking()
      await expect(stakingPool.connect(user1).calculateReward(user1.address, 0, true)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(user1).calculateReward(user1.address, 0, false)).to.be.revertedWith('Contract is paused')

      await expect(stakingPool.connect(user1).claimRewardsMBLK(0)).to.be.revertedWith('Contract is paused')
      await expect(stakingPool.connect(user1).claimRewardsLP(0)).to.be.revertedWith('Contract is paused')

      await stakingPool.connect(owner).unPauseStaking()
      await stakingPool.connect(user1).claimRewardsMBLK(0)
      await stakingPool.connect(user1).claimRewardsLP(0)
      console.log("Rewards Claimed")

      advanceTime(24 * 60 * 60)
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await mblkToken.connect(owner).approve(stakingPool.address, ethers.utils.parseEther('1220'))
      await stakingPool.connect(owner).setDynamicReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).setFixedReward(owner.address, ethers.utils.parseEther('12'))
      await stakingPool.connect(owner).updateCycleId()

      const mblkBalanceBefore = await mblkToken.balanceOf(user1.address)
      const lpBalanceBefore = await lpToken.balanceOf(user1.address)
      await stakingPool.connect(user1).claimRewardsMBLK(0)
      await stakingPool.connect(user1).claimRewardsLP(0)
      await stakingPool.connect(user1).withdrawMBLK(amount);
      const mblkBalanceAfter = await mblkToken.balanceOf(user1.address)
      await stakingPool.connect(user1).withdrawLP(amount);
      const lpBalanceAfter = await lpToken.balanceOf(user1.address)
      expect(mblkBalanceAfter.toString()).to.equal("72985600000000000000")
      expect(lpBalanceAfter.toString()).to.equal(amount)
      const mblkStakes = await stakingPool.userMblkStakes(user1.address)
      const lpStakes = await stakingPool.userLpStakes(user1.address)
      console.log('AMounts: ', mblkStakes.mblkAmount.toString(), lpStakes.lpAmount.toString())
      await expect(mblkStakes.mblkAmount.toString()).to.equal('0')
      await expect(lpStakes.lpAmount.toString()).to.equal('0')


    })

    it('should revert when not called by owner', async function () {
      await expect(stakingPool.connect(user1).pauseStaking()).to.be.reverted;
      await stakingPool.connect(owner).pauseStaking()
      await expect(stakingPool.connect(user1).unPauseStaking()).to.be.reverted;

    })
    it('should revert when called double', async function () {
      await stakingPool.connect(owner).pauseStaking()
      await expect(stakingPool.connect(owner).pauseStaking()).to.be.revertedWith('Already Paused');
      await stakingPool.connect(owner).unPauseStaking()
      await expect(stakingPool.connect(owner).unPauseStaking()).to.be.revertedWith('Already Unpaused');

    })

  })

});