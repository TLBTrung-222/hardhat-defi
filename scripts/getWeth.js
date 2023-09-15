const { ethers, getNamedAccounts } = require("hardhat");

const AMOUNT = ethers.utils.parseEther("0.0001");

async function getWeth() {
    const deployer = (await getNamedAccounts()).deployer;

    // we will interact with WETH contract on mainnet now
    // To get contract's instance, we need: abi + address
    const iWethContract = await ethers.getContractAt(
        "IWeth", // this is interface, can use instead of abi
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // this is WETH contract address on ETH mainnet
        deployer
    );
    const txResponse = await iWethContract.deposit({
        value: AMOUNT,
    });
    await txResponse.wait(1);
    const wethBalance = await iWethContract.balanceOf(deployer);
    console.log(`Got ${ethers.utils.formatEther(wethBalance)} WETH`);
}

module.exports = { getWeth };
