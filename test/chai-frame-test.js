const {
    expect
} = require('chai')
const {
    ethers
} = require('hardhat')
const helpers = require("@nomicfoundation/hardhat-network-helpers");

console.log('ethers', typeof ethers)



describe("describe outtest compound", async function () {
    const MINT_AMOUNT = 100n * 10n ** 18n;
    let owner, user1, user2, tokenA, tokenB, ctokenA, ctokenB, comptroller, simplePriceOracle, interestRate,a

    before(async () => {
        console.log("outtest before");
        a = 10
    })
    it("it outer",async function(){
        b+=19
        console.log(b)
    });
    beforeEach(async () => {

        b=100
    })
    
    describe("describe inner1 compound", function () {
        it("Deploy CErc20, Comptroller and related contracts", async function () {
            //before(async () => {
            // get admin addresss
            [owner, user1, user2] = await ethers.getSigners();

            // deploy comptroller
            const comptrollerFactory = await ethers.getContractFactory("Comptroller");
            //console.log('comptrollerFactory', typeof comptrollerFactory)
            comptroller = await comptrollerFactory.deploy();
            //console.log('comptroller', typeof comptroller)
            await comptroller.deployed();
            //a = 15
            console.log(a)
        })
    })

    describe("describe inner2 compound", function () {
        beforeEach(function () {
            a = 20
        })
        it("d2 it1", async function () {
            a=30
            
            b+=5
            console.log(a,b)
        })
        it("d2 it2", async function () {
            console.log(a,b)

        })


    })


    describe("describe inner3 compound", function () {
        
        it("d3 it1", async function () {
            
            console.log(a,b)
        })

        
    })



})