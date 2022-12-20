const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace Unit Tests", () => {
          let nftMarketplace, basicNft, deployer, user;

          const PRICE = ethers.utils.parseEther("0.1");
          const TOKEN_ID = 0;
          beforeEach(async () => {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              user = accounts[1]; //Added to hardhat config
              await deployments.fixture(["nftmarketplace", "basicnft"]);
              nftMarketplace = await ethers.getContract("NftMarketplace"); //defaults connection to deployer
              //   nftMarketplace = await nftMarketplaceContract.connect(user);
              basicNft = await ethers.getContract("BasicNft");
              //   basicNft = await basicNftContract.connect(user);
              await basicNft.mintNft();
              await basicNft.approve(nftMarketplace.address, TOKEN_ID);
          });

          it("lists and can be bought", async () => {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
              const userConnectedMarketplace = nftMarketplace.connect(user);
              await userConnectedMarketplace.buyItem(
                  basicNft.address,
                  TOKEN_ID,
                  { value: PRICE }
              );
              const newOwner = await basicNft.ownerOf(TOKEN_ID);
              assert.equal(newOwner.toString(), user.address);
              const deployerProceeds = await nftMarketplace.getProceeds(
                  deployer.address
              );
              assert.equal(deployerProceeds.toString(), PRICE.toString());
          });
      });
