const { ethers, getNamedAccounts } = require("hardhat");
const { getWeth, AMOUNT } = require("./getWeth");

async function main() {
    // Need to get some WETH
    await getWeth();

    const { deployer } = await getNamedAccounts(); // the deployer still the first account as when we run hh node

    // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    // We can get the Lending Pool address base on this contract, then we will create a Lending Pool contract instance
    const lendingPool = await getLendingPoolContract(deployer);
    console.log(`Lending pool address: ${lendingPool.address}`);
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    //* conduct to deposit WETH token to lending pool contract
    // but first, need to approve the lending pool contract (spender) so it can pull out money from our wallet
    await approveWeth(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
    console.log("Depositing...");
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log(
        `Deposited ${ethers.utils.formatEther(
            AMOUNT
        )} WETH to lending pool contract!!!`
    );
}

async function getLendingPoolContract(account) {
    // Let's create a Lending Pool Address Provider contract instance to call getLendingPool()
    // abi + address

    const ILendingPoolAddressesProvider = await ethers.getContractAt(
        "contracts/interfaces/ILendingPoolAddressesProvider.sol:ILendingPoolAddressesProvider", // this is kind of redundant
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    );
    const lendingPoolAddress = await ILendingPoolAddressesProvider.getLendingPool();

    const ILendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    );

    return ILendingPool;
}

async function approveWeth(wethAddress, spender, amount, account) {
    // create a Weth contract instance (abi + address + account)
    const wethContract = await ethers.getContractAt(
        "IWeth",
        wethAddress,
        account
    );

    // call approve function from Weth instance (lending pool address + value)
    const txResponse = await wethContract.approve(spender, amount);
    await txResponse.wait(1);
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
