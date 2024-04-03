require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  //solidity: "0.7.6",
  defaultNetwork: "localhost",
  networks: {
    hardhat: {
      forking: {
        url: "https://goerli.infura.io/v3/5e382490498c4aad803e4c239fabdeed",
      }
    }, // Local Hardhat network
    
    localhost: {
      forking: {
        url: process.env.RPCPROVIDER, // Replace with your Infura project ID or testnet URL
      },

      chainId: 31337,
    }, // Localhost network for testing
    // ropsten: {
    //   url: process.env.ROPSTEN_URL || "",
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
    // goerli: {
    //   url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: {
    //     mnemonic: MNEMONIC_PHRASE,
    //   },
    //   gas: 8000000,
    // },
    goerli : {
      url:  process.env.RPCPROVIDER,
       accounts: [process.env.PRIVATE_KEY],
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};
