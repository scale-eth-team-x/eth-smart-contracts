import { SpendLimit } from "./../../typechain-types/contracts/SpendLimitETH.sol/SpendLimit";
import {
  SimpleAccount,
  SimpleAccountFactory,
  SimpleAccountFactory__factory,
  SimpleAccount__factory,
} from "@account-abstraction/contracts";
import { BigNumber, Signer, Wallet } from "ethers";
import { arrayify, keccak256 } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  SLWalletFactory,
  SRWalletFactory,
  SRWalletFactory__factory,
  SocialRecovery,
  SpdLmtSoRcvry,
  SpdLmtSoRcvryFactory,
} from "../../typechain-types";

export async function createAccount(
  ethersSigner: Signer,
  accountOwner: string,
  entryPoint: string,
  _factory?: SimpleAccountFactory
): Promise<{
  proxy: SimpleAccount;
  accountFactory: SimpleAccountFactory;
  implementation: string;
}> {
  const accountFactory =
    _factory ??
    (await new SimpleAccountFactory__factory(ethersSigner).deploy(entryPoint));
  const implementation = await accountFactory.accountImplementation();
  await accountFactory.createAccount(accountOwner, 0);
  const accountAddress = await accountFactory.getAddress(accountOwner, 0);
  const proxy = SimpleAccount__factory.connect(accountAddress, ethersSigner);
  return {
    implementation,
    accountFactory,
    proxy,
  };
}

// create non-random account, so gas calculations are deterministic
export function createAccountOwner(): Wallet {
  let counter = 0;
  const privateKey = keccak256(
    Buffer.from(arrayify(BigNumber.from(++counter)))
  );
  return new ethers.Wallet(privateKey, ethers.provider);
  // return new ethers.Wallet('0x'.padEnd(66, privkeyBase), ethers.provider);
}

export async function getBalance(address: string): Promise<number> {
  const balance = await ethers.provider.getBalance(address);
  return parseInt(balance.toString());
}

export async function createSocialRecoveryAccount(
  ethersSigner: Signer,
  accountOwner: string,
  entryPoint: string,
  _factory?: SRWalletFactory
): Promise<{
  proxy: SocialRecovery;
  accountFactory: SRWalletFactory;
  implementation: string;
  walletAddressBeforeCreate: string;
}> {
  const srWalletFact = await ethers.getContractFactory("SRWalletFactory");
  const accountFactory =
    _factory ?? (await srWalletFact.connect(ethersSigner).deploy(entryPoint));
  const implementation = await accountFactory.srAccountImplementation();
  const walletAddressBeforeCreate = await accountFactory.getAddress(
    accountOwner,
    0
  );
  await accountFactory.createAccount(accountOwner, 0);
  const accountAddress = await accountFactory.getAddress(accountOwner, 0);

  const socialRecovery = await ethers.getContractFactory("SocialRecovery");
  const proxy = socialRecovery.attach(accountAddress).connect(ethersSigner);

  return {
    implementation,
    accountFactory,
    proxy,
    walletAddressBeforeCreate,
  };
}

export async function createSpendLimitAccount(
  ethersSigner: Signer,
  accountOwner: string,
  entryPoint: string,
  _factory?: SLWalletFactory
): Promise<{
  proxy: SpendLimit;
  accountFactory: SLWalletFactory;
  implementation: string;
  walletAddressBeforeCreate: string;
}> {
  const slWalletFact = await ethers.getContractFactory("SLWalletFactory");
  const accountFactory =
    _factory ?? (await slWalletFact.connect(ethersSigner).deploy(entryPoint));
  const implementation = await accountFactory.slAccountImplementation();
  const walletAddressBeforeCreate = await accountFactory.getAddress(
    accountOwner,
    0
  );
  await accountFactory.createAccount(accountOwner, 0);
  const accountAddress = await accountFactory.getAddress(accountOwner, 0);

  const spendlimit = await ethers.getContractFactory("SpendLimit");
  const proxy = await spendlimit.attach(accountAddress).connect(ethersSigner);
  return {
    implementation,
    accountFactory,
    proxy,
    walletAddressBeforeCreate,
  };
}

export async function createSlSoRcvryAccount(
  ethersSigner: Signer,
  accountOwner: string,
  entryPoint: string,
  _factory?: SpdLmtSoRcvryFactory
): Promise<{
  proxy: SpdLmtSoRcvry;
  accountFactory: SpdLmtSoRcvryFactory;
  implementation: string;
  walletAddressBeforeCreate: string;
}> {
  const slsrWalletFact = (await ethers.getContractFactory(
    "SpdLmtSoRcvryFactory"
  )) as unknown as SpdLmtSoRcvryFactory;
  const accountFactory =
    _factory ?? (await slsrWalletFact.connect(ethersSigner).deploy(entryPoint));
  const implementation = await accountFactory.slsrAccountImplementation();
  const walletAddressBeforeCreate = await accountFactory.getAddress(
    accountOwner,
    0
  );
  await accountFactory.createAccount(accountOwner, 0);
  const accountAddress = await accountFactory.getAddress(accountOwner, 0);

  const spdLmtSoRcvry = await ethers.getContractFactory("SpdLmtSoRcvry");
  const proxy = (await spdLmtSoRcvry
    .attach(accountAddress)
    .connect(ethersSigner)) as unknown as SpdLmtSoRcvry;
  return {
    implementation,
    accountFactory,
    proxy,
    walletAddressBeforeCreate,
  };
}
