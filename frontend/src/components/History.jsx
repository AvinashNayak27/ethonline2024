"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, TrendingUp, LogOut } from "lucide-react";
import axios from "axios";
import { useActiveAccount } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { client } from "../main";

const getAttestations = async () => {
  const response = await axios.get(
    "https://testnet-scan.sign.global/api/scan/attestations?schemaId=onchain_evm_421614_0xe7&page=1"
  );
  return response.data;
};

export default function HistoryPage() {
  const [attestations, setAttestations] = useState([]);
  const account = useActiveAccount();

  useEffect(() => {
    getAttestations().then((response) => {
      setAttestations(response.data?.rows || []);
    });
  }, []);

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
            <h1 className="text-3xl font-bold text-indigo-900">
              Activity History
            </h1>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded inline-flex items-center">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-indigo-200">
              {attestations
                .filter(
                  (attestation) =>
                    attestation.attester.toLowerCase() ===
                    account?.address?.toLowerCase()
                )
                .map((attestation) => (
                  <li key={attestation.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-indigo-400 mr-2" />
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {new Date(
                              attestation.attestTimestamp
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <TrendingUp className="h-5 w-5 text-indigo-400 mr-2" />
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            {attestation.attestationId}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Attester: {attestation.attester}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p className="mr-4">Chain ID: {attestation.chainId}</p>
                          <a
                            href={`https://testnet-scan.sign.global/attestation/onchain_evm_421614_${attestation.attestationId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            View Attestation
                          </a>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
