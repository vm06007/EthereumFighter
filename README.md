# (EF) - Ethereum Fighter

<div align="center">
  <img src="public/world-0.jpg" alt="(EF) - Ethereum Fighter Banner" width="800"/>
  <h2>The Ultimate AI Agent Trading Arena</h2>
</div>

## 🌟 Overview

**(EF) - Ethereum Fighter** is a revolutionary blockchain-based combat arena where AI agents compete in high-stakes trading battles. Players select and control AI personalities from the crypto world, executing trades through FHE-compatible smart contracts that keep strategies private until execution.

Unlike traditional trading competitions, (EF) - Ethereum Fighter combines the strategic depth of algorithmic trading with the excitement of head-to-head combat gameplay. Each AI agent has unique strengths, limitations, and trading strategies based on their real-world counterparts.

## 🤖 AI Agent Combat System

(EF) - Ethereum Fighter features a roster of 16 legendary crypto personalities, each with distinct capabilities for AI agent to train on their historical trading patterns:

- **Vitalik Buterin** - Cooperative Advisory model with Ethereum expertise
- **Michael Saylor** - Strategic Investment model specializing in Bitcoin maximalism
- **Elizabeth Warren** - Regulatory Skeptic focused on compliance requirements
- **SBF** - Risk Manager with high-leverage trading strategies (use at your own risk!)
- **Roger Ver** - Payments Evangelist championing merchant adoption
- ... and many others!

Each agent is powered by sophisticated LLM models (Claude, GPT-4, LLaMA) that exhibit unique trading behaviors and decision-making processes.

## 🔒 Privacy-Preserving Battle Mechanics

(EF) - Ethereum Fighter leverages fully homomorphic encryption (FHE) to ensure complete privacy during battles:

- Players' positions and balances remain encrypted while on-chain
- Trading strategies stay hidden from opponents until execution
- Contract interactions are encrypted but verifiable
- Final outcomes are provably fair while preserving player privacy

This revolutionary approach allows for true strategy-based competition without information leakage.

### Multi-Chain Deployments

(EF) - Ethereum Fighter is deployed across multiple chains to optimize for different aspects of gameplay:

| Chain | Contract Address | Purpose |
|-------|-----------------|---------|
| Sepolia | `0x98b65ab65f908Ca25F3D4c793Af55C3386178E5b` | Main gameplay and tournament contracts |
| Polygon | `0x9D12F8A512875807EF836F8207497d68201C3D5c` | High-frequency trading matches with lower gas fees |
| Celo | `0x6B6Ec78Db692C01a0235f27b1144e74664F0AA85` | Mobile-friendly gameplay with carbon-neutral footprint |

CELO:
https://repo.sourcify.dev/42220/0x6B6Ec78Db692C01a0235f27b1144e74664F0AA85

Our architecture leverages each chain's unique strengths while maintaining cross-chain asset compatibility through secure bridge mechanics.

## 🎮 Immersive UI Experience

The game features a nostalgic arcade-style interface with modern crypto elements:

- Character selection screen with detailed agent profiling
- Real-time battle visualizations for trade execution
- Vintage fighting game aesthetics with blockchain data overlays
- Dual-player setup for direct head-to-head competition
- Support for spectator mode to watch high-stakes battles

### 1inch API Integration

(EF) - Ethereum Fighter leverages the 1inch API for comprehensive market data and portfolio management:

- Real-time price feeds for over 500+ tokens across multiple chains
- Optimized swap routes for trade execution with minimal slippage
- Portfolio valuation and performance tracking during battles
- Historical price data for post-match analysis and replay
- Gas optimization for trade execution during high volatility periods

### DualShock & DualSense Controller Support

Experience (EF) - Ethereum Fighter with full PlayStation controller support for more immersive gameplay:

![Controller Support](https://img.shields.io/badge/PlayStation-Controllers-blue?style=for-the-badge&logo=playstation)

- **Full Controller Integration**: Play with PS4 (DualShock 4) or PS5 (DualSense) controllers
- **Haptic Feedback**: Feel market movements and trade executions through controller vibrations
- **Adaptive Triggers**: Resistance changes based on market volatility and position sizing
- **Motion Controls**: Use gyroscope for navigating agent abilities and trading charts
- **RGB Lightbar**: Visual feedback showing portfolio performance and trade status

Controller mappings are clearly outlined throughout the game interface, with [gamepad.css](https://dxlliv.github.io/gamepad.css/) providing visual guidance for button controls. The controller experience enhances the arcade-like feel while allowing precise trading actions during intense market battles.

## 💰 Dynamic Betting System

Increase the stakes at any point during battle:

- Start with minimum position sizes for testing strategies
- Scale up bets when you're confident in your agent's performance
- Hidden balance mechanism prevents opponents from seeing your true position
- Automated settlement through smart contracts ensures fair payouts

### Strategic Bluffing Mechanics

The FHE-powered privacy system enables sophisticated poker-like bluffing strategies:

- **Balance Concealment**: Your actual trading performance is hidden from opponents
- **Strategic Stake Adjustment**: Increase or decrease your stake (DELTA) from the original amount
- **Bluff With Confidence**: Project strength even when behind by raising stakes
- **Call Their Bluff**: Force opponents to reveal their hand by matching their stake
- **High-Stakes Standoff**: Opponents must respond to stake changes before gameplay continues

When a player changes their stake, gameplay pauses until the opponent decides to:
1. **Match the Stake**: Accept the new terms and continue the battle
2. **Forfeit the Game**: Retreat and concede defeat if unwilling to match

This creates intense psychological gameplay where reading your opponent becomes as important as trading performance itself. Since balances are encrypted through FHE, even players who are down in actual value can pull off convincing bluffs to turn the tide of battle.

### METAL Token Integration

(EF) - Ethereum Fighter is powered by METAL tokens for in-game economics and rewards:

- **METAL Mining**: Players earn METAL tokens through successful trades and battle victories
- **Dynamic Minting**: Game-specific METAL tokens are minted based on AI agent performance metrics
- **Tournament Prizes**: Weekly and monthly leaderboards distribute METAL token rewards
- **Governance Rights**: METAL holders vote on game parameters and future AI agent additions
- **Enhanced Abilities**: Unlock special agent abilities and trading strategies with METAL staking

## 🚀 Getting Started

### Prerequisites

```bash
# Install dependencies
bun install

# Start the development server
bun dev
```

### Basic Gameplay

1. **Connect your wallet** to access the game
2. **Select your AI agent** from our roster of crypto personalities
3. **Enter a trading battle** against another player or AI
4. **Issue commands** to your agent to execute trades
5. **Increase your position** as the battle progresses
6. **Claim victory** when your trading performance outmatches your opponent

## 🔧 Technical Architecture

(EF) - Ethereum Fighter is built on a cutting-edge stack:

- **Frontend**: Next.js with TailwindCSS for responsive UI
- **Blockchain Interaction**: wagmi + Privy for seamless wallet integration
- **Smart Contracts**: Solidity with FHE extensions for private execution
- **AI Integration**: Advanced LLM integrations for agent personality simulation
- **Off-chain Computation**: Zero-knowledge proofs for validating trade outcomes
- **Market Data**: 1inch API for real-time pricing and swap execution
- **Token Economics**: METAL token infrastructure for rewards and governance

### System Architecture

The (EF) - Ethereum Fighter ecosystem consists of three main components:

```
(EF) - Ethereum Fighter/
├── frontend/
│   ├── wagmi-demo/           # Main game UI with wallet integration
│   ├── fhe-example-nextjs/   # FHE implementation for private balances
│   └── secretllm_nextjs/     # Encrypted AI agent communication
│
├── backend/
│   ├── api/                  # Python-based API endpoints
│   │   ├── data_read.py      # Transaction and position data retrieval
│   │   ├── data_write.py     # Update player positions and balances
│   │   ├── schema_create.py  # Database schema management
│   │   └── index.py          # Main API router
│   └── wallet_storage/       # Secure wallet state management
│
└── contracts/                # Smart contract implementations
    ├── core/                 # Core gameplay contracts
    ├── fhe/                  # FHE-specific implementations
    └── tokens/               # Token and NFT contracts
```

This distributed architecture ensures:
- Clear separation between UI, game logic, and blockchain interaction
- Dedicated components for privacy-preserving computations
- Scalable backend services for high-concurrency gameplay
- Secure storage of encrypted wallet and game state information

### Templates & Frameworks

(EF) - Ethereum Fighter builds upon several innovative open-source templates:

- [**fhevm-next-template**](https://github.com/zama-ai/fhevm-next-template): Core foundation for FHE-compatible smart contract integration, enabling private trading strategies and encrypted position management
- [**wagmi-demo**](https://github.com/privy-io/wagmi-demo): Wallet integration framework for seamless connection to multiple chains and wallet types
- [**blind-module-examples**](https://github.com/NillionNetwork/blind-module-examples): Privacy-preserving computational modules for sensitive trading data and position calculations

By combining these battle-tested frameworks, (EF) - Ethereum Fighter achieves a balance between transparency, privacy, and performance that would be impossible to build from scratch. We've extended each template with game-specific features while maintaining compatibility with their core security models.

### Contract Architecture

Our core smart contract system consists of several specialized components:

```
(EF) - Ethereum Fighter/
├── contracts/
│   ├── core/
│   │   ├── AgentRegistry.sol         # Manages AI agent registration and capabilities
│   │   ├── BattleArena.sol           # Core gameplay and matchmaking logic
│   │   ├── TradingEngine.sol         # Executes and verifies trading strategies
│   │   └── SettlementProcessor.sol   # Handles trade settlement and outcome resolution
│   ├── fhe/
│   │   ├── EncryptedPosition.sol     # FHE-compatible position tracking
│   │   ├── PrivateExecution.sol      # Encrypted trade execution logic
│   │   ├── ConfidentialTrader.sol    # Secure trading strategy execution
│   ├── tokens/
│   │   ├── MetalToken.sol            # ERC-20 implementation of METAL token
│   │   ├── AgentNFT.sol              # ERC-721 for unique AI agent ownership
│   │   └── TempleToken.sol           # ERC-1155 for agent power-ups and accessories
│   └── interfaces/
│       ├── IExternalProtocols.sol    # Interfaces for DeFi protocol integration
│       ├── IAgentOracle.sol          # Interface for agent performance data
│       └── I1inchRouter.sol          # Interface for 1inch swap routing
```

Deployed contract addresses and verification links:

- **FHE Example (Sepolia)**: [`0x98b65ab65f908Ca25F3D4c793Af55C3386178E5b`]

Full Contract: https://eth-sepolia.blockscout.com/address/0x2c6E6D10f1a56Ad3bba99dBA49567F5911CB95e2?tab=contract

## 🔮 Future Development

Our roadmap includes:

- Tournament mode with bracket-style elimination
- Additional AI agents with unique trading styles
- Advanced strategy training for your preferred agents
- Multi-chain support for cross-chain battles
- DAO governance for game parameters and agent balancing

## 🤝 Contributing

We welcome contributions from the community! Check out our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## 📄 License

(EF) - Ethereum Fighter is released under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <h3>Enter the arena. Choose your agent. Trade to victory.</h3>
  <p>© ETHGLOBAL 2025 TAIPEI</p>
</div>
