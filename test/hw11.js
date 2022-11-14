const { expect } = require('chai')
const { ethers } = require('hardhat')
const helpers = require("@nomicfoundation/hardhat-network-helpers");
import 'hardhat/console.sol'

describe("compound", function(){
    const MINT_AMOUNT = 100n *10n **18n;
    let sampleErc20, cErc20, owner,addr1
    

    before(async () => {
    // get admin addresss
        [owner, addr1] = await ethers.getSigners();

        //deploy underlying token contracts
        const erc20factory = await ethers.getContractFactory("SampleErc20");
        sampleErc20 = await erc20factory.deploy(ethers.utils.parseUnits("1000000", 18),"APPW","AW");
        await sampleErc20.deployed();
        console.log("line18",sampleErc20.address)
        // deploy comptroller
        const comptrollerFactory = await ethers.getContractFactory("Comptroller");
        
        const comptroller = await comptrollerFactory.deploy();
        
        await comptroller.deployed(); 
        

       
        // deploy SimplePriceOracle
        const priceOracleFactory = await ethers.getContractFactory("SimplePriceOracle");
        const simplePriceOracle = await priceOracleFactory.deploy();
        await simplePriceOracle.deployed();

        // setup New price from SimplePriceOracle to Comptroller
        comptroller._setPriceOracle(simplePriceOracle.address);

        // deploy interest rate model
        const interestRateFactory = await ethers.getContractFactory("WhitePaperInterestRateModel");
        const interestRate = await interestRateFactory.deploy(
            ethers.utils.parseUnits("0", 18),
            ethers.utils.parseUnits("0", 18),
        );
        await interestRate.deployed();
        // aboce pass


        
       

        // deploy cErc20
        const cErc20Factory = await ethers.getContractFactory("CErc20Immutable");
        cErc20 = await cErc20Factory.deploy(
            sampleErc20.address,
            comptroller.address,
            interestRate.address,
            ethers.utils.parseUnits("1", 18),
            "CAppWorks Token",
            "CAW",
            18,
            owner.address,
        );
        await cErc20.deployed();
         // setup supportMarket to Comptroller
         comptroller._supportMarket(cErc20.address);

    })
    
    describe("CERC20", async () => {
    it ("TEST Mint", async function(){ 
        // test mint
        await sampleErc20.approve(cErc20.address, MINT_AMOUNT);
        await cErc20.mint(MINT_AMOUNT);

        // cErc20's sampleErc20 increase
        expect(await sampleErc20.balanceOf(cErc20.address)).to.equal(MINT_AMOUNT);
        })
    it ("owner's cErc20.balance", async function() {
        // owner's cErc20 increase
        expect(await cErc20.balanceOf(owner.address)).to.equal(MINT_AMOUNT);
        })


    it ("tst cErc20 redeem", async function() {
        // test redeem cErc20
        await cErc20.approve(owner.address, MINT_AMOUNT);
        await cErc20.redeem(MINT_AMOUNT);

        // test Erc20 decrease
        expect(await sampleErc20.balanceOf(cErc20.address)).to.equal(0);
        
    })
    it ("test owner's cErc20 decrease balance ", async function() {
        // test owner's cErc20 decrease 
        expect(await cErc20.balanceOf(owner.address)).to.equal(0);

    })
 
    
    
    })
    
})
 