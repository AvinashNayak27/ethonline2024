// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract OnboardingNFT is ERC721 {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIds;

    // Store the Base64 encoded image string
    string private constant BASE64_ENCODED_IMAGE =
        "https://coral-heavy-louse-549.mypinata.cloud/ipfs/QmWa5v545dx8qBd8ep7H3RtPYLbBSsDZCCpnN3NWDBSfmv";

    // Store onboarding steps, startTime, and endTime for each token
    struct OnboardingData {
        uint256 steps;
        uint256 startTime;
        uint256 endTime;
    }

    mapping(uint256 => OnboardingData) public tokenOnboardingData;

    constructor() ERC721("OnboardingNFT", "ONFT") {}

    function mint(
        address recipient,
        uint256 onboardingSteps,
        uint256 startTime,
        uint256 endTime
    ) public {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(recipient, newTokenId);

        tokenOnboardingData[newTokenId] = OnboardingData({
            steps: onboardingSteps,
            startTime: startTime,
            endTime: endTime
        });
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _doesExist(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        OnboardingData memory data = tokenOnboardingData[tokenId];

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "OnboardingNFT #',
                        tokenId.toString(),
                        '",',
                        '"description": "An NFT with onboarding steps",',
                        '"image": "',
                        BASE64_ENCODED_IMAGE,
                        '",',
                        '"attributes": [',
                        '{"trait_type": "Onboarding Steps", "value": ',
                        data.steps.toString(),
                        "},",
                        '{"trait_type": "Start Time", "value": ',
                        data.startTime.toString(),
                        "},",
                        '{"trait_type": "End Time", "value": ',
                        data.endTime.toString(),
                        "}]}"
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function getOnboardingData(uint256 tokenId)
        public
        view
        returns (
            uint256 steps,
            uint256 startTime,
            uint256 endTime
        )
    {
        require(
            _doesExist(tokenId),
            "ERC721Metadata: Query for nonexistent token"
        );
        OnboardingData memory data = tokenOnboardingData[tokenId];
        return (data.steps, data.startTime, data.endTime);
    }

    function _doesExist(uint256 tokenId) internal view returns (bool) {
        return ownerOf(tokenId) != address(0);
    }
}
