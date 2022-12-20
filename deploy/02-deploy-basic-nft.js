const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;

    const args = [];

    log("-----------------------------------");
    const basicNft = await deploy("BasicNft", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying.....");
        await verify(basicNft.address, args);
    }
    log("---------------------------------------");
};

module.exports.tags = ["all", "basicnft"];
