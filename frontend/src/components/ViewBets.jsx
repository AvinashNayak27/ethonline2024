import { useState } from 'react'
import { ArrowLeft, LogOut, User, Users, Trophy, Calendar, Footprints } from 'lucide-react'

// Dummy data for current bets
const initialBets = [
  { id: 1, type: 'personal', goal: 10000, duration: '7 days', endDate: '2023-07-07', participants: 1, currentParticipants: 1 },
  { id: 2, type: 'friend', goal: 15000, duration: '5 days', endDate: '2023-07-10', participants: 2, currentParticipants: 2, friend: 'Alice' },
  { id: 3, type: 'group', goal: 20000, duration: '10 days', endDate: '2023-07-15', participants: 5, currentParticipants: 3 },
  { id: 4, type: 'group', goal: 12000, duration: '3 days', endDate: '2023-07-05', participants: 4, currentParticipants: 2 },
]

export default function CurrentBetsPage() {
  const [bets, setBets] = useState(initialBets)

  const handleJoinBet = (betId) => {
    setBets(bets.map(bet => 
      bet.id === betId ? { ...bet, currentParticipants: bet.currentParticipants + 1 } : bet
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <header className="bg-white shadow">
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
            <div key={bet.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {bet.type === 'personal' && <User className="h-5 w-5 text-indigo-500 mr-2" />}
                    {bet.type === 'friend' && <Users className="h-5 w-5 text-indigo-500 mr-2" />}
                    {bet.type === 'group' && <Users className="h-5 w-5 text-indigo-500 mr-2" />}
                    <h3 className="text-lg leading-6 font-medium text-indigo-900 capitalize">{bet.type} Bet</h3>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {bet.currentParticipants}/{bet.participants} Joined
                  </span>
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
                {bet.type === 'friend' && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-indigo-400" />
                    <span>Competing with: {bet.friend}</span>
                  </div>
                )}
                {bet.type === 'group' && bet.currentParticipants < bet.participants && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleJoinBet(bet.id)}
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Join Bet
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}