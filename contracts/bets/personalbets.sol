pragma solidity ^0.8.0;

contract GoalBetting {
    using Counters for Counters.Counter;
    Counters.Counter private _betIds;

    struct Bet {
        uint256 betId;
        address user;
        uint256 minSteps;
        uint256 startTimestamp;
        uint256 endTimestamp;
        bool resolved;
        bool successful;
    }

    mapping(uint256 => Bet) public bets;
    mapping(address => uint256[]) public userBets;
    address public reclaimAddress;

    event CreatedBetEvent(
        uint256 indexed betId,
        address indexed user,
        uint256 minSteps,
        uint256 startTimestamp,
        uint256 endTimestamp
    );

    event ResolvedBetEvent(
        uint256 indexed betId,
        address indexed user,
        bool successful
    );

    constructor() {
        reclaimAddress = 0x4D1ee04EB5CeE02d4C123d4b67a86bDc7cA2E62A;
    }

    function createBet(uint256 endTimestamp, uint256 minSteps) external {
        require(
            endTimestamp > block.timestamp,
            "End timestamp must be in the future"
        );

        _betIds.increment();
        uint256 betId = _betIds.current();

        Bet memory newBet = Bet({
            betId: betId,
            user: msg.sender,
            minSteps: minSteps,
            startTimestamp: block.timestamp,
            endTimestamp: endTimestamp,
            resolved: false,
            successful: false
        });

        bets[betId] = newBet;
        userBets[msg.sender].push(betId);

        emit CreatedBetEvent(
            betId,
            msg.sender,
            minSteps,
            block.timestamp,
            endTimestamp
        );
    }

    function resolveBet(uint256 betId, Reclaim.Proof memory proof) external {
        Bet storage bet = bets[betId];
        require(!bet.resolved, "Bet already resolved");
        require(msg.sender == bet.user, "Only the bet creator can resolve");
        try Reclaim(reclaimAddress).verifyProof(proof) {
            uint256 proofStartTimestampMillis = getStartTimeMillis(
                proof.claimInfo.parameters
            );
            uint256 proofStartTimestamp = proofStartTimestampMillis / 1000; // Convert millis to seconds
            uint256 steps = getStepCount(proof.claimInfo.parameters);
            require(
                proofStartTimestamp == bet.startTimestamp,
                "Invalid start timestamp in proof"
            );

            if (steps >= bet.minSteps) {
                bet.successful = true;
            }

            bet.resolved = true;

            emit ResolvedBetEvent(betId, bet.user, bet.successful);
        } catch {
            revert("Invalid proof");
        }
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
}
