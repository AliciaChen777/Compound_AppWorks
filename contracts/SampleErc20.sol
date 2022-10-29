// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract SampleErc20 is ERC20 {

    constructor(uint256 supply) ERC20("AppWorks", "AW") {
    _mint(msg.sender,supply);

    }
}

