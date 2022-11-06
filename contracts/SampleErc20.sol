// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract SampleErc20 is ERC20 {

    constructor(uint256 supply, string memory tokenName, string memory tokenSymbol) ERC20
    (tokenName, tokenSymbol) {
    _mint(msg.sender,supply);

    }
}

