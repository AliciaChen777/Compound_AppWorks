const {
    expect
} = require('chai')
const {
    ethers
} = require('hardhat')
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const {
    loadFixture
} = require('@nomicfoundation/hardhat-network-helpers');


describe("compound", function () {

    async function deployTokenFixture() {
        const MINT_AMOUNT = 100n * 10n ** 18n;
        let owner, user1, user2, tokenA, tokenB, ctokenA, ctokenB, comptroller, simplePriceOracle, interestRate
        //it("Deploy CErc20, Comptroller and related contracts", async function () {
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
        await comptroller._setPriceOracle(simplePriceOracle.address);

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

        await comptroller._supportMarket(ctokenA.address);
        await comptroller._supportMarket(ctokenB.address);





        // _setCollateralFactor, 設定 tokenB 的 collateral factor
        await comptroller._setCollateralFactor(
            ctokenB.address,
            ethers.utils.parseUnits("0.5", "18")
        )

        // _setCloseFactor, set close factor 
        await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", "18"))

        // _setLiquidationIncentive >1
        await comptroller._setLiquidationIncentive(ethers.utils.parseUnits("1.1", "18"))
        console.log("about to return fixture")
        return {
            owner,
            user1,
            user2,
            tokenA,
            tokenB,
            ctokenA,
            ctokenB,
            comptroller,
            simplePriceOracle,
            interestRate
        }

    }

   


    describe("[第三題]mint tokenA, tokenB, ctokenA and ctokenB and borrow tokenA", function () {
        //問題在每個it會得到deployTokenFixture 沒有更新過的資料
        let
            tokenB,
            ctokenB,
            tokenA,
            ctokenA,
            user1,
            owner,
            comptroller

        beforeEach(async () => {
            ({
                tokenB,
                ctokenB,
                tokenA,
                ctokenA,
                user1,
                owner,
                comptroller
            } = await loadFixture(deployTokenFixture))

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

        it("token a enter market", async function () {

            await expect(comptroller.connect(user1).enterMarkets([ctokenA.address]))
                .to.emit(comptroller, "MarketEntered")
                .withArgs(ctokenA.address, user1.address)

        })
        it("borrow", async function () {

            // [user1] borrow 50 token A() (with all collateral)
            await ctokenA.connect(user1).borrow(ethers.utils.parseUnits("50", 18))
        })
        it("check ctokenA balance ", async function () {

            expect(await tokenA.balanceOf(user1.address))
                .to.equal(ethers.utils.parseUnits("50", 18))
        })

    })
})


// it("延續 (3.) 的借貸場景，調整 token B 的 collateral factor，讓 user1 被 user2 清算", async function(){


//     await comptroller._setCollateralFactor(
//         ctokenB.address,
//         ethers.utils.parseUnits("0.3", "18")
//     )

//     await ctokenA.connect(user2).liquidateBorrow(user1.address, ethers.utils.parseUnits("5", 18), ctokenB.address)
// })



// it("3. 延續 (3.) 的借貸場景，調整 oracle 中的 token B 的價格，讓 user1 被 user2 清算", async function () {


//     await simplePriceOracle.setUnderlyingPrice(
//         ctokenB.address,
//         ethers.utils.parseUnits("50", "18")
//     )

// })

// it("owner liquidity should = 0 && short fall should > 0", async () => {
//     let result = await comptroller.getAccountLiquidity(user1.address)
//     expect(result[1]).to.eq(0)
//     expect(result[2]).to.gt(0)
//     console.log("result[0]", result[0])
//     console.log("result[1]", result[1])
//     console.log("result[2]", result[2])
// })
// })