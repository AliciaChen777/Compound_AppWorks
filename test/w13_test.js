const {
    expect
} = require('chai')
const {
    ethers
} = require('hardhat')
const helpers = require("@nomicfoundation/hardhat-network-helpers");

console.log('ethers', typeof ethers)

describe("compound", function () {
    const MINT_AMOUNT = 100n * 10n ** 18n;
    let owner, user1, user2, tokenA, tokenB, ctokenA, ctokenB, comptroller, simplePriceOracle, interestRate

    it("Deploy CErc20, Comptroller and related contracts", async function () {
        //before(async () => {
        // get admin addresss
        [owner, user1, user2] = await ethers.getSigners();

        // deploy comptroller
        const comptrollerFactory = await ethers.getContractFactory("Comptroller");
        console.log('comptrollerFactory', typeof comptrollerFactory)
        comptroller = await comptrollerFactory.deploy();
        console.log('comptroller', typeof comptroller)
        await comptroller.deployed();
    })

})
    