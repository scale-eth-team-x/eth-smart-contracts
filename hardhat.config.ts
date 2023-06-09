import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv'
dotenv.config()

const INFURA_API_KEY: string = process.env.INFURA_API_KEY ?? '';
const GOERLI_PRIVATE_KEY: string = process.env.GOERLI_PRIVATE_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY]
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY]
    },
    mumbai: {
      url: ` https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78`,
      accounts: [GOERLI_PRIVATE_KEY]
    },
    scroll: {
      url: `https://alpha-rpc.scroll.io/l2`,
      accounts: [GOERLI_PRIVATE_KEY]
    },
    zkEVM: {
      url: `https://rpc.public.zkevm-test.net`,
      accounts: [GOERLI_PRIVATE_KEY]
    },
    gnosis_testnet: {
      url: `https://rpc.chiadochain.net`,
      accounts: [GOERLI_PRIVATE_KEY]
    }
  }  
};

export default config;
