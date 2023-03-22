import { ethers } from "hardhat";
import { createSlSoRcvryAccount, createSocialRecoveryAccount, createSpendLimitAccount } from "../test/helpers";

async function main() {
  const [signer] = await ethers.getSigners();
  const entryPointAddr = "0x0576a174D229E3cFA37253523E645A78A0C91B57"

  const { proxy: srAccount, accountFactory: srAccountFactory } = await createSocialRecoveryAccount(
    signer,
    signer.address,
    entryPointAddr
  );

  const { proxy: slAccount, accountFactory: slAccountFactory } = await createSpendLimitAccount(
    signer,
    signer.address,
    entryPointAddr
  );

  const { proxy: slsrAccount, accountFactory: slsrAccountFactory } = await createSlSoRcvryAccount(
    signer,
    signer.address,
    entryPointAddr
  );

  console.log("EntryPoint Addr =", entryPointAddr)
  console.log("Social Recovery Addr =", srAccount.address)
  console.log("Social Recovery Factory Addr =", srAccountFactory.address)
  console.log("Spend Limit Addr =", slAccount.address)
  console.log("Spend Limit Factory Addr =", slAccountFactory.address)
  console.log("Spend Limit + Social Recovery Addr =", slsrAccount.address)
  console.log("Spend Limit + Social Recovery Factory Addr =", slsrAccountFactory.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
