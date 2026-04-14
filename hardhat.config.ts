import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);
const HASHKEY_RPC_URL = process.env.HASHKEY_RPC_URL || "https://mainnet.hsk.xyz";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    hashkey: {
      url: HASHKEY_RPC_URL,
      chainId: 177,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
    hashkeyTestnet: {
      url: "https://hashkeychain-testnet.alt.technology",
      chainId: 133,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
