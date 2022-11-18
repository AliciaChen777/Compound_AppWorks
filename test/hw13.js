const {
    expect
} = require("chai");
const {
    ethers
} = require("hardhat");
const {
    impersonateAccount,
} = require("@nomicfoundation/hardhat-network-helpers");
const {
    loadFixture
} = require('@nomicfoundation/hardhat-network-helpers');



let usdc, uni, binance, cTokenA, cTokenB;
let  Comptroller, comptroller, interestRateModel, oracle;
let flashloan, repayAmount;

//tokenA & tokenB 
let USDCAmount = BigInt(5000 * 1e6); // tokenA
let UNIAmount = BigInt(1000 * 1e18); // tokenB

const binanceAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // token A
const uniAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"; // token B
const AAVE_ADDRESS_PROVIDER = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";



let tokenAPrice = BigInt(1 * 1e18) * BigInt(1e12); 
let tokenBPrice = BigInt(10 * 1e18);
//依照題目tokenB UNI價格掉到6.2
let newTokenBPrice = BigInt(6.2 * 1e18);
let collateralFactorA = BigInt(0.9 * 1e18);
let collateralFactorB = BigInt(0.5 * 1e18);
// let collateralFactorB = BigInt(0.5 * 1e18);
// let chagnedCollateralFactorB = BigInt(0.4 * 1e18);

//liquidate factor
let closeFactor = BigInt(0.5 * 1e18);
let liquidationIncentive = BigInt(1.08 * 1e18);


//async function deployTokenFixture() {
async function deployContracts() {
    //let owner, user1, usdc, uni, binance, cTokenA, cTokenB;
    
    [owner, user1] = await ethers.getSigners();

    // get USDC & UNI contract instance
    usdc = await ethers.getContractAt("ERC20", usdcAddress);
    uni = await ethers.getContractAt("ERC20", uniAddress);

    // create interest model
    let InterestRateModel = await ethers.getContractFactory(
        "WhitePaperInterestRateModel"
    );
    interestRateModel = await InterestRateModel.deploy(0, 0);

    //create comptroller
    Comptroller = await ethers.getContractFactory("Comptroller");
    comptroller = await Comptroller.deploy();

    //create oracel
    let Oracle = await ethers.getContractFactory("SimplePriceOracle");
    oracle = await Oracle.deploy();

    // create cTokenA & cTokenB
    const cErc20Factory = await ethers.getContractFactory("CErc20Immutable");

    cTokenA = await cErc20Factory.deploy(
        usdcAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 6),
        "CtokenA",
        "CtA",
        18,
        owner.address,
    );
    await cTokenA.deployed();


    cTokenB = await cErc20Factory.deploy(
        uniAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "CtokenB",
        "CtB",
        18,
        owner.address,
    );
    await cTokenA.deployed();

    // return {
    //     owner,
    //     user1,
    //     usdc,
    //     uni,
    //     cTokenA,
    //     cTokenB,
    //     comptroller,
    //     oracle,
    //     interestRateModel,
    //     binance
    // }
}

async function setcomptroller() {
    //set oracle first, otherwise comptroller._setCollateralFactor will revert
    await oracle.setUnderlyingPrice(cTokenA.address, tokenAPrice);

    await oracle.setUnderlyingPrice(cTokenB.address, tokenBPrice);
    //support market
    await comptroller._supportMarket(cTokenA.address);
    await comptroller._supportMarket(cTokenB.address);
    //set oracle
    await comptroller._setPriceOracle(oracle.address);
    //set collateral
    await comptroller._setCollateralFactor(cTokenA.address, collateralFactorA);
    await comptroller._setCollateralFactor(cTokenB.address, collateralFactorB);
    // set close factor
    await comptroller._setCloseFactor(closeFactor);
    // set liquidation incentive
    await comptroller._setLiquidationIncentive(liquidationIncentive);
    // token B
}

describe("Flashloan", async () => {
    
    //let  owner, user1, usdc, uni, cTokenA, cTokenB, comptroller, oracle, interestRateModel,binance
    before(async () => {
        await deployContracts();
        
        // ({
        //     owner,
        //     user1,
        //     usdc,
        //     uni,
        //     cTokenA,
        //     cTokenB,
        //     comptroller,
        //     oracle,
        //     interestRateModel,
        //     binance
        // } = await loadFixture(deployTokenFixture))
       
    });

    describe("從binance拿UDSC, UNI, 讓owner有UNI可以抵押", async () => {
        
        
        // beforeEach(async () => {
        //     await setcomptroller();

        // })

        it("binance 錢包UNI餘額是否大於1000  ", async () => {
            let balance = await uni.balanceOf(binanceAddress);
            console.log('balance', balance);
            expect(balance).to.gt(UNIAmount);
        });
        it("從binance 錢包transfer 1000 UNI 給owner", async () => {
            await impersonateAccount(binanceAddress);
            binance = await ethers.getSigner(binanceAddress);
            uni.connect(binance).transfer(owner.address, UNIAmount);
            console.log('uni.balanceOf(owner.address)', await uni.balanceOf(owner.address));

            expect(await uni.balanceOf(owner.address)).to.eq(UNIAmount);
        });
        it("binance 錢包USDC餘額是否大於5000", async () => {
            let balance = await usdc.balanceOf(binanceAddress);
            //todo: 如何知道binanceaddress有幾種代幣
            expect(balance).to.gt(USDCAmount);
        });
        it("從binance 錢包transfer 10000 USDC 給 user1", async () => {
            await impersonateAccount(binanceAddress);
            const binance = await ethers.getSigner(binanceAddress);
            usdc.connect(binance).transfer(user1.address, USDCAmount);

            expect(await usdc.balanceOf(user1.address)).to.eq(USDCAmount);
        });
    });


    describe("抵押 Uni 來借 USDC", async () => {
        it("設定  oracle & comptroller", async () => {
            await setcomptroller();
        });

        it("user1 approve and mint  5000 usdc(tokenA) for compound", async () => {
            await usdc.connect(user1).approve(cTokenA.address, USDCAmount);

            await cTokenA.connect(user1).mint(USDCAmount);

            expect(Number(await cTokenA.balanceOf(user1.address))).to.eq(
                Number(USDCAmount) * 1e12
            );
        });

        it("owner approve and mint  1000 uni(tokenB) for compound  ", async () => {
            await uni.approve(cTokenB.address, UNIAmount);
            await cTokenB.mint(UNIAmount);

            expect(await cTokenB.balanceOf(owner.address)).to.eq(UNIAmount);
        });

        it("owner 增加 cUni(ctokenB) 的流動性", async () => {
            await comptroller.enterMarkets([cTokenB.address]);
        });

        it("owner 借出 usdc", async () => {
            // borrow amount need use ERC20 amount not cToken amount
            await cTokenA.borrow(USDCAmount);
            expect(await usdc.balanceOf(owner.address)).to.eq(USDCAmount);
        });
    });



    describe("使用閃電貸合約 AAVE flashloan 清算owner", async () => {
        it("改變抵押品 UNI(tokenB) 的價錢", async () => {
            await oracle.setUnderlyingPrice(cTokenB.address, newTokenBPrice);
        });

        it("owner liquidity should = 0 && short fall should > 0", async () => {
            let result = await comptroller.getAccountLiquidity(owner.address);

            expect(result[1]).to.eq(0);
            expect(result[2]).to.gt(0);
        });



        it("建立閃電貸合約", async () => {
            let borrowBalance = await cTokenA.callStatic.borrowBalanceCurrent(
                owner.address
            );


            /*
            repayAmount:
            跟aave借的錢拿去還owner欠的usdc數目
            把原先usdc借的5000 (decimal: 6) * closeFactor (decimal: 18) 乘完之後會是decimal 18，故需要再除以1e18
            */

            repayAmount = (BigInt(borrowBalance) * closeFactor) / BigInt(1e18);
            console.log('repayAmount', repayAmount)

            // user1 創建要閃電貸的合約
            let Flashloan = await ethers.getContractFactory("AaveFlashLoan");
            flashloan = await Flashloan.connect(user1).deploy(
                AAVE_ADDRESS_PROVIDER,
                UNISWAP_ROUTER,
                cTokenA.address,
                cTokenB.address,
                owner.address,
                repayAmount
            );
        });

        it("user1執行閃電貸清算owner, 測試user1 balance = 121739940", async () => {
            expect(await usdc.balanceOf(user1.address)).to.eq(0);
            // console.log("閃電貸執行前await usdc.balanceOf(flashloan.address)", await usdc.balanceOf(flashloan.address))
            // console.log("閃電貸執行前await usdc.balanceOf(user1.address)", await usdc.balanceOf(user1.address))


            /* 
            執行邏輯:
            aave 執行借usdc > 清算compound owner 得到owner借貸品uni, 拿uni去uniswap換成usdc, 再拿得到的usdc還aave
            
            */
            // user1執行閃電帶來清算owner 藉由呼叫flashLoan function
            await flashloan.connect(user1).flashLoan(usdcAddress, repayAmount);

            // using params to call "transfer()" from flashloan contract to user1
            // console.log("閃電貸後await usdc.balanceOf(flashloan.address)",await usdc.balanceOf(flashloan.address))
            // console.log("閃電貸後await usdc.balanceOf(user1.address)",await usdc.balanceOf(user1.address))


            expect(await usdc.balanceOf(user1.address)).to.eq(121739940);
        });
    });
});