require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

//require("@nomiclabs/hardhat-waffle");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});




/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  //solidity: "0.8.10",
  solidity: {
    compilers: [{
        version: "0.8.17",
      },
      {
        version: "0.8.10",
      },
      {
        version: "0.6.12",
      },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_API_URL,
        //url: "https://eth-mainnet.g.alchemy.com/v2/Gs4s7zZRh7v_cZSVNHNXs0WtFU3Cs4US",
        blockNumber: 15815693,
      },

      allowUnlimitedContractSize: true
    }
  }
};