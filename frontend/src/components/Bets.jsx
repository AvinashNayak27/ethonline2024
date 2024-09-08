import { useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../main";
import { arbitrumSepolia } from "thirdweb/chains";
import { ConnectButton } from "thirdweb/react";

export default function BetsPage() {
  const [betType, setBetType] = useState("personal");
  const [betAmount, setBetAmount] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("days");
  const [betGoal, setBetGoal] = useState("");
  const account = useActiveAccount();

  const contractAddress = "0xe65872B5F4b70d6C1fe93F72beE4BE1bDAc80f53";

  const contract = getContract({
    client,
    chain: arbitrumSepolia,
    address: contractAddress,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Calculate endTimestamp based on duration
    const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const durationInSeconds =
      durationValue *
      (durationUnit === "hours"
        ? 3600
        : durationUnit === "days"
        ? 86400
        : durationUnit === "weeks"
        ? 604800
        : 2592000);
    const endTimestamp = now + durationInSeconds;

    // Extract minSteps from betGoal (assuming format "X steps per day")
    const minSteps = parseInt(betGoal.split(" ")[0], 10);

    console.log(endTimestamp, minSteps);

    try {
      const transaction = await prepareContractCall({
        contract, // You need to define this contract object
        method: "function createBet(uint256 endTimestamp, uint256 minSteps)",
        params: [endTimestamp, minSteps],
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account: account,
      });

      console.log("Transaction successful:", transactionHash);
      alert("Transaction successful");
    } catch (error) {
      console.error("Transaction failed:", error);
      // Handle error (e.g., show error message to user)
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
            <h1 className="text-3xl font-bold text-indigo-900">
              Create a New Bet
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
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-indigo-700 mb-2">
                  Bet Type
                </label>
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      betType === "personal"
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                    onClick={() => setBetType("personal")}
                  >
                    Personal Challenge
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md bg-gray-300 text-gray-500 cursor-not-allowed"
                      disabled
                    >
                      Challenge a Friend
                    </button>
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md bg-gray-300 text-gray-500 cursor-not-allowed"
                      disabled
                    >
                      Group Bet
                    </button>
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md"
                      onClick={() => (window.location.href = "/view-bets")}
                    >
                      View Bets
                    </button>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label
                  htmlFor="betAmount"
                  className="block text-sm font-medium text-indigo-700 mb-2"
                >
                  Bet Amount (optional)
                </label>
                <input
                  type="number"
                  id="betAmount"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="mt-1 block w-full border border-indigo-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter amount"
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="betDuration"
                  className="block text-sm font-medium text-indigo-700 mb-2"
                >
                  Duration
                </label>
                <div className="flex space-x-4">
                  <input
                    type="number"
                    id="betDuration"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="mt-1 block w-1/2 border border-indigo-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter duration"
                    required
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="mt-1 block w-1/2 border border-indigo-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label
                  htmlFor="betGoal"
                  className="block text-sm font-medium text-indigo-700 mb-2"
                >
                  Goal (e.g., 10000 steps per day)
                </label>
                <input
                  type="text"
                  id="betGoal"
                  value={betGoal}
                  onChange={(e) => setBetGoal(e.target.value)}
                  className="mt-1 block w-full border border-indigo-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your goal"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Bet
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
