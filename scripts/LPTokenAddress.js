async function createLPToken() {
        const wethAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
        const MBLKAddress = "0x16552399d27796eFC861a37bAcB7893eadd60643"
        const uniswapFactoryContract = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; 
        const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/5e382490498c4aad803e4c239fabdeed');  //Provider
        const factory = await ethers.getContractAt("IUniswapV2Factory", uniswapFactoryContract); // Initialzing Factory
        try {
         const tx = await factory.createPair(MBLKAddress, wethAddress); // Replace with your token addresses
         const receipt = await tx.wait();
          
          if (receipt.status === 1) {
            const pairAddress = await factory.getPair(MBLKAddress, wethAddress); // Replace with your token addresses
            console.log('LP Token Address:', pairAddress);
            let PairAddress = await factory.getPair(MBLKAddress, wethAddress);
            console.log("PAIR ADDRESS: ",PairAddress)

              const pairContract = await ethers.getContractAt("IUniswapV2Pair", PairAddress);

             // let lpTokenAddress = await pairContract.token0();  //Getting the LP token Address

 /**   address _mblkTokenAddress, // MBLK Token Contract address           0x16552399d27796eFC861a37bAcB7893eadd60643
        address _stakedMBLKTokenAddress, //Staked MBLK TOKEN CONTRACT ADDRESS   0x005738768bE658DDEC6e16B7d51284754616f7a8
        address _stakedLPTokenAddress,  //Staked LP Token Contract Address     0x4417C072d53748D26cb86c9a27B3C47c5D1B1572
        address _wethTokenAddress,  //wethTokenContractAddress -0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
         address _lptokenAddress //Lp Token Contract Address obtained from getPair and then initialize it with IERC20 - 0x49f99fF1F9fF81aCeD88050888551400E1755826  */
          } else {
            console.error('Transaction failed.');
          }//
        } catch (error) {
          console.error('Error creating LP token:', error);
        }
      }


      //0x49f99fF1F9fF81aCeD88050888551400E1755826
      
createLPToken();
      