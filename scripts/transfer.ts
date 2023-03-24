import { ethers } from "hardhat";
import { createAccount, createSlSoRcvryAccount, createSocialRecoveryAccount, createSpendLimitAccount } from "../test/helpers";
import { parseEther } from "ethers/lib/utils";

async function main() {
  const [signer, receiver] = await ethers.getSigners();
  const entryPointAddr = "0x0576a174D229E3cFA37253523E645A78A0C91B57"

  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545")

  const { proxy: account } = await createSpendLimitAccount(
    ethers.provider.getSigner(),
    signer.address,
    entryPointAddr
  );
  let balance = await provider.getBalance(signer.address);
  console.log("\ninitial balance of 4337 Wallet =", balance);
  await ethers.provider.getSigner().sendTransaction({
    from: signer.address,
    to: account.address,
    value: parseEther("2"),
  });
  balance = await provider.getBalance(signer.address);
  console.log("balance of 4337 Wallet after =", balance);

  console.log("\nStart transferring from 4337 Wallet")
  balance = await provider.getBalance(account.address);
  console.log("balance of 4337 Wallet before transfer =", balance);
  balance = await provider.getBalance(receiver.address);
  console.log("balance of Receiver Wallet before transfer =", balance);

  await account.execute(receiver.address, parseEther("1"), "0x");
  balance = await provider.getBalance(account.address);
  console.log("\nbalance of 4337 Wallet after transfer =", balance);
  balance = await provider.getBalance(receiver.address);
  console.log("balance of Receiver Wallet after transfer =", balance);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
