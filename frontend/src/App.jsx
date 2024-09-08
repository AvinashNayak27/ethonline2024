import React, { useState, useEffect } from "react";
import { loadGapiInsideDOM, loadAuth2 } from "gapi-script";
import "./App.css";
import "tailwindcss/tailwind.css";
import axios from "axios";
import { ConnectButton } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { arbitrumSepolia } from "thirdweb/chains";
import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk";
import { useActiveAccount } from "thirdweb/react";

const UserCard = (props) => {
  return (
    <div className="p-4 bg-white rounded shadow-md">
      <img
        className="w-24 h-24 rounded-full mt-2 mx-auto"
        src={props.user.profileImg}
        alt="user profile"
      />
      <h2 className="text-xl text-center font-bold mt-2">{props.user.name}</h2>

      <div className="mt-4">
        <h3 className="text-lg font-semibold">Step Count (Last 7 Days):</h3>
        <ul className="list-disc list-inside">
          {props.user.steps.map((step, index) => (
            <li key={index}>
              "Last 3 days": {step} steps
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const ProofModal = ({ proof, isOpen, onClose }) => {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg max-w-2xl max-h-[80vh] overflow-auto">
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

const GoogleLogin = () => {
  const [user, setUser] = useState(null);
  const [gapi, setGapi] = useState(null);
  const [proof, setProof] = useState(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const activeAccount = useActiveAccount();

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
      signatures: proof.signedClaim.signatures
    }
    const createAttestationRes = await client.createAttestation({
      schemaId: '0xe6',
      data: data,
    })
    console.log(createAttestationRes)
    alert("Attestation created")
  };

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
          attachSignin(document.getElementById("customBtn"), auth2);
        }
      } catch (error) {
        console.error("Error setting up auth2:", error);
      }
    };
    setAuth2();
  }, [gapi]);

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

  const attachSignin = (element, auth2) => {
    auth2.attachClickHandler(
      element,
      {},
      (googleUser) => {
        updateUser(googleUser);
      },
      (error) => {
        console.error("Error attaching sign-in:", error);
      }
    );
  };

  const fetchFitnessData = async (googleUser) => {
    const authResponse = googleUser.getAuthResponse(true); // true for immediate access to updated auth token
    const accessToken = authResponse.access_token;

    if (!accessToken) {
      console.error("Access token is missing.");
      return;
    }
    const endTimeMillis = Date.now(); // Current time
    const startTimeMillis = endTimeMillis - 24 * 60 * 60 * 1000 * 3; // 3 days ago

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

  const signOut = () => {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
      setUser(null);
      console.log("User signed out.");
    });
  };
  const wallets = [
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
  ];

  if (user) {
    return (
      <div className="container mx-auto p-4">
        <UserCard user={user} />
        {proof && (
          <div className="flex flex-col items-center gap-2">
            <ConnectButton
              client={client}
              wallets={wallets}
              theme={"light"}
              connectModal={{ size: "compact" }}
              chain={arbitrumSepolia}
            />
            <button
              onClick={() => setIsProofModalOpen(true)}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              View ZK Proof
            </button>
            <button
              onClick={createAttestation}
              className={`mt-4 px-4 py-2 bg-green-500 text-white rounded ${
                activeAccount?.address ? 'hover:bg-green-600' : 'opacity-50 cursor-not-allowed'
              }`}
              disabled={!activeAccount?.address}
            >
              Create Attestation
            </button>
          </div>
        )}

        <ProofModal
          proof={proof}
          isOpen={isProofModalOpen}
          onClose={() => setIsProofModalOpen(false)}
        />
        <div
          className="btn logout mt-4 p-2 bg-red-500 text-white rounded cursor-pointer"
          onClick={signOut}
        >
          Logout
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div
        id="customBtn"
        className="btn login p-2 bg-blue-500 text-white rounded cursor-pointer"
      >
        Login
      </div>
    </div>
  );
};

export default GoogleLogin;
