// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ArtiFusion NFT Marketplace...");

  // Get the ContractFactory and Signers
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString(),
  );

  // Deploy the contract
  const ArtiFusionNFT = await ethers.getContractFactory("ArtiFusionNFT");
  const artiFusionNFT = await ArtiFusionNFT.deploy();

  await artiFusionNFT.waitForDeployment();

  const contractAddress = await artiFusionNFT.getAddress();
  console.log("ArtiFusionNFT deployed to:", contractAddress);

  // Get the listing price
  const listingPrice = await artiFusionNFT.getListingPrice();
  console.log("Listing price:", ethers.formatEther(listingPrice), "ETH");

  // Save the contract address and ABI
  const fs = require("fs");
  const contractsDir = __dirname + "/../src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract address
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ ArtiFusionNFT: contractAddress }, null, 2),
  );

  // Save ABI
  const ArtiFusionNFTArtifact =
    await hre.artifacts.readArtifact("ArtiFusionNFT");
  fs.writeFileSync(
    contractsDir + "/ArtiFusionNFT.json",
    JSON.stringify(ArtiFusionNFTArtifact, null, 2),
  );

  console.log("Contract address and ABI saved to src/contracts/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
