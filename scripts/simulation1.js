const { ethers } = require('hardhat');
const readline = require('readline');

async function main() {
        let owner;
        let user1;
        let user2;
        let user3;
        let mblkToken;
         let PairAddress;
        let lpTokenAddress;
        let lptokenbalanceBefore;
        let lpToken;
        let stakingPool;
        const DYNAMIC_REWARD_DURATION = 3600;
 
  const VESTING_PERIOD = 3 * 31536000 //3 years
  const TOTAL_REWARDS = 10000;
  let wethContract;
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');  //Provider
        const RouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
        const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const uniswapFactoryContract = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
        const wethAbi = [
                'function approve(address _spender, uint256 _value) external returns (bool)',
                'function transfer(address _to, uint256 _value) external returns (bool)',
                'function deposit() external payable',
                'function balanceOf(address _owner) external view returns (uint256)'];
        const Factory = await ethers.getContractAt("IUniswapV2Factory", uniswapFactoryContract); // Initialzing Factory
          [owner,user1] = await ethers.getSigners();
     
          const MblkToken = await ethers.getContractFactory('MBLK'); 
          const MBLK_INITIAL_SUPPLY = ethers.utils.parseEther('100000');

          mblkToken = await MblkToken.connect(owner).deploy(MBLK_INITIAL_SUPPLY);
    
          await mblkToken.deployed().then(res => {
            console.log("MBLK Token deployed successfully");  //Factory Contract deployed
          });
    
          const mblkaddress = mblkToken.address;
    
          wethContract = new ethers.Contract(wethAddress, wethAbi, owner); //Initializing Weth Contract
          const amountToWrap = ethers.utils.parseEther("10"); // Amount of ETH which need to be wrapped
    
          await wethContract.connect(owner).deposit({ value: amountToWrap }); //Wrapping ETH
            // Create the pair
          await Factory.connect(owner).createPair(mblkaddress, wethAddress); //Creating Pair on Factory with mblk and weth
     
          PairAddress = await Factory.getPair(mblkaddress, wethAddress);
          const pairContract = await ethers.getContractAt("IUniswapV2Pair", PairAddress);
          lpTokenAddress = await pairContract.token0();  //Getting the LP token Address
          
          lpToken = await ethers.getContractAt("IERC20", lpTokenAddress);
    
         
    
          const StakingPool = await ethers.getContractFactory('MBLKStakingPool');
    
          stakingPool = await StakingPool.connect(owner).deploy(mblkaddress, wethAddress, RouterAddress, lpTokenAddress);
    
          await stakingPool.deployed();
    
    
          await mblkToken.connect(owner).transfer(user1.address,amountToWrap)
          await wethContract.connect(owner).transfer(user1.address,amountToWrap)
          await stakingPool.connect(owner).setDynamicRewardDuration( DYNAMIC_REWARD_DURATION);
          //await stakingPool.connect(owner).setFixedRateRewardPercentage(3000);
         // await mblkToken.connect(owner).transfer(stakingPool.address,ethers.utils.parseEther('10000'));

   const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

   rl.question('What type of staking you want?\n1. MBLK staking\n2. LP token staking\nChoose an option (1 or 2): ', async (choice) => {
    try {
      if (choice === '1') {
         const mblkBalance = await mblkToken.balanceOf(user1.address);
        console.log(`User MBLK balance: ${ethers.utils.formatEther(mblkBalance)} MBLK`);

         rl.question('Enter the amount of MBLK to stake  : ', async (amount) => {
          try {                
                //console.log(`Staked ${ethers.utils.formatEther(mblkAmountToStake)} MBLK tokens.`);

            //const mblkAmountToStake = ethers.utils.parseEther(amount);
            const mblkAmountToStake = ethers.utils.parseEther(amount);
             rl.question('Enable compounding? (yes/no): ', async (enableCompounding) => {
              try {
                const isCompounding = enableCompounding.toLowerCase() === 'yes';

                 await mblkToken.connect(user1).approve(stakingPool.address, mblkAmountToStake);
                await stakingPool.connect(user1).stakeMBLK(mblkAmountToStake, isCompounding);

                console.log(`Staked ${ethers.utils.formatEther(mblkAmountToStake)} MBLK tokens.`);
                rl.close();
                process.exit(0);
              } catch (error) {
                console.error('Error:', error);
                process.exit(1);
              }
            });
          } catch (error) {
            console.error('Error:', error);
            process.exit(1);
          }
        });
      } else if (choice === '2') {
         const lpBalance = await lpToken.balanceOf(user1.address);
        console.log(`User LP token balance: ${ethers.utils.formatEther(lpBalance)} LP tokens`);

         rl.question('Enter the amount of LP tokens to stake  : ', async (amount) => {
          try {
            //const lpAmountToStake = ethers.utils.parseEther(lpAmount);
            const lpAmountToStake = ethers.utils.parseEther(amount)
             await lpToken.connect(user1).approve(stakingPool.address, lpAmountToStake);
            await stakingPool.connect(user1).StakeLPtoken(lpAmountToStake);

            console.log(`${ethers.utils.formatEther(lpAmountToStake)} LP tokens staked.`);
            rl.close();
            process.exit(0);
          } catch (error) {
            console.error('Error:', error);
            process.exit(1);
          }
        });
      } else {
        console.error('Invalid choice. ');
        rl.close();
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });
}

 main();
