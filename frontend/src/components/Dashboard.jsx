import { useState, useEffect } from "react";
import { ArrowRight, Activity, Trophy, TrendingUp, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadGapiInsideDOM, loadAuth2 } from "gapi-script";
import {
  useConnectModal,
  useActiveAccount,
  useWalletDetailsModal,
} from "thirdweb/react";
import { client } from "../main";
import { arbitrumSepolia } from "thirdweb/chains";
import { createWallet, walletConnect } from "thirdweb/wallets";
import { ConnectButton } from "thirdweb/react";
import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk";
import axios from "axios";
const wallets = [
  createWallet("com.coinbase.wallet"),
  createWallet("io.metamask"),
  createWallet("me.rainbow"),
  walletConnect(),
];

export default function Dashboard() {
  const navigate = useNavigate();
  const activeAccount = useActiveAccount();
  const [fitnessData, setFitnessData] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [gapi, setGapi] = useState(null);
  const [user, setUser] = useState(null);
  const { connect: connectToModal, isConnecting } = useConnectModal();
  const { open } = useWalletDetailsModal();
  const [challenges, setChallenges] = useState([
    { id: 1, name: "10k Steps Daily", progress: 70 },
    { id: 2, name: "30-Day Workout Streak", progress: 40 },
  ]);

  const [proof, setProof] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
          updateUser(auth2.currentUser.get());
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
    if (user) {
      fetchFitnessHistory();
    }
  }, [user]);

  const fetchFitnessHistory = async () => {
    setIsLoading(true);
    const authResponse = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse(true);
    const accessToken = authResponse.access_token;

    try {
      const response = await axios.get("http://localhost:3000/get-history", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const historyData = response.data.proofs.map((proof, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        const formattedDate = date.toISOString().split('T')[0];

        const JsonProof = JSON.parse(proof.claimInfo.parameters);
        const steps = JSON.parse(JsonProof.responseMatches[0].value).bucket[0].dataset[0].point.reduce(
          (total, point) => total + point.value[0].intVal,
          0
        );

        return {
          date: formattedDate,
          steps: steps,
          attested: false,
          proof: proof,
        };
      });

      setFitnessData(historyData);
      setProofs(response.data.proofs);
    } catch (error) {
      console.error("Error fetching fitness history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const attestData = async (date) => {
    const dayData = fitnessData.find(day => day.date === date);
    if (!dayData) return;

    try {
      const client = new SignProtocolClient(SpMode.OnChain, {
        chain: EvmChains.arbitrumSepolia,
      });

      const data = {
        provider: dayData.proof.claimInfo.provider,
        context: dayData.proof.claimInfo.context,
        parameters: dayData.proof.claimInfo.parameters,
        epoch: dayData.proof.signedClaim.claim.epoch,
        identifier: dayData.proof.signedClaim.claim.identifier,
        owner: dayData.proof.signedClaim.claim.owner,
        timestampS: dayData.proof.signedClaim.claim.timestampS,
        signatures: dayData.proof.signedClaim.signatures,
      };

      const createAttestationRes = await client.createAttestation({
        schemaId: "0xe7",
        data: data,
      });

      console.log(createAttestationRes);
      alert("Attestation created successfully");

      setFitnessData(prevData =>
        prevData.map(day =>
          day.date === date ? { ...day, attested: true } : day
        )
      );
    } catch (error) {
      console.error("Error creating attestation:", error);
      alert("Failed to create attestation");
    }
  };

  const handleConnect = async () => {
    const wallet = await connectToModal({
      client,
      chain: arbitrumSepolia,
      wallets: wallets,
      theme: "light",
      size: "compact",
      showThirdwebBranding: false,
      title: "Verifit",
    });
    console.log("connected to", wallet);
  };

  function handleWalletDetails() {
    open({
      client: client,
      chain: arbitrumSepolia,
      account: activeAccount,
      theme: "light",
    });
  }

  const updateUser = (googleUser) => {
    const profile = googleUser.getBasicProfile();
    const name = profile.getName();
    const profileImg = profile.getImageUrl();

    setUser({
      name: name,
      profileImg: profileImg,
      steps: [],
    });
    fetchFitnessData(googleUser);
  };

  const signOut = () => {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
      setUser(null);
      console.log("User signed out.");
    });
  };

  const fetchFitnessData = async (googleUser) => {
    const authResponse = googleUser.getAuthResponse(true); // true for immediate access to updated auth token
    const accessToken = authResponse.access_token;

    if (!accessToken) {
      console.error("Access token is missing.");
      return;
    }
    const endTimeMillis = Date.now(); // Current time
    const startTimeMillis = endTimeMillis - 24 * 60 * 60 * 1000 * 7; // 7 days ago

    try {
      const response = await axios.post(
        "http://localhost:3000/get-daily-steps",
        {
          startTimeMillis: startTimeMillis,
          endTimeMillis: endTimeMillis,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const proof = response.data.proof;
      setProof(proof);
      const JsonProof = JSON.parse(proof.claimInfo.parameters);
      const steps = JSON.parse(JsonProof.responseMatches[0].value).bucket.map(
        (bucket) => {
          const stepCount = bucket.dataset[0].point.reduce(
            (total, point) => total + point.value[0].intVal,
            0
          );
          return stepCount;
        }
      );

      setUser((prevUser) => ({
        ...prevUser,
        steps: steps,
      }));

      console.log("Fitness Data:", steps);
    } catch (error) {
      console.error("Error fetching fitness data:", error);
    }
  };

  const openProofModal = (proof) => {
    setSelectedProof(proof);
    setIsProofModalOpen(true);
  };

  const closeProofModal = () => {
    setIsProofModalOpen(false);
    setSelectedProof(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <header className="bg-white shadow">
        <div
          style={{
            display: "none",
          }}
        >
          <ConnectButton client={client} theme={"light"} />
        </div>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-900">Dashboard</h1>
          <div className="flex items-center gap-2">
            {!activeAccount ? (
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <button
                className="bg-white text-black border border-black font-bold py-2 px-4 rounded inline-flex items-center"
                onClick={handleWalletDetails}
              >
                {activeAccount.address.slice(0, 6) +
                  "..." +
                  activeAccount.address.slice(-4)}
              </button>
            )}

            <button
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                <OverviewCard
                  title="Last 7 Day Steps"
                  value={user?.steps?.reduce((total, steps) => total + steps, 0)}
                  icon={<Activity className="h-6 w-6 text-indigo-600" />}
                  proof={proof}
                />
                <OverviewCard
                  title="Active Challenges"
                  value="2"
                  icon={<Trophy className="h-6 w-6 text-indigo-600" />}
                />
                <OverviewCard
                  title="Streak"
                  value="7 days"
                  icon={<TrendingUp className="h-6 w-6 text-indigo-600" />}
                />
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
                <QuickLinkCard
                  title="Create a New Bet"
                  description="Challenge yourself or compete with friends"
                  link="/bets"
                  linkText="Create Bet"
                />
                <QuickLinkCard
                  title="View Your History"
                  description="See your past activities and achievements"
                  link="/history"
                  linkText="View History"
                />
              </div>

              {/* Recent Activity */}
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg leading-6 font-medium text-indigo-900 mb-4">
                    Recent Activity
                  </h2>
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {fitnessData.map((day, dayIdx) => (
                        <li key={day.date}>
                          <div className="relative pb-8">
                            {dayIdx !== fitnessData.length - 1 ? (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-indigo-200"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span
                                  className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                    day.attested ? "bg-indigo-500" : "bg-indigo-300"
                                  }`}
                                >
                                  <Activity
                                    className="h-5 w-5 text-white"
                                    aria-hidden="true"
                                  />
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-indigo-700">
                                    {day.steps} steps on{" "}
                                    <span className="font-medium text-indigo-900">
                                      {day.date}
                                    </span>
                                  </p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-indigo-600">
                                  <button
                                    onClick={() => openProofModal(day.proof)}
                                    className="text-blue-600 hover:text-blue-900 mr-2"
                                  >
                                    View Proof
                                  </button>
                                  {!day.attested ? (
                                    <button
                                      onClick={() => attestData(day.date)}
                                      className="text-indigo-600 hover:text-indigo-900"
                                    >
                                      Attest
                                    </button>
                                  ) : (
                                    <span className="text-green-500">Attested</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Active Challenges */}
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg leading-6 font-medium text-indigo-900 mb-4">
                    Active Challenges
                  </h2>
                  <div className="space-y-4">
                    {challenges.map((challenge) => (
                      <div
                        key={challenge.id}
                        className="bg-indigo-50 p-4 rounded-md"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-indigo-900">
                            {challenge.name}
                          </h3>
                          <span className="text-sm text-indigo-700">
                            {challenge.progress}% complete
                          </span>
                        </div>
                        <div className="w-full bg-indigo-200 rounded-full h-2.5">
                          <div
                            className="bg-indigo-600 h-2.5 rounded-full"
                            style={{ width: `${challenge.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Proof Modal */}
      <ProofModal
        proof={selectedProof}
        isOpen={isProofModalOpen}
        onClose={closeProofModal}
      />
    </div>
  );
}

const ProofModal = ({ proof, isOpen, onClose }) => {
  if (!isOpen || !proof) return null;

  const renderJson = (obj, indent = 0) => {
    return Object.entries(obj).map(([key, value]) => (
      <div key={key} style={{ marginLeft: `${indent * 20}px` }}>
        <span className="font-semibold">{key}: </span>
        {typeof value === "object" && value !== null ? (
          <div>{renderJson(value, indent + 1)}</div>
        ) : (
          <span>{JSON.stringify(value)}</span>
        )}
      </div>
    ));
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg max-w-2xl max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Proof</h2>
        <div className="font-mono text-sm">{renderJson(proof)}</div>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

function OverviewCard({ title, value, icon, proof }) {
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const openProofModal = () => setIsProofModalOpen(true);
  const closeProofModal = () => setIsProofModalOpen(false);

  const client = new SignProtocolClient(SpMode.OnChain, {
    chain: EvmChains.arbitrumSepolia,
  });

  const createAttestation = async () => {
    const data = {
      provider: proof.claimInfo.provider,
      context: proof.claimInfo.context,
      parameters: proof.claimInfo.parameters,
      epoch: proof.signedClaim.claim.epoch,
      identifier: proof.signedClaim.claim.identifier,
      owner: proof.signedClaim.claim.owner,
      timestampS: proof.signedClaim.claim.timestampS,
      signatures: proof.signedClaim.signatures,
    };
    const createAttestationRes = await client.createAttestation({
      schemaId: "0xe7",
      data: data,
    });
    console.log(createAttestationRes);
    alert("Attestation created");
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-indigo-600 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-indigo-900">
                  {value}
                </div>
                {proof && (
                  <>
                    <button
                      className="text-red-600 hover:text-red-900 text-sm underline"
                      onClick={openProofModal}
                    >
                      View Proof
                    </button>
                    <ProofModal
                      proof={proof}
                      isOpen={isProofModalOpen}
                      onClose={closeProofModal}
                    />
                  </>
                )}
              </dd>
            </dl>
          </div>
          {proof && (
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded ml-4"
              onClick={createAttestation}
            >
              Attest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({ title, description, link, linkText }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-indigo-900">
          {title}
        </h3>
        <div className="mt-2 max-w-xl text-sm text-indigo-600">
          <p>{description}</p>
        </div>
        <div className="mt-5">
          <a
            href={link}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {linkText}
            <ArrowRight className="ml-2 -mr-1 h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
