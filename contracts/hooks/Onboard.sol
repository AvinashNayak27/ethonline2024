// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ISPHook} from "@ethsign/sign-protocol-evm/src/interfaces/ISPHook.sol";

interface ISPInterface {
    enum DataLocation {
        ONCHAIN,
        ARWEAVE,
        IPFS,
        CUSTOM
    }

    struct Attestation {
        uint64 schemaId;
        uint64 linkedAttestationId;
        uint64 attestTimestamp;
        uint64 revokeTimestamp;
        address attester;
        uint64 validUntil;
        DataLocation dataLocation;
        bool revoked;
        bytes[] recipients;
        bytes data;
    }

    function getAttestation(uint64 attestationId)
        external
        view
        returns (Attestation memory);
}

interface IERC721 {
    function mint(address recipient, uint256 onboardingSteps) external;
}

// @dev This contract implements the actual schema hook.
contract OnboardingHook is ISPHook {
    event AttestationReceived(
        address indexed attester,
        uint64 schemaId,
        uint64 attestationId,
        bytes extraData
    );
    event RevocationReceived(
        address indexed attester,
        uint64 schemaId,
        uint64 attestationId,
        bytes extraData
    );

    constructor() {}

    // Address of the deployed ISP contract
    address public ispContractAddress =
        0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD;
    address public reclaimAddress = 0x4D1ee04EB5CeE02d4C123d4b67a86bDc7cA2E62A;
    address public onboardingNFTAddress =
        0xeBA4810D49611EBE7F1D6fAd94DC118819022408;

    // Assuming you have an interface for the ERC721 contract

    mapping(uint256 => bool) private usedTimestamps;

    function didReceiveAttestation(
        address attester,
        uint64 schemaId,
        uint64 attestationId,
        bytes calldata extraData
    ) external payable {
        bytes memory attestationData = fetchAttestationData(attestationId);
        Reclaim.Proof memory proof = decodeToReclaimProof(attestationData);

        // Try to verify the proof
        try Reclaim(reclaimAddress).verifyProof(proof) {
            // Check if the proof's timestampS has already been used
            uint256 timestamp = proof.signedClaim.claim.timestampS;
            require(
                !usedTimestamps[timestamp],
                "This proof has already been used"
            );

            // Mark the timestamp as used
            usedTimestamps[timestamp] = true;

            // Retrieve step count if all conditions are met
            uint256 stepCount = getStepCount(proof.claimInfo.parameters);
            uint256 startTime = getStartTimeMillis(proof.claimInfo.parameters);
            uint256 endTime = getEndTimeMillis(proof.claimInfo.parameters);

            // Call the ERC721 mint function
            IERC721 erc721Contract = IERC721(onboardingNFTAddress);
            erc721Contract.mint(attester, stepCount, startTime, endTime);

            // Emit the event with attestation and extraData
            emit AttestationReceived(
                attester,
                schemaId,
                attestationId,
                abi.encodePacked(extraData, stepCount, startTime, endTime)
            );
        } catch {
            revert("Invalid proof");
        }
    }

    function didReceiveAttestation(
        address attester,
        uint64 schemaId,
        uint64 attestationId,
        IERC20, // resolverFeeERC20Token
        uint256, // resolverFeeERC20Amount
        bytes calldata extraData
    ) external {
        emit AttestationReceived(attester, schemaId, attestationId, extraData);
    }

    function didReceiveRevocation(
        address attester,
        uint64 schemaId,
        uint64 attestationId,
        bytes calldata extraData
    ) external payable {
        emit RevocationReceived(attester, schemaId, attestationId, extraData);
    }

    function didReceiveRevocation(
        address attester,
        uint64 schemaId,
        uint64 attestationId,
        IERC20, // resolverFeeERC20Token
        uint256, // resolverFeeERC20Amount
        bytes calldata extraData
    ) external {
        emit RevocationReceived(attester, schemaId, attestationId, extraData);
    }

    // Function to call the ISP contract's getAttestation function and return only the data field
    function fetchAttestationData(uint64 attestationId)
        public
        view
        returns (bytes memory)
    {
        // Create an instance of the ISP interface
        ISPInterface ispContract = ISPInterface(ispContractAddress);

        // Call the getAttestation function and retrieve the full attestation
        ISPInterface.Attestation memory attestation = ispContract
            .getAttestation(attestationId);

        // Return only the data field of the attestation
        return attestation.data;
    }

    function decodeToReclaimProof(bytes memory encodedData)
        public
        pure
        returns (Reclaim.Proof memory proof)
    {
        // Decode the data according to the schema
        (
            string memory provider,
            string memory parameters,
            string memory context,
            bytes32 identifier,
            address owner,
            uint256 timestampS,
            uint256 epoch,
            bytes[] memory signatures
        ) = abi.decode(
                encodedData,
                (
                    string,
                    string,
                    string,
                    bytes32,
                    address,
                    uint256,
                    uint256,
                    bytes[]
                )
            );

        // Populate the Reclaim.Proof structure with decoded data
        proof.claimInfo = Claims.ClaimInfo(provider, parameters, context);
        proof.signedClaim = Claims.SignedClaim(
            Claims.CompleteClaimData(
                identifier,
                owner,
                uint32(timestampS),
                uint32(epoch)
            ),
            signatures
        );
    }

    function extractFieldFromContext(string memory data, string memory target)
        public
        pure
        returns (uint256)
    {
        bytes memory dataBytes = bytes(data);
        bytes memory targetBytes = bytes(target);

        require(
            dataBytes.length >= targetBytes.length,
            "target is longer than data"
        );
        uint256 start = 0;
        bool foundStart = false;
        // Find start of "contextMessage":"

        for (uint256 i = 0; i <= dataBytes.length - targetBytes.length; i++) {
            bool isMatch = true;

            for (uint256 j = 0; j < targetBytes.length && isMatch; j++) {
                if (dataBytes[i + j] != targetBytes[j]) {
                    isMatch = false;
                }
            }

            if (isMatch) {
                start = i + targetBytes.length; // Move start to the end of "contextMessage":"
                foundStart = true;
                break;
            }
        }

        if (!foundStart) {
            return 0; // Malformed or missing message
        }
        // Find the end of the message, assuming it ends with a quote not preceded by a backslash
        uint256 end = start;
        while (
            end < dataBytes.length &&
            !(dataBytes[end] == '"' && dataBytes[end - 1] != "\\")
        ) {
            end++;
        }
        if (end <= start) {
            return 0; // Malformed or missing message
        }
        bytes memory contextMessage = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            contextMessage[i - start] = dataBytes[i];
        }
        return parseStringToInt(string(contextMessage));
    }

    function parseStringToInt(string memory str)
        internal
        pure
        returns (uint256)
    {
        bytes memory strBytes = bytes(str);
        uint256 number = 0;
        bool parsing = false;

        for (uint256 i = 0; i < strBytes.length; i++) {
            bytes1 b = strBytes[i];

            if (b >= "0" && b <= "9") {
                parsing = true;
                number = number * 10 + (uint8(b) - 48);
            } else if (parsing) {
                break;
            }
        }

        return number;
    }

    // Function to get step count from a data string
    function getStepCount(string memory data) public pure returns (uint256) {
        // Extract the string after "intVal:"
        uint256 stepCount = extractFieldFromContext(data, "intVal");
        // Convert the extracted string into a uint256
        return stepCount;
    }

    function getStartTimeMillis(string memory data)
        public
        pure
        returns (uint256)
    {
        // Extract the string after "intVal:"
        uint256 startTimeMillis = extractFieldFromContext(
            data,
            "startTimeMillis"
        );
        // Convert the extracted string into a uint256
        return startTimeMillis;
    }

    function getEndTimeMillis(string memory data)
        public
        pure
        returns (uint256)
    {
        // Extract the string after "intVal:"
        uint256 endTimeMillis = extractFieldFromContext(data, "endTimeMillis");
        // Convert the extracted string into a uint256
        return endTimeMillis;
    }
}

