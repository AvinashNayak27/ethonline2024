import { useState, useEffect } from "react";
import {
  ArrowLeft,
  LogOut,
  User,
  Users,
  Trophy,
  Calendar,
  Footprints,
  Check,
} from "lucide-react";
import { loadGapiInsideDOM, loadAuth2 } from "gapi-script";
import axios from "axios";
import { prepareContractCall, sendTransaction, getContract } from "thirdweb";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client } from "../main";
import { arbitrumSepolia } from "thirdweb/chains";
import { useNavigate } from "react-router-dom";

const createdBetQuery = `
  query CreatedBetQuery {
    GoalBetting_CreatedBetEvent {
      betId
      minSteps
      startTimestamp
      user
      endTimestamp
    }
  }
`;

const resolvedBetQuery = `
  query ResolvedBetQuery {
    GoalBetting_ResolvedBetEvent {
      betId
      successful
      user
    }
  }
`;

async function fetchCreatedBets() {
  const url = "https://indexer.bigdevenergy.link/eb4a99f/v1/graphql";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: createdBetQuery,
    }),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      return data.data.GoalBetting_CreatedBetEvent;
    } else {
      console.error("GraphQL error:", data.errors);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}

async function fetchResolvedBets() {
  const url = "https://indexer.bigdevenergy.link/eb4a99f/v1/graphql";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: resolvedBetQuery,
    }),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      return data.data.GoalBetting_ResolvedBetEvent;
    } else {
      console.error("GraphQL error:", data.errors);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}

export default function CurrentBetsPage() {
  const [bets, setBets] = useState([]);
  const [gapi, setGapi] = useState(null);
  const navigate = useNavigate();

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const account = useActiveAccount();

  const contractAddress = "0xe65872B5F4b70d6C1fe93F72beE4BE1bDAc80f53";
  const contract = getContract({
    client,
    chain: arbitrumSepolia,
    address: contractAddress,
  });

  useEffect(() => {
    const loadGapi = async () => {
      try {
        const newGapi = await loadGapiInsideDOM();
        setGapi(newGapi);
      } catch (error) {
        console.error("Error loading GAPI:", error);
      }
    };
    loadGapi();
  }, []);

  useEffect(() => {
    if (!gapi) return;

    const setAuth2 = async () => {
      try {
        const auth2 = await loadAuth2(gapi, GOOGLE_CLIENT_ID, "", {
          scope:
            "https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.location.read",
        });

        if (auth2.isSignedIn.get()) {
          console.log("User is signed in");
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Error setting up auth2:", error);
      }
    };
    setAuth2();
  }, [gapi]);

  useEffect(() => {
    async function fetchBets() {
      const createdBets = await fetchCreatedBets();
      const resolvedBets = await fetchResolvedBets();

      const combinedBets = createdBets.map((bet) => ({
        ...bet,
        id: bet.betId,
        type: "personal", // Assuming all bets are personal for now
        goal: bet.minSteps,
        startTimestamp: bet.startTimestamp,
        endTimestamp: bet.endTimestamp,
        duration: `${Math.round((bet.endTimestamp - bet.startTimestamp) / 3600)} hours`,
        endDate: new Date(bet.endTimestamp * 1000).toISOString().split("T")[0],
        participants: 1,
        currentParticipants: 1,
        isResolved: resolvedBets.some(
          (resolved) => resolved.betId === bet.betId
        ),
        isSuccessful: resolvedBets.find(
          (resolved) => resolved.betId === bet.betId
        )?.successful,
      }));

      setBets(combinedBets);
    }

    fetchBets();
  }, []);

  const handleResolveBet = async (betId) => {
    const authResponse = gapi.auth2
      .getAuthInstance()
      .currentUser.get()
      .getAuthResponse(true);
    const accessToken = authResponse.access_token;

    try {
      const bet = bets.find((b) => b.id === betId);
      if (!bet) {
        throw new Error("Bet not found");
      }

      const response = await axios.post(
        "http://localhost:3000/get-daily-steps",
        {
          startTimeMillis: bet.startTimestamp * 1000,
          endTimeMillis: bet.endTimestamp * 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const proof = response.data.proof;
      const JsonProof = JSON.parse(proof.claimInfo.parameters);
      const completedSteps = JSON.parse(
        JsonProof.responseMatches[0].value
      ).bucket.map((bucket) => {
        const stepCount = bucket.dataset[0].point.reduce(
          (total, point) => total + point.value[0].intVal,
          0
        );
        return stepCount;
      });

      console.log(
        `Resolving bet with ID: ${betId}, Completed Steps: ${completedSteps}`
      );
      console.log("ZK Proof:", proof);
      const transaction = await prepareContractCall({
        contract,
        method:
          "function resolveBet(uint256 betId, ((string provider, string parameters, string context) claimInfo, ((bytes32 identifier, address owner, uint32 timestampS, uint32 epoch) claim, bytes[] signatures) signedClaim) proof)",
        params: [betId, proof],
      });
      const { transactionHash } = await sendTransaction({
        transaction,
        account: account,
      });
      console.log("Transaction sent:", transactionHash);
      alert("Bet resolved successfully");
    } catch (error) {
      console.error("Error resolving bet:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <header className="bg-white shadow">
        <div
          style={{
            display: "none",
          }}
        >
          <ConnectButton client={client} />
        </div>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <a href="/dashboard" className="mr-4">
              <ArrowLeft className="h-6 w-6 text-indigo-600" />
            </a>
            <h1 className="text-3xl font-bold text-indigo-900">Current Bets</h1>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded inline-flex items-center">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className={`bg-white overflow-hidden shadow rounded-lg ${
                bet.isResolved ? "border-2 border-green-500" : ""
              }`}
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {bet.type === "personal" && (
                      <User className="h-5 w-5 text-indigo-500 mr-2" />
                    )}
                    {bet.type === "friend" && (
                      <Users className="h-5 w-5 text-indigo-500 mr-2" />
                    )}
                    {bet.type === "group" && (
                      <Users className="h-5 w-5 text-indigo-500 mr-2" />
                    )}
                    <h3 className="text-lg leading-6 font-medium text-indigo-900 capitalize">
                      {bet.type} Bet
                    </h3>
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Footprints className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-400" />
                  <span>Goal: {bet.goal.toLocaleString()} steps</span>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-400" />
                  <span>Duration: {bet.duration}</span>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Trophy className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-400" />
                  <span>End Date: {bet.endDate}</span>
                </div>
                {bet.type === "friend" && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-400" />
                    <span>Competing with: {bet.friend}</span>
                  </div>
                )}
                {bet.type === "group" &&
                  bet.currentParticipants < bet.participants && (
                    <div className="mt-4">
                      <button
                        onClick={() => handleJoinBet(bet.id)}
                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Join Bet
                      </button>
                    </div>
                  )}
                {bet.isResolved ? (
                  <div className="mt-4 flex flex-col items-center justify-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        bet.isSuccessful
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {bet.isSuccessful
                        ? "Completed Successfully"
                        : "Failed to Complete"}
                    </span>
                  </div>
                ) : (
                  <div className="mt-4">
                    <button
                      onClick={() => handleResolveBet(bet.id)}
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Resolve Bet
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
