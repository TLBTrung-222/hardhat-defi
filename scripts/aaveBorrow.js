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
    console.log("------------------------------------------------------");

    //* Deposit WETH to Aave
    // but first, need to approve the lending pool contract (spender) so it can pull out money from our wallet
    await approveWeth(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
    console.log("Depositing...");
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log(
        `Deposited ${ethers.utils.formatEther(
            AMOUNT
        )} WETH to lending pool contract!!!`
    );
    console.log("------------------------------------------------------");

    //* Borrow DAI from Aave
    // Borrow time
    // how much we have borrowed?
    // how much we have in collateral?
    // how much we can borrow?

    const { availableBorrowsETH } = await getBorrowUserData(
        lendingPool,
        deployer
    );

    // Now we know the available borrow in Eth, but we want to borrow DAI, so how many DAI we can borrow?
    // -> need to know how many DAI we can borrow by getting DAI/ETH conversion (using chainlink price feed)
    // DAI/ETH price feed contract address: 0x773616E4d11A78F511299002da57A0a94577F1f4
    //* Get DAI/ETH conversion
    const daiPrice = await getDaiPrice();
    // we can not let user borrow all the available ETH (or DAI), because if health factor < 1, user will get liquidated
    // -> multiply it with an abitrary number (example 0.95)
    const availableBorrowsDAI = availableBorrowsETH * 0.95 * (1 / daiPrice);
    console.log(`Available borrow in DAI: ${availableBorrowsDAI}`);
    console.log("------------------------------------------------------");

    // convert number of DAI into wei (DAI has 18 decimal place similiar to ETH) to perform calculation
    const availableBorrowsDAIinWei = ethers.utils.parseEther(
        availableBorrowsDAI.toString()
    );

    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    await borrowDai(
        daiTokenAddress,
        lendingPool,
        availableBorrowsDAIinWei,
        deployer
    );

    await getBorrowUserData(lendingPool, deployer);
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

async function getDaiPrice() {
    // create data feed contract instance
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    ); //no need Signer because we only want to read data
    const price = (await daiEthPriceFeed.latestRoundData())[1]; // get the answer
    console.log(`DAI/ETH price is: ${price}`);
    return price;
}

async function getBorrowUserData(lendingPool, account) {
    //* Get user data
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH,
        ltv,
    } = await lendingPool.getUserAccountData(account);

    console.log(
        `Collateral in ETH: ${ethers.utils.formatEther(totalCollateralETH)}`
    );
    console.log(`Debt in ETH: ${ethers.utils.formatEther(totalDebtETH)}`);
    console.log(
        `Available borrow in ETH: ${ethers.utils.formatEther(
            availableBorrowsETH
        )}`
    );
    return { availableBorrowsETH, totalDebtETH };
}

// syntax of borrow method:
// function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)
async function borrowDai(
    daiTokenAddress,
    lendingPool,
    amount, // the amount in Wei (check the docs)
    account
) {
    // conduct to borrow
    console.log(`Borrowing ${amount} DAI from lending pool...`);
    const borrowTx = await lendingPool.borrow(
        daiTokenAddress,
        amount,
        2,
        0,
        account
    );
    await borrowTx.wait(1);
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
