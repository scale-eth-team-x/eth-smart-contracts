// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Wallet.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "hardhat/console.sol";

// This contract is implemented as ERC4337: account abstraction without Ethereum protocol change
// Also simple social recovery function is implemented

contract SocialRecovery is ERC165, IERC1271, Wallet {
    constructor(
        IEntryPoint anEntryPoint,
        address anOwner
    ) Wallet(anEntryPoint, anOwner) {}

    struct RecoveryRequest {
        address newOwner;
        uint256 requestedAt;
    }

    uint256 public recoveryConfirmationTime = 1;
    address public guardian;
    RecoveryRequest public recoveryRequest;
    uint256 public recoveryNonce;

    function setGuardian(address guardian_) public onlyOwner {
        guardian = guardian_;
    }

    function setRecoveryConfirmationTime(
        uint256 recoveryConfirmationTime_
    ) public onlyOwner {
        recoveryConfirmationTime = recoveryConfirmationTime_;
    }

    function initRecovery(address newOwner) public {
        require(msg.sender == guardian, "SocialRecovery: msg sender invalid");
        uint256 requestedAt = block.timestamp;
        recoveryRequest = RecoveryRequest({
            newOwner: newOwner,
            requestedAt: requestedAt
        });
        recoveryNonce++;
    }

    function cancelRecovery() public {
        require(msg.sender == owner, "SocialRecovery: msg sender invalid");
        require(
            recoveryRequest.newOwner != address(0x0),
            "SocialRecovery: request invalid"
        );
        delete recoveryRequest;
    }

    function executeRecovery(bytes calldata signature) public {
        bytes32 recoveryHash = keccak256(abi.encodePacked(recoveryRequest.newOwner, recoveryRequest.requestedAt, recoveryNonce));
        bytes32 prefixedHash = ECDSA.toEthSignedMessageHash(recoveryHash);

        address recoveredAddress = ECDSA.recover(prefixedHash, signature);
        require(recoveredAddress == guardian, "SocialRecovery: invalid signature");

        owner = recoveryRequest.newOwner;
        delete recoveryRequest;
    }

    function isValidSignature(
        bytes32 _hash,
        bytes calldata _signature
    ) external view override returns (bytes4) {
        address recovered = ECDSA.recover(_hash, _signature);
        if (recovered == owner) {
            return type(IERC1271).interfaceId;
        } else {
            return 0xffffffff;
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC1271).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
