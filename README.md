 

### Installation

1. Clone the repository:

    
   git clone https://github.com/adijdhv/zogiStakingContract_HARDHAT.git

2. Change into the project directory:
        cd <_into_your_project_directory_>

3. Install the project dependencies:

        npm install


4. Run test with 
        npx hardhat test


5. Deploy on Goerli Testnet with:
   please create env for Private key and YOUR RPC URL and update the hardhat.config file.
   under networks, update your env variables in Goerli.
   then run the script.

        npx hardhat run scripts/deploy.js --network goerli
