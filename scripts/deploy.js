// deploy.js

const { ethers, upgrades } = require("hardhat");

async function main() {
 

 
// Connect to an Ethereum provider
const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/5e382490498c4aad803e4c239fabdeed');
 

console.log(process.env.PRIVATE_KEY)
  // Get accounts from Hardhat
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer);

  // Deploy MBLK Token contract
  const MBLKToken = await ethers.getContractFactory("MBLK");
  const mblkToken = await MBLKToken.deploy(ethers.utils.parseEther("100000000"));
  await mblkToken.deployed();
  console.log("MBLK Token deployed to:", mblkToken.address);

  // Deploy other contracts and interact with them as needed
  // You can follow a similar pattern for other contracts

  // Deploy StakedMBLK Token contract
  const StakedMBLKToken = await ethers.getContractFactory("MBLKStaked");
  const stakedMBLKToken = await StakedMBLKToken.deploy();
  await stakedMBLKToken.deployed();
  console.log("StakedMBLK Token deployed to:", stakedMBLKToken.address);

  // Deploy LPStaked Token contract
  const StakedLPToken = await ethers.getContractFactory("LPStaked");
  const stakedLPToken = await StakedLPToken.deploy();
  await stakedLPToken.deployed();
  console.log("LPStaked Token deployed to:", stakedLPToken.address);

  const LPTOKEN = await ethers.getContractFactory("LPtest");
  const lpToken = await LPTOKEN.deploy(ethers.utils.parseEther("100000000"));
  await lpToken.deployed();
  console.log("MBLK Token deployed to:", lpToken.address);
 
  // Deploy your StakingPool contract
  const StakingPool = await ethers.getContractFactory("MBLKStakingPool");
  const stakingPool = await StakingPool.deploy(
    mblkToken.address,
    stakedMBLKToken.address,
    stakedLPToken.address,
    lpToken.address,
    deployer.address      //Fees collection wallet
     
  );
  await stakingPool.deployed();
  console.log("MBLKStakingPool deployed to:", stakingPool.address);
 

  console.log("Deployment completed.");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
