import {
  EntryPoint,
  EntryPoint__factory,
  SimpleAccount,
} from "@account-abstraction/contracts";
import { JsonRpcProvider } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  createAccountOwner,
  createSlSoRcvryAccount,
  createSocialRecoveryAccount,
  createSpendLimitAccount,
  getBalance,
} from "./helpers";
import { parseEther } from "ethers/lib/utils";
import { SocialRecovery, SpdLmtSoRcvry } from "../typechain-types";
import {
  UserOperation,
  fillUserOpDefaults,
  getUserOpHash,
  signUserOp,
} from "./helpers/UserOps";
import { BigNumber } from "ethers";

let provider: JsonRpcProvider;
let accounts: string[];
let entryPoint: EntryPoint;
let spdLmtSoRcvry: any;
let owner: SignerWithAddress;
let guardian: SignerWithAddress;
let newOwner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;

describe("SpendLimit + Social Recovery 4337 Wallet", function () {
  beforeEach(async function () {
    provider = ethers.provider;
    accounts = await ethers.provider.listAccounts();
    [owner, guardian, newOwner, addr1, addr2] = await ethers.getSigners();
    entryPoint = await new EntryPoint__factory(owner).deploy();

    const SpdLmtSoRcvry = await ethers.getContractFactory("SpdLmtSoRcvry");
    spdLmtSoRcvry = await SpdLmtSoRcvry.deploy(
      entryPoint.address,
      owner.address
    );
  });

  describe("Spend Limit 4337 Tests", function () {
    describe("Setting Spend Limit", function () {
      it("should set and update a spending limit", async function () {
        // Set a spending limit for the token
        const amount = 1000;
        await spdLmtSoRcvry.enableSpendLimit();
        await spdLmtSoRcvry.setSpendingLimit(amount);

        // Check that the spending limit was set correctly
        const limit = await spdLmtSoRcvry.getLimitInfo();
        expect(limit.limit).to.equal(amount);
        expect(limit.available).to.equal(amount);
        expect(limit.resetTime).to.be.at.least(Math.floor(Date.now() / 1000));
        expect(limit.isEnabled).to.equal(true);

        await time.increaseTo((await time.latest()) + 61);
        const newLimit = await spdLmtSoRcvry.getLimitInfo();
        expect(newLimit.available).to.equal(amount);
        expect(newLimit.resetTime).to.be.at.least(
          Math.floor(Date.now() / 1000)
        );

        // Set a new spending limit for the token
        const newAmount = 500;
        await spdLmtSoRcvry.setSpendingLimit(newAmount);

        // Check that the spending limit was updated correctly
        const updatedLimit = await spdLmtSoRcvry.getLimitInfo();
        expect(updatedLimit.limit).to.equal(newAmount);
        expect(updatedLimit.available).to.equal(newAmount);
        expect(updatedLimit.resetTime).to.be.at.least(
          Math.floor(Date.now() / 1000)
        );
        expect(updatedLimit.isEnabled).to.equal(true);
      });

      it("should remove a spending limit for a token", async function () {
        // Set a spending limit for the token
        const amount = 1000;
        await spdLmtSoRcvry.enableSpendLimit();
        await spdLmtSoRcvry.setSpendingLimit(amount);

        // Remove the spending limit for the token
        await spdLmtSoRcvry.removeSpendingLimit();

        // Check that the spending limit was removed correctly
        const limit = await spdLmtSoRcvry.getLimitInfo();
        expect(limit.limit).to.equal(0);
        expect(limit.available).to.equal(0);
        expect(limit.resetTime).to.equal(0);
        expect(limit.isEnabled).to.equal(false);
      });

      it("should revert if the amount is zero", async function () {
        const zeroLimit = ethers.utils.parseEther("0");
        await spdLmtSoRcvry.enableSpendLimit();
        await expect(
          spdLmtSoRcvry.setSpendingLimit(zeroLimit)
        ).to.be.revertedWith("Invalid amount");
      });
    });

    describe("Test Spend Limit Function by calling Transfer", function () {
      it("owner should be able to call transfer if the spending limit is not enabled", async () => {
        const { proxy: account } = await createSpendLimitAccount(
          ethers.provider.getSigner(),
          owner.address,
          entryPoint.address
        );
        await ethers.provider.getSigner().sendTransaction({
          from: owner.address,
          to: account.address,
          value: parseEther("2"),
        });
        await account.execute(addr1.address, parseEther("1"), "0x");
      });

      it("other account should not be able to call transfer", async () => {
        const { proxy: account } = await createSpendLimitAccount(
          ethers.provider.getSigner(),
          owner.address,
          entryPoint.address
        );
        await expect(
          account
            .connect(ethers.provider.getSigner(3))
            .execute(addr1.address, parseEther("1"), "0x")
        ).to.be.revertedWith("account: not Owner or EntryPoint");
      });

      it("owner should be able to call transfer if its within the spending limit", async () => {
        const { proxy: account } = await createSlSoRcvryAccount(
          ethers.provider.getSigner(),
          owner.address,
          entryPoint.address
        );
        const amount = parseEther("0.2");
        await account.enableSpendLimit();
        await account.setSpendingLimit(amount);

        await ethers.provider.getSigner().sendTransaction({
          from: owner.address,
          to: account.address,
          value: parseEther("0.2"),
        });
        await account.execute(addr1.address, parseEther("0.2"), "0x");
      });

      it("owner should nor able to call transfer if its outside the spending limit", async () => {
        const { proxy: account } = await createSlSoRcvryAccount(
          ethers.provider.getSigner(),
          owner.address,
          entryPoint.address
        );
        const amount = parseEther("0.2");
        await account.enableSpendLimit();
        await account.setSpendingLimit(amount);

        await ethers.provider.getSigner().sendTransaction({
          from: owner.address,
          to: account.address,
          value: parseEther("0.22"),
        });

        // Max is 0.2 ETH
        try {
          await account.execute(addr1.address, parseEther("0.15"), "0x");
        } catch (e) {
          console.log(e);
        }

        // Max is 0.2 ETH, should revert as exceed max
        await expect(
          account.execute(addr1.address, parseEther("0.1"), "0x")
        ).to.be.revertedWith("Exceed daily limit");
      });
    });
  });
  describe("Social Recovery 4337 Tests", function () {
    describe("Set guardian", function () {
      it("Should set the guardian correctly", async function () {
        await spdLmtSoRcvry.connect(owner).setGuardian(guardian.address);
        expect(await spdLmtSoRcvry.guardian()).to.equal(guardian.address);
      });

      it("Should revert if not owner", async function () {
        await expect(
          spdLmtSoRcvry.connect(addr1).setGuardian(addr2.address)
        ).to.be.revertedWith("only owner");
      });
    });

    describe("Set recovery confirmation time", function () {
      it("Should set the recovery confirmation time correctly", async function () {
        const confirmationTime = 3600;
        await spdLmtSoRcvry
          .connect(owner)
          .setRecoveryConfirmationTime(confirmationTime);
        expect(await spdLmtSoRcvry.recoveryConfirmationTime()).to.equal(
          confirmationTime
        );
      });

      it("Should revert if not owner", async function () {
        await expect(
          spdLmtSoRcvry.connect(addr1).setRecoveryConfirmationTime(3600)
        ).to.be.revertedWith("only owner");
      });
    });

    describe("Initiate recovery process", function () {
      it("Should initiate recovery process correctly", async function () {
        await spdLmtSoRcvry.connect(owner).setGuardian(guardian.address);
        await spdLmtSoRcvry.connect(guardian).initRecovery(newOwner.address);
        const recoveryRequest = await spdLmtSoRcvry.recoveryRequest();
        expect(recoveryRequest.newOwner).to.equal(newOwner.address);
      });

      it("Should revert if not guardian", async function () {
        await expect(
          spdLmtSoRcvry.connect(addr1).initRecovery(addr2.address)
        ).to.be.revertedWith("SocialRecovery: msg sender invalid");
      });
    });

    describe("Cancel recovery", function () {
      beforeEach(async function () {
        await spdLmtSoRcvry.connect(owner).setGuardian(guardian.address);
        await spdLmtSoRcvry.connect(guardian).initRecovery(newOwner.address);
      });

      it("Should cancel the recovery process correctly", async function () {
        await spdLmtSoRcvry.connect(owner).cancelRecovery();
        const recoveryRequest = await spdLmtSoRcvry.recoveryRequest();
        expect(recoveryRequest.newOwner).to.equal(ethers.constants.AddressZero);
      });

      it("Should revert if not owner", async function () {
        await expect(
          spdLmtSoRcvry.connect(addr1).cancelRecovery()
        ).to.be.revertedWith("SocialRecovery: msg sender invalid");
      });

      it("Should revert if no recovery request", async function () {
        await spdLmtSoRcvry.connect(owner).cancelRecovery();
        await expect(
          spdLmtSoRcvry.connect(owner).cancelRecovery()
        ).to.be.revertedWith("SocialRecovery: request invalid");
      });
    });

    describe("Execute recovery", function () {
      beforeEach(async function () {
        await spdLmtSoRcvry.connect(owner).setGuardian(guardian.address);
        await spdLmtSoRcvry.connect(owner).setRecoveryConfirmationTime(1); // 1 second for testing purposes
        await spdLmtSoRcvry.connect(guardian).initRecovery(newOwner.address);
      });

      it("Should execute the recovery process correctly", async function () {
        await time.increaseTo((await time.latest()) + 2);
        await spdLmtSoRcvry.connect(owner).executeRecovery();
        expect(await spdLmtSoRcvry.owner()).to.equal(newOwner.address);
      });

      it("Should revert if not owner or guardian", async function () {
        await expect(
          spdLmtSoRcvry.connect(addr1).executeRecovery()
        ).to.be.revertedWith("SocialRecovery: msg sender invalid");
      });

      it("Should revert if recovery confirmation time not passed", async function () {
        await expect(
          spdLmtSoRcvry.connect(owner).executeRecovery()
        ).to.be.revertedWith(
          "SocialRecovery: recovery confirmation time not passed"
        );
      });
    });

    describe("isValidSignature", function () {
      it("Should return the correct interface ID if the signature is valid", async function () {
        const message = "Hello, socialRecovery!";
        const messageHash = ethers.utils.hashMessage(message);
        const signature = await owner.signMessage(message);

        expect(
          await spdLmtSoRcvry.isValidSignature(messageHash, signature)
        ).to.equal(
          ethers.utils
            .solidityKeccak256(["string"], ["isValidSignature(bytes32,bytes)"])
            .slice(0, 10)
        );
      });

      it("Should return 0xffffffff if the signature is invalid", async function () {
        const message = "Hello, socialRecovery!";
        const messageHash = ethers.utils.hashMessage(message);
        const signature = await addr1.signMessage(message);

        expect(
          await spdLmtSoRcvry.isValidSignature(messageHash, signature)
        ).to.equal("0xffffffff");
      });
    });
  });
  describe("#validateUserOp of SpendLimit + Social Recovery 4337", () => {
    const actualGasPrice = 1e9;
    let account: SpdLmtSoRcvry | SimpleAccount;
    let walletAddressBeforeCreate: string;
    let userOp: UserOperation;
    let userOpHash: string;
    let preBalance: number;
    let expectedPay: number;

    before(async () => {
      // that's the account of ethersSigner
      const accounts = await ethers.provider.listAccounts();
      const entryPoint = accounts[2];
      const accountOwner: any = createAccountOwner();
      const [signer] = await ethers.getSigners();
      ({ proxy: account, walletAddressBeforeCreate } =
        await createSlSoRcvryAccount(
          await ethers.getSigner(entryPoint),
          accountOwner.address,
          entryPoint
        ));

      // getAddress should return same address
      await expect(walletAddressBeforeCreate).to.be.equal(account.address);

      await signer.sendTransaction({
        from: accounts[0],
        to: account.address,
        value: parseEther("0.2"),
      });
      const callGasLimit = 200000;
      const verificationGasLimit = 100000;
      const maxFeePerGas = 3e9;
      const chainId = await ethers.provider
        .getNetwork()
        .then((net) => net.chainId);

      userOp = signUserOp(
        fillUserOpDefaults({
          sender: account.address,
          callGasLimit,
          verificationGasLimit,
          maxFeePerGas,
        }),
        accountOwner,
        entryPoint,
        chainId
      );

      userOpHash = await getUserOpHash(userOp, entryPoint, chainId);

      expectedPay = actualGasPrice * (callGasLimit + verificationGasLimit);

      preBalance = await getBalance(account.address);
      const ret = await account.validateUserOp(
        userOp,
        userOpHash,
        expectedPay,
        { gasPrice: actualGasPrice }
      );
      await ret.wait();
    });

    it("should pay", async () => {
      const postBalance = await getBalance(account.address);
      expect(preBalance - postBalance).to.eql(expectedPay);
    });

    it("should increment nonce", async () => {
      expect(await account.nonce()).to.equal(1);
    });

    it("should reject same TX on nonce error", async () => {
      await expect(
        account.validateUserOp(userOp, userOpHash, 0)
      ).to.revertedWith("account: invalid nonce");
    });

    it("should return NO_SIG_VALIDATION on wrong signature", async () => {
      const HashZero =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const userOpHash = HashZero;
      const deadline = await account.callStatic.validateUserOp(
        { ...userOp, nonce: 1 },
        userOpHash,
        0
      );
      expect(deadline).to.eq(1);
    });
  });
});
