// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./interfaces/Uniswapv3/ISwapRouter.sol";
import "./interfaces/AAVE/FlashLoanReceiverBase.sol";
import "./CErc20.sol";
import "hardhat/console.sol";

contract AaveFlashLoan is FlashLoanReceiverBase {
    using SafeMath for uint256;

    //admin
    address public admin;

    // Uniswap
    ISwapRouter public immutable swapRouter;
    CErc20 public immutable cUSDC;
    CErc20 public immutable cUNI;
    address public borrower;
    uint256 public repayAmount;

    address public constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    uint24 public constant UNI_POOLFEE = 3000;

    //event Log(string message, uint256 val);

    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    constructor(
        ILendingPoolAddressesProvider _addressProvider,
        ISwapRouter _swapRouter,
        CErc20 _cUSDC,
        CErc20 _cUNI,
        address _borrower,
        uint256 _repayAmount
    ) FlashLoanReceiverBase(_addressProvider) {
        swapRouter = ISwapRouter(_swapRouter);
        cUSDC = CErc20(_cUSDC);
        cUNI = CErc20(_cUNI);
        borrower = _borrower;
        repayAmount = _repayAmount;

        admin = msg.sender;
    }

    ///@param asset ERC20 token address
    ///@param amount loan amount
    function flashLoan(address asset, uint256 amount) external onlyAdmin {
        address receiver = address(this);

        address[] memory assets = new address[](1);
        assets[0] = asset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);

        //設置 params 把transfer encode才可以在aave結算完後把錢轉回owner錢包 
        bytes memory params = abi.encode(IERC20.transfer.selector);

        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(
            receiver,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
    }

    /// @param initiator this contract address
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(LENDING_POOL), "Not Lending Pool");
        require(initiator == address(this), "Initiator Invalid");
        // 准許使用 addr1's cUSDC 
        IERC20(USDC).approve(address(cUSDC), repayAmount);

        // 清算 USDC to liquidate
        //borrower是hw11.js傳過來的owner.address
        //repayAmount是hw11.js算完的usdc要被清算的數目
        cUSDC.liquidateBorrow(borrower, repayAmount, cUNI);

        // 將清算完owner 所得到的owner抵押品 cUNI redeem 回 UNI
        cUNI.redeem(cUNI.balanceOf(address(this)));

        uint256 uniBalance = IERC20(UNI).balanceOf(address(this));

        //為了還aave錢，把剛剛得到的UNI換成跟AAVE借的USDC
        //准許使用uniswap 的地址來使用UNI
        IERC20(UNI).approve(address(swapRouter), uniBalance);

        // exchange from UNI to USDC
        ISwapRouter.ExactInputSingleParams memory uniswapParams = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: UNI,
                tokenOut: USDC,
                fee: UNI_POOLFEE,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: uniBalance,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        uint256 amountOut_USDC = swapRouter.exactInputSingle(uniswapParams);

        {
            address[] memory tempAssets = assets;
            for (uint256 i = 0; i < tempAssets.length; i++) {
                //歸還數量需要加上手續費，AAVE手續費為萬分之9
                uint256 amountOwing = amounts[i].add(premiums[i]);
                IERC20(tempAssets[i]).approve(
                    address(LENDING_POOL),
                    amountOwing
                );

                
                //使用parame來用transfer function把USDC轉回msg.sender 
                uint256 leftBalance = amountOut_USDC - amountOwing;
                bytes memory callData = abi.encodeWithSelector(
                    bytes4(params),
                    admin,
                    leftBalance
                );

                tempAssets[i].call(callData);
            }
        }

        return true;
    }
}