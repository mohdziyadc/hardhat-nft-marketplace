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
              //approving for marketplace
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

          it("exclusively allow owners to list the item", async () => {
              const userConnectedMarketplace = await nftMarketplace.connect(
                  user
              );
              await expect(
                  userConnectedMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
              ).to.be.revertedWith("NftMarketplace__NotOwner");
          });

          it("allows only approved NFT to be listed", async () => {
              await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID);
              await expect(
                  nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace");
          });

          it("checks if the item is not listed", async () => {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
              await expect(
                  nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              ).to.be.revertedWith("NftMarketplace__AlreadyListed");
          });

          it("checks if the price is valid", async () => {
              await expect(
                  nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      ethers.utils.parseEther("0")
                  )
              ).to.be.revertedWith("NftMarketplace__PriceMustbeAboveZero");
          });

          it("cancels the listing of an item", async () => {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
              await expect(
                  nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
              ).to.emit(nftMarketplace, "ItemCancelled");

              const listing = await nftMarketplace.getListing(
                  basicNft.address,
                  TOKEN_ID
              );
              assert(listing.price.toString() == "0");
          });

          it("updates the current listing", async () => {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
              const newPrice = ethers.utils.parseEther("0.2");
              await nftMarketplace.updateListing(
                  basicNft.address,
                  TOKEN_ID,
                  newPrice
              );
              const updatedListing = await nftMarketplace.getListing(
                  basicNft.address,
                  TOKEN_ID
              );
              assert.equal(
                  updatedListing.price.toString(),
                  newPrice.toString()
              );
          });

          it("allows to withdraw proceeds", async () => {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
              //   proceeds = await nftMarketplace.getProceeds(deployer.address);
              await expect(
                  nftMarketplace.withdrawProceeds()
              ).to.be.revertedWith("NftMarketplace__NoProceeds");

              const userConnectedMarketplace = await nftMarketplace.connect(
                  user
              );
              await userConnectedMarketplace.buyItem(
                  basicNft.address,
                  TOKEN_ID,
                  { value: PRICE }
              );
              const deployerProceedsBefore = await nftMarketplace.getProceeds(
                  deployer.address
              );
              const deployerBalanceBefore = await deployer.getBalance();
              const txResponse = await nftMarketplace.withdrawProceeds();
              const txReciept = await txResponse.wait(1);
              const { gasUsed, effectiveGasPrice } = txReciept;
              const gasCost = gasUsed.mul(effectiveGasPrice);
              const deployerBalanceAfter = await deployer.getBalance();

              assert.equal(
                  deployerBalanceAfter.add(gasCost).toString(),
                  deployerProceedsBefore.add(deployerBalanceBefore).toString()
              );
          });

          it("checks for already listed and reverts if price is low", async () => {
              await expect(
                  nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
              ).to.be.revertedWith("NftMarketplace__NotListed");

              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
              await expect(
                  nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: ethers.utils.parseEther("0.01"),
                  })
              ).to.be.revertedWith("NftMarketplace__NotEnoughETH");
          });

          describe("Basic NFT unit tests", () => {
              it("verifies the token URI", async () => {
                  const tokenUri =
                      "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json";
                  const nftTokenUri = await basicNft.tokenURI(0);
                  assert.equal(tokenUri, nftTokenUri.toString());
              });

              it("gets the token counter", async () => {
                  //Nft is already minted. Check above
                  const tokenCounter = await basicNft.getTokenCounter();
                  assert.equal(tokenCounter.toString(), "1");
              });
          });
      });
