# HashClaw — AI-Powered On-Chain Wealth Manager

> **HashKey Chain On-Chain Horizon Hackathon** | AI Track × PayFi Track  
> Deployed on HashKey Chain Testnet (chainId 133) · AI by Groq / LLaMA-3.3-70b · Settled via HSP

---

## Overview

**HashClaw** is an autonomous AI agent that manages a user's on-chain portfolio across HashKey Chain — intelligently allocating between tokenized Real-World Assets (RWAs), veHSK staking, and liquidity pools — and routing yield withdrawals via **HSP (HashKey Settlement Protocol)**.

The agent monitors live on-chain yield signals and user-defined risk profiles to make continuous rebalancing decisions without requiring the user to manually interact with any protocol.

---

## Live Deployment (Testnet)

| Contract | Address |
|---|---|
| TreasuryVault | `0x53aEB1b4126310b8024C5C3Cc83B6915E6369dA5` |
| RebalanceExecutor | `0x6c409DE60eDF1E5406521D2329AF9aD52d3Af023` |
| HSPSettlement | `0x9E9C18ABA331F96c38Ec21D54Dd6380802f04C19` |
| xXAG (RWA Silver) | `0x4E9DCCB77006aD4d8872916c4bA01D7c5eCab37d` |
| xMMF (RWA MMF) | `0xf960c702943938792606E4cA594179ed68eBD8a1` |
| veHSK | `0x4b889F56987060CA10363c058F212F0f601Ebb57` |
| USDC-USDT LP | `0x989D4433800e87a1e2fb1052f7cbd8e10EA424EC` |

Explorer: [testnet-explorer.hsk.xyz](https://testnet-explorer.hsk.xyz)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CHAT UI (browser)                  │
│         Wallet connect · Deposit · Risk profile       │
└───────────────────────────┬──────────────────────────┘
                            │ HTTP
                            ▼
┌──────────────────────────────────────────────────────┐
│               NODE SERVER  (frontend/server.ts)       │
│  /api/config  /api/portfolio  /api/yields  /api/chat  │
│                    Groq LLaMA-3.3-70b                 │
└────────────────┬────────────────────┬────────────────┘
                 │ read (public RPC)  │ write (agent wallet)
                 ▼                    ▼
┌──────────────────────────────────────────────────────┐
│              HASHKEY CHAIN TESTNET (chainId 133)      │
│                                                       │
│  TreasuryVault ──► RebalanceExecutor                  │
│       │                    │                          │
│   user balances       simulated swaps                 │
│   risk profiles        on-chain logs                  │
│                                                       │
│  HSPSettlement  (payment request events)              │
└──────────────────────────────────────────────────────┘
                            ▲
                            │ poll every 5 min
┌──────────────────────────────────────────────────────┐
│            AI AGENT LOOP  (agent/orchestrator.ts)     │
│  fetch yields → check drift → Groq → execute tx      │
│  cooldown: 30 min · threshold: 5% drift              │
└──────────────────────────────────────────────────────┘
```

---

## Features

### Autonomous Rebalancing Agent
- Polls yield signals every 5 minutes
- Only rebalances when portfolio drifts >5% from target weights
- 30-minute cooldown between rebalances prevents gas waste
- Every decision logged on-chain with plain-English AI reasoning

### Multi-Asset Portfolio
| Asset | Symbol | Type | Live APY |
|---|---|---|---|
| RWA Silver Token | xXAG | RWA | ~4.8% |
| RWA Money Market Fund | xMMF | RWA | ~5.2% |
| Staked HSK | veHSK | Staking | ~12.4% |
| Stable LP | USDC-USDT-LP | LP | ~3.1% |

### HSP Settlement Layer
`HSPSettlement.sol` emits structured `PaymentRequestCreated` events that HSP relayers consume for off-chain settlement. Every yield withdrawal is tied to an auditable on-chain reference hash linking it to the originating rebalance plan.

### AI Chat Interface
Web-based chat where users ask questions in plain English. The AI receives live portfolio state and yield signals as context on every message — no hallucinated numbers.

### Risk Profiles
Three on-chain risk profiles (Conservative / Balanced / Aggressive) stored per wallet in `TreasuryVault`. The agent respects the profile when recommending allocations.

---

## Project Structure

```
hashclaw/
├── contracts/
│   ├── TreasuryVault.sol        # Portfolio vault — deposits, withdrawals, risk profiles
│   ├── RebalanceExecutor.sol    # Executes AI rebalance plans on-chain
│   ├── HSPSettlement.sol        # HSP payment request emission + settlement tracking
│   └── MockERC20.sol            # Testnet-only mintable ERC-20
├── agent/
│   ├── orchestrator.ts          # Main agent loop (drift check → AI → execute)
│   ├── groqAdvisor.ts           # Groq LLaMA-3.3-70b rebalance recommendation
│   └── signals/
│       └── yieldFetcher.ts      # Live APY signals from on-chain contracts
├── frontend/
│   ├── server.ts                # Node HTTP server + API endpoints
│   └── src/index.html           # Single-page chat UI with wallet connection
├── scripts/
│   ├── deploy.ts                # Deploy all 3 contracts + wire permissions
│   └── seed.ts                  # Deploy mock tokens, register assets, fund vault
├── test/
│   └── HashClaw.test.ts         # Integration tests for all 3 contracts
├── hardhat.config.ts
├── .env.example
└── package.json
```

---

## Try It Yourself

Anyone with a MetaMask wallet can use HashClaw on testnet — no code required.

### 1. Get testnet HSK
Get test HSK from the HashKey Chain faucet (check [docs.hashkeychain.net](https://docs.hashkeychain.net) or the HashKey Discord).

### 2. Add HashKey Chain Testnet to MetaMask

| Field | Value |
|---|---|
| Network Name | HashKey Chain Testnet |
| RPC URL | `https://testnet.hsk.xyz` |
| Chain ID | `133` |
| Currency | HSK |
| Explorer | `https://testnet-explorer.hsk.xyz` |

Or click **Connect Wallet** in the UI — it will prompt you to add the network automatically.

### 3. Open the UI

```bash
git clone https://github.com/your-handle/hashclaw
cd hashclaw
pnpm install
cp .env.example .env
# Fill in GROQ_API_KEY (free at console.groq.com)
pnpm run ui
# Open http://localhost:3000
```

### 4. In the browser

1. **Connect Wallet** — MetaMask prompts to add HashKey Chain Testnet
2. **Mint Test Tokens** — click "Mint Test Tokens" to get 1,000 of each asset (public mint, testnet only)
3. **Deposit** — enter amounts and click Deposit (approve + deposit in one flow)
4. **Chat** — ask the AI anything: "Should I rebalance?", "What's my best yield?", "Set me to balanced"
5. **Set Risk Profile** — Low / Mid / High stored on-chain per your wallet

---

## Run Everything Locally

```bash
# Install
pnpm install

# Deploy contracts to testnet (fills .env automatically)
pnpm run deploy

# Seed demo portfolio with mock tokens
pnpm run seed

# Start the chat UI → http://localhost:3000
pnpm run ui

# Start the autonomous agent loop (separate terminal)
pnpm run dev

# Run tests (local Hardhat network)
pnpm test
```

### Environment Variables

```env
# Network
HASHKEY_RPC_URL=https://testnet.hsk.xyz
HASHKEY_CHAIN_ID=133

# Deployer wallet (0x-prefixed)
PRIVATE_KEY=0x...

# Groq — free at console.groq.com
GROQ_API_KEY=gsk_...

# Auto-filled by pnpm run deploy
TREASURY_VAULT_ADDRESS=
REBALANCE_EXECUTOR_ADDRESS=
HSP_SETTLEMENT_ADDRESS=

# Auto-filled by pnpm run seed
RWA_SILVER_ADDRESS=
RWA_MMF_ADDRESS=
VEHSK_ADDRESS=

# Agent tuning
POLL_INTERVAL_MS=300000        # check every 5 min
REBALANCE_COOLDOWN_MS=1800000  # min 30 min between rebalances
DRIFT_THRESHOLD=0.05           # rebalance if any asset drifts >5%
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | HashKey Chain Testnet (OP Stack L2, chainId 133) |
| Smart Contracts | Solidity 0.8.24 · Hardhat · OpenZeppelin v5 |
| AI | Groq · LLaMA-3.3-70b-versatile |
| Backend | Node.js · TypeScript · ethers.js v6 |
| Frontend | Vanilla HTML/CSS/JS · ethers.js browser bundle |
| Payment Settlement | HSP — HashKey Settlement Protocol |

---

## Security

- All rebalance operations are **owner-gated** — only the vault owner's agent can call `submitAndExecute`
- `ReentrancyGuard` on all state-changing vault functions
- User balances are isolated per-address (`mapping(address => mapping(uint256 => uint256))`)
- AI decisions are logged on-chain with plain-English reasoning for full auditability
- `MockERC20` is excluded from production deployments (testnet only)

---

## Roadmap

**Hackathon MVP (delivered)**
- Autonomous rebalancing agent with Groq/LLaMA decision layer
- TreasuryVault + RebalanceExecutor + HSPSettlement on HashKey Chain testnet
- Web chat UI with MetaMask wallet connection
- Public mint flow for frictionless testnet demos
- Drift threshold + cooldown guards on agent

**Post-hackathon**
- Real RWA token integrations (HashKey Tokenisation partners)
- veHSK staking contract integration for live APY reads
- Price oracle feeds (replace demo APY with live data)
- Guardian mode — AI advises, user approves before execution
- Mobile app with biometric approval

---

## License

MIT

---

> *HashClaw — because your on-chain wealth deserves an intelligent guardian.*
