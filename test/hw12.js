const {
    expect
} = require('chai')
const {
    ethers
} = require('hardhat')
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("compound", function () {
    const MINT_AMOUNT = 100n * 10n ** 18n;
    let owner, user1, user2, tokenA, tokenB, ctokenA, ctokenB, comptroller, simplePriceOracle, interestRate

    it("Deploy CErc20, Comptroller and related contracts", async function () {
        //before(async () => {
        // get admin addresss
        [owner, user1, user2] = await ethers.getSigners();

        // deploy comptroller
        const comptrollerFactory = await ethers.getContractFactory("Comptroller");
        comptroller = await comptrollerFactory.deploy();
        await comptroller.deployed();
        // deploy interest rate model
        const interestRateFactory = await ethers.getContractFactory("WhitePaperInterestRateModel");
        interestRate = await interestRateFactory.deploy(
            ethers.utils.parseUnits("0", 18),
            ethers.utils.parseUnits("0", 18),
        );
        await interestRate.deployed();

        //deploy underlying token contracts

        const erc20factory = await ethers.getContractFactory("SampleErc20")
        tokenA = await erc20factory.deploy(ethers.utils.parseUnits("1000000", 18), "tokenA", "tA");
        await tokenA.deployed();
        console.log("tokenA", tokenA.address)

        tokenB = await erc20factory.deploy(ethers.utils.parseUnits("1000000", 18), "tokenB", "tB");
        await tokenA.deployed();
        console.log("tokenB", tokenB.address)

        // deploy cErc20
        const cErc20Factory = await ethers.getContractFactory("CErc20Immutable");

        ctokenA = await cErc20Factory.deploy(
            tokenA.address,
            comptroller.address,
            interestRate.address,
            ethers.utils.parseUnits("1", 18),
            "CtokenA",
            "CtA",
            18,
            owner.address,
        );
        await ctokenA.deployed();

        ctokenB = await cErc20Factory.deploy(
            tokenB.address,
            comptroller.address,
            interestRate.address,
            ethers.utils.parseUnits("1", 18),
            "CtokenB",
            "CtB",
            18,
            owner.address,
        );
        await ctokenB.deployed();



        console.log("ctokenA.address", ctokenA.address)
        console.log("ctokenA.address", ctokenB.address)





        // deploy SimplePriceOracle
        const priceOracleFactory = await ethers.getContractFactory("SimplePriceOracle");
        simplePriceOracle = await priceOracleFactory.deploy();
        await simplePriceOracle.deployed();

        // setup New price from SimplePriceOracle to Comptroller
        comptroller._setPriceOracle(simplePriceOracle.address);

        // 設定 oracle 價格
        await simplePriceOracle.setUnderlyingPrice(
            ctokenA.address,
            ethers.utils.parseUnits("1", 18)
        )
        await simplePriceOracle.setUnderlyingPrice(
            ctokenB.address,
            ethers.utils.parseUnits("100", "18")
        )

        // setup supportMarket to Comptroller

        comptroller._supportMarket(ctokenA.address);
        comptroller._supportMarket(ctokenB.address);





        // _setCollateralFactor, 設定 tokenB 的 collateral factor
        await comptroller._setCollateralFactor(
            tokenB.address,
            ethers.utils.parseUnits("0.5", "18")
        )

        // _setCloseFactor, set close factor 
        await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", "18"))

        // _setLiquidationIncentive
        await comptroller._setLiquidationIncentive(ethers.utils.parseUnits("0.1", "18"))

        // enterMarkets, 為 tokenA tokenB 提供流動性
        // await comptroller.connect(user1).enterMarkets([ctokenA.address, ctokenB.address])
        //await comptroller.connect(user2).enterMarkets([ctokenA.address, ctokenB.address])



    })




    it("owner mint 10000 tokenB to ctokenB", async function () {

        // [owner] erc20 approve cErc20 to use
        await tokenB.approve(ctokenB.address, ethers.utils.parseUnits("10000", 18))

        // [owner] use 10000 erc20 to mint 10000 cErc20
        await ctokenB.mint(ethers.utils.parseUnits("10000", 18));

        expect(await ctokenB.balanceOf(owner.address))
            .to.equal(ethers.utils.parseUnits("10000", 18))
    })

    it("[user1] use 1 tokenB to mint ctokenB", async function () {


        // [owner] send user 10000 tokenB
        await tokenB.transfer(user1.address, ethers.utils.parseUnits("10000", 18))

        // [user1] tokenB approve ctokenB to use
        await tokenB.connect(user1).approve(ctokenB.address, ethers.utils.parseUnits("1000", 18))

        // [user1] 使用 1 顆 token B 來 mint cToken => deposit phToken
        await ctokenB.connect(user1).mint(ethers.utils.parseUnits("1", 18));
        expect(await ctokenB.balanceOf(user1.address))
            .to.equal(ethers.utils.parseUnits("1", 18))
    })

    it("[user1] use token B as collateral to borrow 50 token A", async function () {


        // // [owner] list pUsd in market
        // await expect(comptroller._supportMarket(ctokenA.address))
        // .to.emit(comptroller, "Failure")
        // // .withArgs(ctokenA.address)

        // [owner] deposit 10000 token A
        await tokenA.approve(ctokenA.address, ethers.utils.parseUnits("10000", 18))
        await ctokenA.mint(ethers.utils.parseUnits("100", 18));
        expect(await ctokenA.totalSupply())
            .to.equal(ethers.utils.parseUnits("100", 18))

        // [user1] set token B as collateral
        await expect(comptroller.connect(user1).enterMarkets([ctokenB.address]))
            .to.emit(comptroller, "MarketEntered")
            .withArgs(ctokenB.address, user1.address)

    })

    it("token a enter =market", async function () {
        // [user1] set token B as collateral
        await expect(comptroller.connect(user1).enterMarkets([ctokenA.address]))
            .to.emit(comptroller, "MarketEntered")
            .withArgs(ctokenA.address, user1.address)

    })
    it("borrow", async function () {

        // [user1] borrow 50 token A(pUSD) (with all collateral)
        await ctokenA.connect(user1).borrow(ethers.utils.parseUnits("50", 18))
    })
    it("check ctokenA balance ", async function () {

        console.log( " ctokenA.balanceOf(user1.address)",await ctokenA.balanceOf(user1.address))

    expect(await ctokenA.balanceOf(user1.address))
            .to.equal(ethers.utils.parseUnits("50", 18))
    })
})










