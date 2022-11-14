require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/Gs4s7zZRh7v_cZSVNHNXs0WtFU3Cs4US",
      },
      allowUnlimitedContractSize: true
    }
  }
};