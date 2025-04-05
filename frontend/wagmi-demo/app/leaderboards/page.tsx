'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { shorten } from 'lib/utils';
import './leaderboards.css';

// Define types for our leaderboard entries
interface LeaderboardEntry {
  id: number;
  rank: number;
  address: string;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  winRate: number;
  lastActive: string;
  rating: number;
}

// Define categories for different leaderboards
type LeaderboardCategory = 'overall' | 'weekly' | 'p2e' | 'tournament';

export default function LeaderboardsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  
  // State management
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>('overall');
  const [leaderboards, setLeaderboards] = useState<Record<LeaderboardCategory, LeaderboardEntry[]>>({
    overall: [],
    weekly: [],
    p2e: [],
    tournament: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filterValue, setFilterValue] = useState('');
  const [currentPlayerRank, setCurrentPlayerRank] = useState<LeaderboardEntry | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  
  // Generate mock data for the leaderboards
  useEffect(() => {
    const generateMockData = () => {
      // Mock AI agent names
      const agentNames = [
        'Vitalik Buterin', 'Gavin Wood', 'Charles Hoskinson', 'Michael Saylor',
        'Jihan Wu', 'Justin Sun', 'Roger Ver', 'Faketoshi', 'Andreas Antonopoulos',
        'Changpeng Zhao', 'Arthur Hayes', 'Elizabeth Warren', 'Donald Trump',
        'Brian Armstrong', 'Sam Bankman-Fried'
      ];
      
      // Generate mock data for each category
      const mockLeaderboards: Record<LeaderboardCategory, LeaderboardEntry[]> = {
        overall: [],
        weekly: [],
        p2e: [],
        tournament: []
      };
      
      // Generate data for each category
      Object.keys(mockLeaderboards).forEach((category) => {
        const entries: LeaderboardEntry[] = [];
        
        // Create 50 mock entries
        for (let i = 0; i < 50; i++) {
          const wins = Math.floor(Math.random() * 100) + 10;
          const losses = Math.floor(Math.random() * 50);
          const winRate = Math.round((wins / (wins + losses)) * 100);
          
          // Get random agent name
          const agentName = agentNames[Math.floor(Math.random() * agentNames.length)];
          
          // Generate random wallet address
          const randomAddress = `0x${Array.from({length: 40}, () => 
            Math.floor(Math.random() * 16).toString(16)).join('')}`;
          
          // Create date for last active (between last week and now)
          const now = new Date();
          const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const lastActive = new Date(lastWeek.getTime() + Math.random() * (now.getTime() - lastWeek.getTime()));
          
          // Calculate rating based on win rate and activity
          const rating = Math.floor(1000 + (winRate * 10) + (Math.random() * 500));
          
          entries.push({
            id: i + 1,
            rank: i + 1,
            address: randomAddress,
            name: agentName,
            avatar: `/${agentName}.avif`,
            wins,
            losses,
            winRate,
            lastActive: lastActive.toISOString().split('T')[0],
            rating
          });
        }
        
        // Sort by rating
        entries.sort((a, b) => b.rating - a.rating);
        
        // Update ranks after sorting
        entries.forEach((entry, idx) => {
          entry.rank = idx + 1;
        });
        
        mockLeaderboards[category as LeaderboardCategory] = entries;
      });
      
      // Create a player entry if connected
      if (isConnected && address) {
        // Calculate player stats
        const wins = Math.floor(Math.random() * 20) + 5;
        const losses = Math.floor(Math.random() * 10) + 1;
        const winRate = Math.round((wins / (wins + losses)) * 100);
        const rating = Math.floor(1000 + (winRate * 10) + (Math.random() * 200));
        
        // Create player entry
        const playerEntry: LeaderboardEntry = {
          id: 999,
          rank: Math.floor(Math.random() * 30) + 20, // Random rank between 20-50
          address: address,
          name: 'Your Agent',
          avatar: '/default.jpg',
          wins,
          losses,
          winRate,
          lastActive: new Date().toISOString().split('T')[0],
          rating
        };
        
        setCurrentPlayerRank(playerEntry);
        
        // Insert player entry into each leaderboard at the correct rank
        Object.keys(mockLeaderboards).forEach((category) => {
          const entries = [...mockLeaderboards[category as LeaderboardCategory]];
          entries.splice(playerEntry.rank - 1, 0, playerEntry);
          
          // Update ranks after insertion
          entries.forEach((entry, idx) => {
            entry.rank = idx + 1;
          });
          
          mockLeaderboards[category as LeaderboardCategory] = entries;
        });
      }
      
      return mockLeaderboards;
    };
    
    // Simulate API loading
    setIsLoading(true);
    setTimeout(() => {
      const data = generateMockData();
      setLeaderboards(data);
      setIsLoading(false);
    }, 1200);
  }, [address, isConnected]);
  
  // Filter leaderboard by name
  const filteredLeaderboard = leaderboards[selectedCategory].filter(entry => 
    entry.name.toLowerCase().includes(filterValue.toLowerCase()) ||
    shorten(entry.address).toLowerCase().includes(filterValue.toLowerCase())
  );
  
  // Handle category change
  const handleCategoryChange = (category: LeaderboardCategory) => {
    setSelectedCategory(category);
    setSelectedRow(null);
  };
  
  // Handle row selection
  const handleRowClick = (entry: LeaderboardEntry) => {
    setSelectedRow(entry.id);
    
    // You could navigate to an agent details page or open a modal
    console.log(`Selected agent: ${entry.name}`);
  };
  
  // Handle back navigation
  const handleBack = () => {
    router.push('/');
  };
  
  // Handle view matchups
  const handleViewMatchups = (entry: LeaderboardEntry) => {
    // This would navigate to a matchups page
    console.log(`View matchups for ${entry.name}`);
  };
  
  return (
    <div className="retro-container">
      <header className="py-6 px-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold retro-header">
          <span className="text-red-500">AI</span> AGENT LEADERBOARDS
        </h1>
        <button 
          onClick={handleBack}
          className="retro-button"
        >
          BACK TO MENU
        </button>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Category selector */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => handleCategoryChange('overall')}
            className={`retro-button ${selectedCategory !== 'overall' && 'opacity-70'}`}
          >
            ALL TIME
          </button>
          <button
            onClick={() => handleCategoryChange('weekly')}
            className={`retro-button ${selectedCategory !== 'weekly' && 'opacity-70'}`}
          >
            WEEKLY
          </button>
          <button
            onClick={() => handleCategoryChange('p2e')}
            className={`retro-button ${selectedCategory !== 'p2e' && 'opacity-70'}`}
          >
            PLAY TO EARN
          </button>
          <button
            onClick={() => handleCategoryChange('tournament')}
            className={`retro-button ${selectedCategory !== 'tournament' && 'opacity-70'}`}
          >
            TOURNAMENT
          </button>
        </div>
        
        {/* Search and filter */}
        <div className="mb-8 flex">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search agents..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
            <svg 
              className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        
        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="retro-loading"></div>
          </div>
        ) : (
          <>
            {/* Leaderboard table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse retro-table">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Wallet</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">W/L</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Win Rate</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Last Active</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.slice(0, 25).map((entry) => (
                    <tr 
                      key={entry.id}
                      onClick={() => handleRowClick(entry)}
                      className={`
                        ${entry.address === address ? 'player-row' : ''} 
                        ${selectedRow === entry.id ? 'bg-gray-700' : ''}
                        cursor-pointer transition-colors
                      `}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-lg font-bold ${entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : entry.rank === 3 ? 'rank-3' : 'text-white'}`}>
                          {entry.rank === 1 ? '🏆 ' : entry.rank === 2 ? '🥈 ' : entry.rank === 3 ? '🥉 ' : ''}{entry.rank}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-700 mr-4">
                            <img src={entry.avatar} alt={entry.name} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <div className="text-lg font-semibold">{entry.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {shorten(entry.address)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{entry.wins} / {entry.losses}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${entry.winRate > 70 ? 'text-green-500' : entry.winRate > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {entry.winRate}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold">{entry.rating.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {entry.lastActive}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMatchups(entry);
                          }}
                          className="retro-button text-sm py-1 px-3"
                        >
                          View Matchups
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Your rank (if connected) */}
            {currentPlayerRank && (
              <div className="mt-10 p-6 bg-gray-800 rounded-lg border-2 border-red-600">
                <h2 className="text-xl font-bold mb-4">Your Ranking</h2>
                <div className="flex items-center">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-700 mr-6">
                    <img src={currentPlayerRank.avatar} alt="Your Avatar" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold">{currentPlayerRank.name}</span>
                    <span className="text-gray-400">{shorten(currentPlayerRank.address)}</span>
                  </div>
                  <div className="ml-auto flex items-center space-x-10">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">#{currentPlayerRank.rank}</div>
                      <div className="text-sm text-gray-400">Rank</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentPlayerRank.winRate}%</div>
                      <div className="text-sm text-gray-400">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentPlayerRank.rating}</div>
                      <div className="text-sm text-gray-400">Rating</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentPlayerRank.wins}/{currentPlayerRank.losses}</div>
                      <div className="text-sm text-gray-400">W/L</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}