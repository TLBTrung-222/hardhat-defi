const { ethers, getNamedAccounts } = require("hardhat");
const { getWeth } = require("./getWeth");

async function main() {
    // await getWeth();

    const { deployer } = await getNamedAccounts();
    // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    // We can get the Lending Pool address base on this contract, then we will create a Lending Pool contract instance
    const lendingPool = await getLendingPoolContract(deployer);
    console.log(`Lending pool address: ${lendingPool.address}`);
}

async function getLendingPoolContract(deployer) {
    // Let's create a Lending Pool Address Provider contract instance to call getLendingPool()
    // abi + address

    const ILendingPoolAddressesProvider = await ethers.getContractAt(
        "contracts/interfaces/ILendingPoolAddressesProvider.sol:ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        deployer
    );
    const lendingPoolAddress =
        await ILendingPoolAddressesProvider.getLendingPool();

    const ILendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        deployer
    );

    return ILendingPool;
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.log(error);
        process.exit(1);
    });
