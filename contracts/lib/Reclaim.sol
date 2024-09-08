// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Elliptic Curve Digital Signature Algorithm (ECDSA) operations.
 *
 * These functions can be used to verify that a message was signed by the holder
 * of the private keys of a given address.
 */
library ECDSA {
    enum RecoverError {
        NoError,
        InvalidSignature,
        InvalidSignatureLength,
        InvalidSignatureS
    }

    /**
     * @dev The signature derives the address(0).
     */
    error ECDSAInvalidSignature();

    /**
     * @dev The signature has an invalid length.
     */
    error ECDSAInvalidSignatureLength(uint256 length);

    /**
     * @dev The signature has an S value that is in the upper half order.
     */
    error ECDSAInvalidSignatureS(bytes32 s);

    /**
     * @dev Returns the address that signed a hashed message (hash) with signature or an error. This will not
     * return address(0) without also returning an error description. Errors are documented using an enum (error type)
     * and a bytes32 providing additional information about the error.
     *
     * If no error is returned, then the address can be used for verification purposes.
     *
     * The ecrecover EVM precompile allows for malleable (non-unique) signatures:
     * this function rejects them by requiring the s value to be in the lower
     * half order, and the v value to be either 27 or 28.
     *
     * IMPORTANT: hash _must_ be the result of a hash operation for the
     * verification to be secure: it is possible to craft signatures that
     * recover to arbitrary addresses for non-hashed data. A safe way to ensure
     * this is by receiving a hash of the original message (which may otherwise
     * be too long), and then calling {MessageHashUtils-toEthSignedMessageHash} on it.
     *
     * Documentation for signature generation:
     * - with https://web3js.readthedocs.io/en/v1.3.4/web3-eth-accounts.html#sign[Web3.js]
     * - with https://docs.ethers.io/v5/api/signer/#Signer-signMessage[ethers]
     */
    function tryRecover(bytes32 hash, bytes memory signature)
        internal
        pure
        returns (
            address,
            RecoverError,
            bytes32
        )
    {
        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            // ecrecover takes the signature parameters, and the only way to get them
            // currently is to use assembly.
            /// @solidity memory-safe-assembly
            assembly {
                r := mload(add(signature, 0x20))
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }
            return tryRecover(hash, v, r, s);
        } else {
            return (
                address(0),
                RecoverError.InvalidSignatureLength,
                bytes32(signature.length)
            );
        }
    }

    /**
     * @dev Returns the address that signed a hashed message (hash) with
     * signature. This address can then be used for verification purposes.
     *
     * The ecrecover EVM precompile allows for malleable (non-unique) signatures:
     * this function rejects them by requiring the s value to be in the lower
     * half order, and the v value to be either 27 or 28.
     *
     * IMPORTANT: hash _must_ be the result of a hash operation for the
     * verification to be secure: it is possible to craft signatures that
     * recover to arbitrary addresses for non-hashed data. A safe way to ensure
     * this is by receiving a hash of the original message (which may otherwise
     * be too long), and then calling {MessageHashUtils-toEthSignedMessageHash} on it.
     */
    function recover(bytes32 hash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(
            hash,
            signature
        );
        _throwError(error, errorArg);
        return recovered;
    }

    /**
     * @dev Overload of {ECDSA-tryRecover} that receives the r and vs short-signature fields separately.
     *
     * See https://eips.ethereum.org/EIPS/eip-2098[EIP-2098 short signatures]
     */
    function tryRecover(
        bytes32 hash,
        bytes32 r,
        bytes32 vs
    )
        internal
        pure
        returns (
            address,
            RecoverError,
            bytes32
        )
    {
        unchecked {
            bytes32 s = vs &
                bytes32(
                    0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
                );
            // We do not check for an overflow here since the shift operation results in 0 or 1.
            uint8 v = uint8((uint256(vs) >> 255) + 27);
            return tryRecover(hash, v, r, s);
        }
    }

    /**
     * @dev Overload of {ECDSA-recover} that receives the r and vs short-signature fields separately.
     */
    function recover(
        bytes32 hash,
        bytes32 r,
        bytes32 vs
    ) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(
            hash,
            r,
            vs
        );
        _throwError(error, errorArg);
        return recovered;
    }

    /**
     * @dev Overload of {ECDSA-tryRecover} that receives the v,
     * r and s signature fields separately.
     */
    function tryRecover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
        internal
        pure
        returns (
            address,
            RecoverError,
            bytes32
        )
    {
        // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
        // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
        // the valid range for s in (301): 0 < s < secp256k1n ÷ 2 + 1, and for v in (302): v ∈ {27, 28}. Most
        // signatures from current libraries generate a unique signature with an s-value in the lower half order.
        //
        // If your library generates malleable signatures, such as s-values in the upper range, calculate a new s-value
        // with 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s1 and flip v from 27 to 28 or
        // vice versa. If your library also generates signatures with 0/1 for v instead 27/28, add 27 to v to accept
        // these malleable signatures as well.
        if (
            uint256(s) >
            0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
        ) {
            return (address(0), RecoverError.InvalidSignatureS, s);
        }

        // If the signature is valid (and not malleable), return the signer address
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            return (address(0), RecoverError.InvalidSignature, bytes32(0));
        }

        return (signer, RecoverError.NoError, bytes32(0));
    }

    /**
     * @dev Overload of {ECDSA-recover} that receives the v,
     * r and s signature fields separately.
     */
    function recover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(
            hash,
            v,
            r,
            s
        );
        _throwError(error, errorArg);
        return recovered;
    }

    /**
     * @dev Optionally reverts with the corresponding custom error according to the error argument provided.
     */
    function _throwError(RecoverError error, bytes32 errorArg) private pure {
        if (error == RecoverError.NoError) {
            return; // no error: do nothing
        } else if (error == RecoverError.InvalidSignature) {
            revert ECDSAInvalidSignature();
        } else if (error == RecoverError.InvalidSignatureLength) {
            revert ECDSAInvalidSignatureLength(uint256(errorArg));
        } else if (error == RecoverError.InvalidSignatureS) {
            revert ECDSAInvalidSignatureS(errorArg);
        }
    }
}

// File: @reclaimprotocol/verifier-solidity-sdk/contracts/StringUtils.sol

pragma solidity ^0.8.4;

/**
 * Utilities for string manipulation & conversion
 */
library StringUtils {
    function address2str(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = getChar(hi);
            s[2 * i + 1] = getChar(lo);
        }
        return string(abi.encodePacked("0x", s));
    }

    function bytes2str(bytes memory buffer)
        internal
        pure
        returns (string memory)
    {
        // Fixed buffer size for hexadecimal convertion
        bytes memory converted = new bytes(buffer.length * 2);
        bytes memory _base = "0123456789abcdef";

        for (uint256 i = 0; i < buffer.length; i++) {
            converted[i * 2] = _base[uint8(buffer[i]) / _base.length];
            converted[i * 2 + 1] = _base[uint8(buffer[i]) % _base.length];
        }

        return string(abi.encodePacked("0x", converted));
    }

    function getChar(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function bool2str(bool _b)
        internal
        pure
        returns (string memory _uintAsString)
    {
        if (_b) {
            return "true";
        } else {
            return "false";
        }
    }

    function uint2str(uint256 _i)
        internal
        pure
        returns (string memory _uintAsString)
    {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function areEqual(string calldata _a, string storage _b)
        internal
        pure
        returns (bool)
    {
        return
            keccak256(abi.encodePacked((_a))) ==
            keccak256(abi.encodePacked((_b)));
    }

    function areEqual(string memory _a, string memory _b)
        internal
        pure
        returns (bool)
    {
        return
            keccak256(abi.encodePacked((_a))) ==
            keccak256(abi.encodePacked((_b)));
    }

    function toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            // Uppercase character...
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                // So we add 32 to make it lowercase
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    function substring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }
}

// File: @reclaimprotocol/verifier-solidity-sdk/contracts/Claims.sol

pragma solidity ^0.8.4;

/**
 * Library to assist with requesting,
 * serialising & verifying credentials
 */
library Claims {
    /** Data required to describe a claim */
    struct CompleteClaimData {
        bytes32 identifier;
        address owner;
        uint32 timestampS;
        uint32 epoch;
    }

    struct ClaimInfo {
        string provider;
        string parameters;
        string context;
    }

    /** Claim with signatures & signer */
    struct SignedClaim {
        CompleteClaimData claim;
        bytes[] signatures;
    }

    /**
     * Asserts that the claim is signed by the expected witnesses
     */
    function assertValidSignedClaim(
        SignedClaim memory self,
        address[] memory expectedWitnessAddresses
    ) internal pure {
        require(self.signatures.length > 0, "No signatures");
        address[] memory signedWitnesses = recoverSignersOfSignedClaim(self);
        for (uint256 i = 0; i < expectedWitnessAddresses.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < signedWitnesses.length; j++) {
                if (signedWitnesses[j] == expectedWitnessAddresses[i]) {
                    found = true;
                    break;
                }
            }
            require(found, "Missing witness signature");
        }
    }

    /**
     * @dev recovers the signer of the claim
     */
    function recoverSignersOfSignedClaim(SignedClaim memory self)
        internal
        pure
        returns (address[] memory)
    {
        bytes memory serialised = serialise(self.claim);
        address[] memory signers = new address[](self.signatures.length);
        for (uint256 i = 0; i < self.signatures.length; i++) {
            signers[i] = verifySignature(serialised, self.signatures[i]);
        }

        return signers;
    }

    /**
     * @dev serialises the credential into a string;
     * the string is used to verify the signature
     *
     * the serialisation is the same as done by the TS library
     */
    function serialise(CompleteClaimData memory self)
        internal
        pure
        returns (bytes memory)
    {
        return
            abi.encodePacked(
                StringUtils.bytes2str(abi.encodePacked(self.identifier)),
                "\n",
                StringUtils.address2str(self.owner),
                "\n",
                StringUtils.uint2str(self.timestampS),
                "\n",
                StringUtils.uint2str(self.epoch)
            );
    }

    /**
     * @dev returns the address of the user that generated the signature
     */
    function verifySignature(bytes memory content, bytes memory signature)
        internal
        pure
        returns (address signer)
    {
        bytes32 signedHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n",
                StringUtils.uint2str(content.length),
                content
            )
        );
        return ECDSA.recover(signedHash, signature);
    }

    function hashClaimInfo(ClaimInfo memory claimInfo)
        internal
        pure
        returns (bytes32)
    {
        bytes memory serialised = abi.encodePacked(
            claimInfo.provider,
            "\n",
            claimInfo.parameters,
            "\n",
            claimInfo.context
        );
        return keccak256(serialised);
    }
}

// File: @reclaimprotocol/verifier-solidity-sdk/contracts/Random.sol

pragma solidity ^0.8.4;

// implementation from: https://stackoverflow.com/a/67332959
// Utils for random number generation
library Random {
    /**
     * @dev generates a random number from the given seed
     * This will always return the same number for the same seed & block
     */
    function random(uint256 seed) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(block.difficulty, block.timestamp, seed)
                )
            );
    }
}

// File: @reclaimprotocol/verifier-solidity-sdk/contracts/BytesUtils.sol

pragma solidity ^0.8.4;

/**
 * Utilities for bytes manipulation & conversion
 */
library BytesUtils {
    function bytesToUInt(bytes memory data, uint256 offset)
        internal
        pure
        returns (uint256)
    {
        require(
            offset + 4 <= data.length,
            "Offset + 4 must be within data bounds"
        );

        uint32 result;
        assembly {
            // Load the 32 bits (4 bytes) from the data at the given offset into the result variable
            result := mload(add(add(data, 0x4), offset))
        }

        return result;
    }
}

// File: @reclaimprotocol/verifier-solidity-sdk/contracts/Reclaim.sol

pragma solidity ^0.8.4;

// import "hardhat/console.sol";

/**
 * Reclaim Beacon contract
 */
contract Reclaim {
    struct Witness {
        /** ETH address of the witness */
        address addr;
        /** Host to connect to the witness */
        string host;
    }

    struct Epoch {
        /** Epoch number */
        uint32 id;
        /** when the epoch changed */
        uint32 timestampStart;
        /** when the epoch will change */
        uint32 timestampEnd;
        /** Witnesses for this epoch */
        Witness[] witnesses;
        /**
         * Minimum number of witnesses
         * required to create a claim
         * */
        uint8 minimumWitnessesForClaimCreation;
    }

    struct Proof {
        Claims.ClaimInfo claimInfo;
        Claims.SignedClaim signedClaim;
    }

    /** list of all epochs */
    Epoch[] public epochs;

    /**
     * duration of each epoch.
     * is not a hard duration, but useful for
     * caching purposes
     * */
    uint32 public epochDurationS; // 1 day

    /**
     * current epoch.
     * starts at 1, so that the first epoch is 1
     * */
    uint32 public currentEpoch;

    event EpochAdded(Epoch epoch);

    address public owner;

    /**
     * @notice Calls initialize on the base contracts
     *
     * @dev This acts as a constructor for the upgradeable proxy contract
     */
    constructor() {
        epochDurationS = 1 days;
        currentEpoch = 0;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Only Owner");
        _;
    }

    // epoch functions ---

    /**
     * Fetch an epoch
     * @param epoch the epoch number to fetch;
     * pass 0 to fetch the current epoch
     */
    function fetchEpoch(uint32 epoch) public view returns (Epoch memory) {
        if (epoch == 0) {
            return epochs[epochs.length - 1];
        }
        return epochs[epoch - 1];
    }

    /**
     * Get the witnesses that'll sign the claim
     */
    function fetchWitnessesForClaim(
        uint32 epoch,
        bytes32 identifier,
        uint32 timestampS
    ) public view returns (Witness[] memory) {
        Epoch memory epochData = fetchEpoch(epoch);
        bytes memory completeInput = abi.encodePacked(
            // hex encode bytes
            StringUtils.bytes2str(
                // convert bytes32 to bytes
                abi.encodePacked(identifier)
            ),
            "\n",
            StringUtils.uint2str(epoch),
            "\n",
            StringUtils.uint2str(epochData.minimumWitnessesForClaimCreation),
            "\n",
            StringUtils.uint2str(timestampS)
        );
        bytes memory completeHash = abi.encodePacked(keccak256(completeInput));

        Witness[] memory witnessesLeftList = epochData.witnesses;
        Witness[] memory selectedWitnesses = new Witness[](
            epochData.minimumWitnessesForClaimCreation
        );
        uint256 witnessesLeft = witnessesLeftList.length;

        uint256 byteOffset = 0;
        for (
            uint32 i = 0;
            i < epochData.minimumWitnessesForClaimCreation;
            i++
        ) {
            uint256 randomSeed = BytesUtils.bytesToUInt(
                completeHash,
                byteOffset
            );
            uint256 witnessIndex = randomSeed % witnessesLeft;
            selectedWitnesses[i] = witnessesLeftList[witnessIndex];
            // remove the witness from the list of witnesses
            // we've utilised witness at index "idx"
            // we of course don't want to pick the same witness twice
            // so we remove it from the list of witnesses
            // and reduce the number of witnesses left to pick from
            // since solidity doesn't support "pop()" in memory arrays
            // we swap the last element with the element we want to remove
            witnessesLeftList[witnessIndex] = epochData.witnesses[
                witnessesLeft - 1
            ];
            byteOffset = (byteOffset + 4) % completeHash.length;
            witnessesLeft -= 1;
        }

        return selectedWitnesses;
    }

    /**
     * Call the function to assert
     * the validity of several claims proofs
     */
    function verifyProof(Proof memory proof) public view {
        // create signed claim using claimData and signature.
        require(proof.signedClaim.signatures.length > 0, "No signatures");
        Claims.SignedClaim memory signed = Claims.SignedClaim(
            proof.signedClaim.claim,
            proof.signedClaim.signatures
        );

        // check if the hash from the claimInfo is equal to the infoHash in the claimData
        bytes32 hashed = Claims.hashClaimInfo(proof.claimInfo);
        require(proof.signedClaim.claim.identifier == hashed);

        // fetch witness list from fetchEpoch(_epoch).witnesses
        Witness[] memory expectedWitnesses = fetchWitnessesForClaim(
            proof.signedClaim.claim.epoch,
            proof.signedClaim.claim.identifier,
            proof.signedClaim.claim.timestampS
        );
        address[] memory signedWitnesses = Claims.recoverSignersOfSignedClaim(
            signed
        );
        // check if the number of signatures is equal to the number of witnesses
        require(
            signedWitnesses.length == expectedWitnesses.length,
            "Number of signatures not equal to number of witnesses"
        );

        // Update awaited: more checks on whose signatures can be considered.
        for (uint256 i = 0; i < signed.signatures.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < expectedWitnesses.length; j++) {
                if (signedWitnesses[i] == expectedWitnesses[j].addr) {
                    found = true;
                    break;
                }
            }
            require(found, "Signature not appropriate");
        }

        //@TODO: verify zkproof
    }

    // admin functions ---

    /**
     * @dev Add a new epoch
     */
    function addNewEpoch(
        Witness[] calldata witnesses,
        uint8 requisiteWitnessesForClaimCreate
    ) external onlyOwner {
        if (epochDurationS == 0) {
            epochDurationS = 1 days;
        }
        if (epochs.length > 0) {
            epochs[epochs.length - 1].timestampEnd = uint32(block.timestamp);
        }

        currentEpoch += 1;
        Epoch storage epoch = epochs.push();
        epoch.id = currentEpoch;
        epoch.timestampStart = uint32(block.timestamp);
        epoch.timestampEnd = uint32(block.timestamp + epochDurationS);
        epoch
            .minimumWitnessesForClaimCreation = requisiteWitnessesForClaimCreate;

        for (uint256 i = 0; i < witnesses.length; i++) {
            epoch.witnesses.push(witnesses[i]);
        }

        emit EpochAdded(epochs[epochs.length - 1]);
    }

    // internal code -----

    function uintDifference(uint256 a, uint256 b)
        internal
        pure
        returns (uint256)
    {
        if (a > b) {
            return a - b;
        }

        return b - a;
    }
}

