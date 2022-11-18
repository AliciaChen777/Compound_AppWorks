const {
    expect
} = require('chai')
 /*
      延續上題，部署另一份 CErc20 合約
      在 Oracle 中設定一顆 token A 的價格為 $1，一顆 token B 的價格為 $100
      Token B 的 collateral factor 為 50%
      User1 使用 1 顆 token B 來 mint cToken
      User1 使用 token B 作為抵押品來借出 50 顆 token A
      延續 (3.) 的借貸場景，調整 token B 的 collateral factor，讓 user1 被 user2 清算
      延續 (3.) 的借貸場景，調整 oracle 中的 token B 的價格，讓 user1 被 user2 清算
    */
describe("compound 部署合約及調整 token B 的 collateral factor，讓 user1 被 user2 清算", function () {
    let owner, user1, user2
    let comptroller
    let interestRateModel
    let simplePriceOracle
    let tokenA, cTokenA, tokenB, cTokenB

    async function deployTokenFixture() {


        [owner, user1, user2] = await ethers.getSigners()

        const comptrollerFactory = await ethers.getContractFactory("Comptroller")
        comptroller = await comptrollerFactory.deploy()
        await comptroller.deployed()

        const interestRateModelFactory = await ethers.getContractFactory("WhitePaperInterestRateModel")
        interestRateModel = await interestRateModelFactory.deploy(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("0", 18), )
        await interestRateModel.deployed()

        const erc20Factory = await ethers.getContractFactory("SampleErc20")


        tokenA = await erc20Factory.deploy(ethers.utils.parseUnits("10000000", 18), "tokenA", "symbolTokenB")
        await tokenA.deployed()

        tokenB = await erc20Factory.deploy(ethers.utils.parseUnits("10000000", 18), "tokenB", "symbolTokenA")
        await tokenB.deployed()




        // deploy cErc20
        const cErc20Factory = await ethers.getContractFactory("CErc20Immutable");

        cTokenA = await cErc20Factory.deploy(
            tokenA.address,
            comptroller.address,
            interestRateModel.address,
            ethers.utils.parseUnits("1", 18),
            "ctokenA",
            "CtA",
            18,
            owner.address,
        );
        await cTokenA.deployed();

        cTokenB = await cErc20Factory.deploy(
            tokenB.address,
            comptroller.address,
            interestRateModel.address,
            ethers.utils.parseUnits("1", 18),
            "ctokenB",
            "CtB",
            18,
            owner.address,
        );
        await cTokenB.deployed();







        const simplePriceOracleFactory = await ethers.getContractFactory("SimplePriceOracle")
        simplePriceOracle = await simplePriceOracleFactory.deploy()
        await simplePriceOracle.deployed()
        await comptroller._setPriceOracle(simplePriceOracle.address)

        // support market
        await comptroller._supportMarket(cTokenB.address)
        await comptroller._supportMarket(cTokenA.address)

        // set liquidation incentive
        await comptroller._setLiquidationIncentive(ethers.utils.parseUnits("1.1", 18))

        // set close factor to 50%
        await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18))


    }

    before(async () => {
        await deployTokenFixture()
    })
    describe('第三題', function () {
        it("set tokenB's oracle price as $1 and tokenA's oracle price as $100", async function () {
            // 在 Oracle 中設定一顆 token A 的價格為 $1，一顆 token B 的價格為 $100
            await simplePriceOracle.setUnderlyingPrice(cTokenB.address, 100)
            await simplePriceOracle.setUnderlyingPrice(cTokenA.address, 1)
        })

        it("set tokenB's collateral factor as 50%", async function () {
            // Token B 的 collateral factor 為 50%
            await comptroller._setCollateralFactor(cTokenB.address, ethers.utils.parseUnits("0.5", 18))
        })

        it("mint 10000 tokenB to cTokenB", async function () {
            // tokenB approve cTokenB to use
            await tokenB.approve(cTokenB.address, ethers.utils.parseUnits("1000000", 18))
            // use 10000 tokenB to mint 10000 cTokenB
            await cTokenB.mint(ethers.utils.parseUnits("10000", 18))
        })

        it("use token B as collateral to borrow 50 token A", async function () {
            // User1 使用 token B 作為抵押品來借出 50 顆 token A

            // step1. owner 先提供 user1 10000 tokenB, 然後 user1 拿 tokenB approve cTokenB to use, 即可用 1 顆 tokenB 來 mint cTokenB
            await tokenB.transfer(user1.address, ethers.utils.parseUnits("10000", 18))
            await tokenB.connect(user1).approve(cTokenB.address, ethers.utils.parseUnits("1000000", 18))
            await cTokenB.connect(user1).mint(ethers.utils.parseUnits("1", 18))

            // step2. owner deposit 10000 token A
            await tokenA.approve(cTokenA.address, ethers.utils.parseUnits("1000000", 18))
            await cTokenA.mint(ethers.utils.parseUnits("10000", 18))

            // step3. user1: set tokenB as collateral
            await expect(comptroller.connect(user1).enterMarkets([cTokenB.address]))

            // step4. user1: 抵押品為 1 TokenB($100)[all collateral], collateral factor 50% => 可借出 $50 等值的 tokenA($1)，也就是 50 顆 tokenA
            await cTokenA.connect(user1).borrow(ethers.utils.parseUnits("50", 18))

            expect(await tokenA.balanceOf(user1.address))
                .to.equal(ethers.utils.parseUnits("50", 18))
        })


    })

})

describe("compound 部署合約及調整 oracle 中的 token B 的價格，讓 user1 被 user2 清算", function () {
    let owner, user1, user2
    let comptroller
    let interestRateModel
    let simplePriceOracle
    let tokenA, cTokenA, tokenB, cTokenB

   //部署合約
    async function deployTokenFixture() {


        [owner, user1, user2] = await ethers.getSigners()

        const comptrollerFactory = await ethers.getContractFactory("Comptroller")
        comptroller = await comptrollerFactory.deploy()
        await comptroller.deployed()

        const interestRateModelFactory = await ethers.getContractFactory("WhitePaperInterestRateModel")
        interestRateModel = await interestRateModelFactory.deploy(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("0", 18), )
        await interestRateModel.deployed()

        const erc20Factory = await ethers.getContractFactory("SampleErc20")


        tokenA = await erc20Factory.deploy(ethers.utils.parseUnits("10000000", 18), "tokenA", "symbolTokenB")
        await tokenA.deployed()

        tokenB = await erc20Factory.deploy(ethers.utils.parseUnits("10000000", 18), "tokenB", "symbolTokenA")
        await tokenB.deployed()




        // deploy cErc20
        const cErc20Factory = await ethers.getContractFactory("CErc20Immutable");

        cTokenA = await cErc20Factory.deploy(
            tokenA.address,
            comptroller.address,
            interestRateModel.address,
            ethers.utils.parseUnits("1", 18),
            "ctokenA",
            "CtA",
            18,
            owner.address,
        );
        await cTokenA.deployed();

        cTokenB = await cErc20Factory.deploy(
            tokenB.address,
            comptroller.address,
            interestRateModel.address,
            ethers.utils.parseUnits("1", 18),
            "ctokenB",
            "CtB",
            18,
            owner.address,
        );
        await cTokenB.deployed();







        const simplePriceOracleFactory = await ethers.getContractFactory("SimplePriceOracle")
        simplePriceOracle = await simplePriceOracleFactory.deploy()
        await simplePriceOracle.deployed()
        await comptroller._setPriceOracle(simplePriceOracle.address)

        // support market
        await comptroller._supportMarket(cTokenB.address)
        await comptroller._supportMarket(cTokenA.address)

        // set liquidation incentive
        await comptroller._setLiquidationIncentive(ethers.utils.parseUnits("1.1", 18))

        // set close factor to 50%
        await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18))


    }

    //回到第三題狀態
    async function no3state() {
        await simplePriceOracle.setUnderlyingPrice(cTokenB.address, 100)
        await simplePriceOracle.setUnderlyingPrice(cTokenA.address, 1)
        await comptroller._setCollateralFactor(cTokenB.address, ethers.utils.parseUnits("0.5", 18))
        await tokenB.approve(cTokenB.address, ethers.utils.parseUnits("1000000", 18))
        await cTokenB.mint(ethers.utils.parseUnits("10000", 18))
        await tokenB.transfer(user1.address, ethers.utils.parseUnits("10000", 18))
        await tokenB.connect(user1).approve(cTokenB.address, ethers.utils.parseUnits("1000000", 18))
        await cTokenB.connect(user1).mint(ethers.utils.parseUnits("1", 18))

        // step2. owner deposit 10000 token A
        await tokenA.approve(cTokenA.address, ethers.utils.parseUnits("1000000", 18))
        await cTokenA.mint(ethers.utils.parseUnits("10000", 18))
        await comptroller.connect(user1).enterMarkets([cTokenB.address])
        await cTokenA.connect(user1).borrow(ethers.utils.parseUnits("50", 18))



    }
    

    before(async () => {
        
        await deployTokenFixture();
        await no3state()
    })
   
    describe('調整 oracle 中的 token B 的價格', function () {
        it("adjust tokenB's price to 90", async function () {
            

            // before adjusting tokenB's price, user1 can not be liquidated.
            const accountLiqBeforeUpdatingPrice = await comptroller.getAccountLiquidity(user1.address)
            expect(accountLiqBeforeUpdatingPrice[2])
                .to.equal(ethers.utils.parseUnits("0", 0))

            // 調整 oracle 中的 token B 的價格，讓 user1 被 user2 清算
            await simplePriceOracle.setUnderlyingPrice(cTokenB.address, 90)

            // After adjusting tokenB's price to 90, user1 can be liquidated => shortfail > 0
            let accountLiqAfterUpdatingPrice = await comptroller.getAccountLiquidity(user1.address)
            expect(accountLiqAfterUpdatingPrice[2])
                .to.above(ethers.utils.parseUnits("0", 0))
        })
    })


    before(async () => {
        
        await deployTokenFixture();
        await no3state()
    })
    describe('調整 token B 的 collateral factor', function () {
        it(" adjust tokenB's collateral factor liquidate user1's assets", async function () {
            // 延續 (3.) 的借貸場景，調整 token B 的 collateral factor，讓 user1 被 user2 清算

            // owner 提供 user2 10000 tokenA, user2 approve cTokenA to use tokenA for liquidating
            await tokenA.transfer(user2.address, ethers.utils.parseUnits("10000", 18))
            await tokenA.connect(user2).approve(cTokenA.address, ethers.utils.parseUnits("1000000", 18))

            // user2 協助償還借貸，執行liquidateBorrow(被清算人, 協助清算資產數量, 抵押資產的cToken地址)
            await cTokenA.connect(user2).liquidateBorrow(user1.address, ethers.utils.parseUnits("25", 18), cTokenB.address)

            // 驗證 user2 是否清算成功 liquidate user1 => repay 25 tokenA and get cTokenB
            expect(await tokenA.balanceOf(user2.address))
                .to.equal(ethers.utils.parseUnits("9975", 18))

            expect(await cTokenB.balanceOf(user2.address))
                .to.above(ethers.utils.parseUnits("0", 18))

        })
    })
})