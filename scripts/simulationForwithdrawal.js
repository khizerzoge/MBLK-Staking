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
    
          stakingPool = await StakingPool.connect(owner).deploy(mblkaddress, wethAddress, lpTokenAddress);
    
          await stakingPool.deployed();
    
          await mblkToken.connect(owner).transfer(stakingPool.address,ethers.utils.parseEther('10000'))

          await mblkToken.connect(owner).transfer(user1.address,amountToWrap)
          await wethContract.connect(owner).transfer(user1.address,amountToWrap)
 
          const UniswapRouter = await ethers.getContractAt("IUniswapV2Router02", RouterAddress);

          let amountMBLKToSend = ethers.utils.parseEther('5')  //Amount of MBLK TOken to send
          let amountETHToSend = ethers.utils.parseEther('1')  //Amount of ETH token to send
          await wethContract.connect(owner).deposit({ value: amountETHToSend }); //converting Eth to Weth
      
          const balanceOfownerinMBLK = await mblkToken.balanceOf(owner.address) 
          const balanceOfownerinWeth = await wethContract.balanceOf(owner.address)
          
          //console.log("Balances of Owner", balanceOfownerinMBLK, balanceOfownerinWeth)
          
          
          await mblkToken.connect(owner).transfer(user1.address, amountMBLKToSend) //transfering MBLK amount from Owner to user3
         // console.log("MBLK APPROVED" )
          await wethContract.connect(user1).deposit({ value: amountETHToSend }); //converting Eth to Weth
          // await wethContract.connect(owner).transfer(user3.address, amountETHToSend); //transfering Weth amount from owner to 
          // console.log("wethContract APPROVED" )
      
      
          const balanceOfuser1inMBLK = await mblkToken.balanceOf(user1.address)
          const balanceOfuser1inWeth = await wethContract.balanceOf(user1.address)
        //  console.log("Balance of USER" , balanceOfuser1inMBLK,balanceOfuser1inWeth)
          
          await mblkToken.connect(user1).approve(UniswapRouter.address, amountMBLKToSend); //Approving Router contract to spend
          await wethContract.connect(user1).approve(UniswapRouter.address, amountETHToSend); //Approving Router contract to spend
      
      
          //console.log("Amounts TO send", amountMBLKToSend, amountETHToSend)
          
      
          try {
            const tx = await UniswapRouter.connect(user1).addLiquidityETH(
              mblkToken.address,
              amountMBLKToSend,
              0,
              0,
              user1.address,
              Math.floor(Date.now() / 1000) + 31536000,  
              {
                value: amountETHToSend,
                gasLimit: 2000000,  
                gasPrice: ethers.utils.parseUnits("30", "gwei"),  
              }
            );
          
            await tx.wait();
            console.log("LIQUIDITY ADDED");
          } catch (error) {
            console.error("Error:", error);
          }
          //console.log("LP TOKEN ADDRESS : ",lpTokenAddress)
      
           
           const lpTokenBalance = await lpToken.balanceOf(user1.address);
           await mblkToken.connect(owner).approve(stakingPool.address,ethers.utils.parseEther('1000'))
           await mblkToken.connect(owner).transfer(stakingPool.address,ethers.utils.parseEther('4'))
           await stakingPool.connect(owner).setFixedReward(ethers.utils.parseEther('2'))
           await stakingPool.connect(owner).setDynamicReward(ethers.utils.parseEther('2'))
           await stakingPool.connect(owner).setTOTAL_REWARDS(ethers.utils.parseEther('2'),ethers.utils.parseEther('2'))
      
           //console.log("lptokenbalanceBefore",lptokenbalanceBefore)
         // console.log("LP TOKNE BALANCE user3 after", lpTokenBalance)
         async function calculateAndScheduleRewardCall(_userAddress, isMBLKStaking) {
          try {
            await network.provider.send('evm_increaseTime', [25 * 3600 * 1000]);
            await network.provider.send('evm_mine', []);
            const userAddress = _userAddress;
            //const isCompounding = isMBLKStaking ? true : false;
      
             await stakingPool.connect(owner).calculateReward(userAddress, isMBLKStaking);
      
             setTimeout(async () => {
              await calculateAndScheduleRewardCall(_userAddress,isMBLKStaking);
            }, 25 * 3600 * 1000);  
          } catch (error) {
            console.error('Error in calculateAndScheduleRewardCall:', error);
          }
        }

   const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

   rl.question('What type of staking you want?\n1. MBLK staking\n2. LP token staking\nChoose (1 or 2): ', async (choice) => {
    try {
      if (choice === '1') {
         const mblkBalancebeforeStaking = await mblkToken.balanceOf(user1.address);

         rl.question('Enter the amount of MBLK to stake  : ', async (amount) => {
          try {
            const mblkAmountToStake = ethers.utils.parseEther(amount);

             rl.question('Enable compounding? (yes/no): ', async (enableCompounding) => {
              try {
                const isCompounding = enableCompounding.toLowerCase() === 'yes';

                 await mblkToken.connect(user1).approve(stakingPool.address, mblkAmountToStake);
                await stakingPool.connect(user1).stakeMBLK(mblkAmountToStake, isCompounding);

                console.log(`Staked ${ethers.utils.formatEther(mblkAmountToStake)} MBLK tokens.`);
                calculateAndScheduleRewardCall(user1.address,true);

                rl.question('Let time pass for 6 months. Press Enter to continue...', async () => {
                  try {
                     //await advanceTime(36 * 30 * 24 * 3600); // 3 years
                     await advanceTime(6 * 30 * 24 * 3600);

                     rl.question('Do you want to withdraw your stakes? (yes/no): ', async (withdrawChoice) => {
                      if (withdrawChoice.toLowerCase() === 'yes') {

                        const userMBLKStake = await stakingPool.userMBLKStakes(user1.address);
                        console.log('User MBLK Stake:', userMBLKStake);
                        console.log('Withdrawing MBLK stakes...');
                        await stakingPool.connect(user1).withdrawMBLK();
                        const mblkBalance = await mblkToken.balanceOf(user1.address);
                        console.log(`User MBLK balance before Staking: ${mblkBalancebeforeStaking}  `);
                        // const userMBLKStake = await stakingPool.userMBLKStakes(user1.address);
                        // console.log('User MBLK Stake:', userMBLKStake);
                        console.log(`User MBLK Stake after withdrawal: ${mblkBalance}`);
                      } else {
                        console.log('No stakes were withdrawn.');
                      }
                      rl.close();
                      process.exit(0);
                    });
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
          } catch (error) {
            console.error('Error:', error);
            process.exit(1);
          }
        });
      } else if (choice === '2') {
         const lpBalanceBefore = await lpToken.balanceOf(user1.address);
         const mblkBalanceBefore = await mblkToken.balanceOf(user1.address);

        console.log(`User LP token balance: ${ lpBalanceBefore } LP tokens`);

         rl.question('Enter the amount of LP tokens to stake  : ', async (amount) => {
          try {
            //const lpAmountToStake = ethers.utils.parseEther(amount);
            const lpAmountToStake = ethers.utils.parseEther(amount);

             await lpToken.connect(user1).approve(stakingPool.address, lpAmountToStake);
            await stakingPool.connect(user1).StakeLPtoken(lpAmountToStake);

            console.log(` ${lpAmountToStake} LP tokens Staked`);
            
            rl.question('Let time pass for 6 months. Press Enter to continue...', async () => {
              try {
                calculateAndScheduleRewardCall(user1.address,false);
                 await advanceTime(6 * 30 * 24 * 3600);

                 rl.question('Do you want to withdraw your stakes? (yes/no): ', async (withdrawChoice) => {
                  if (withdrawChoice.toLowerCase() === 'yes') {
                    const userLPStake = await stakingPool.userLPstake(user1.address);
                    console.log('User LP Stake Before withdrawal:', userLPStake);
                    console.log('Withdrawing LP stakes...');
                    await stakingPool.connect(user1).withdrawLP();
                    const lpBalanceafter = await lpToken.balanceOf(user1.address);
                    const mblkBalanceAfter = await mblkToken.balanceOf(user1.address);

                    const userLPStakeafter = await stakingPool.userLPstake(user1.address);
                    console.log('User LP Stake after withdrawal:', userLPStakeafter);
                    console.log(`User LP token balance Before Staking: ${ lpBalanceBefore }  `);
                    console.log(`User LP token balance after withdrawal: ${ lpBalanceafter }  `);
                    console.log(`User MBLK balance Before Staking: ${ mblkBalanceBefore }  `);
                    console.log(`User MBLK balance After withdrawal: ${ mblkBalanceAfter }  `);

                //     console.log(`User LP token balance Before Staking: ${ lpBalanceBefore }  `);
                //     console.log(`User LP token balance after withdrawal: ${ lpBalanceafter }  `);

                     
                  } else {
                    console.log('No stakes were withdrawn.');
                  }
                  rl.close();
                  process.exit(0);
                });
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
      } else {
        console.error('Invalid choice.  ');
        rl.close();
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });
}

async function advanceTime(seconds) {
  await ethers.provider.send('evm_increaseTime', [seconds]);
  await ethers.provider.send('evm_mine', []);
}

 main();
