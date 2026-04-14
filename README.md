# HashClaw — AI-Powered On-Chain Wealth Manager

> **HashKey Chain On-Chain Horizon Hackathon** | AI Track × PayFi Track  
> Built on HashKey Chain (OP Stack L2) · Powered by Claude/LLaMA Vision · Settled via HSP

---

##  Overview

**HashClaw** is an autonomous AI agent that manages a user's on-chain portfolio across HashKey Chain — intelligently allocating between tokenized Real-World Assets (RWAs), veHSK staking, and liquidity pools — and executing yield withdrawals via **HSP (HashKey Settlement Protocol)**.

The agent monitors live on-chain yield signals, asset price feeds, and user-defined risk profiles to make continuous rebalancing decisions — without requiring the user to manually interact with any protocol. Think of it as a **compliance-native robo-advisor that lives entirely on-chain**.

---

## Problem Statement

DeFi offers high yields but demands constant manual attention. Meanwhile, institutional and retail users on HashKey Chain now have access to tokenized RWAs (silver, MMF, real estate) — but **no intelligent layer** to orchestrate these assets together.

Users face three friction points:
- **Fragmentation**: RWA tokens, veHSK staking, and liquidity pools are siloed with no unified management layer
- **Complexity**: Manually rebalancing across protocols requires deep DeFi expertise
- **Compliance gap**: No autonomous agent exists that respects HashKey Chain's institutional-grade compliance posture

HashClaw solves all three.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│         (Telegram Bot / Web Dashboard / Voice Input)            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI DECISION ENGINE                         │
│                                                                 │
│   ┌──────────────────┐    ┌──────────────────────────────────┐  │
│   │  LLM Orchestrator│    │     Risk Profile Manager         │  │
│   │  (Claude Sonnet /│    │  (conservative / balanced /      │  │
│   │  LLaMA-4 Scout)  │    │   aggressive)                    │  │
│   └────────┬─────────┘    └──────────────┬───────────────────┘  │
│            │                             │                      │
│            ▼                             ▼                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Rebalancing Strategy Planner               │   │
│   │   (yield delta analysis · allocation optimizer ·        │   │
│   │    gas-aware execution scheduler)                       │   │
│   └────────────────────────┬────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌──────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│   RWA Protocols  │ │  veHSK      │ │  Liquidity Pools    │
│  (Silver Token · │ │  Staking    │ │  (AMM LP positions) │
│   MMF Token ·    │ │  Contract   │ │                     │
│   Real Estate)   │ │             │ │                     │
└──────────────────┘ └─────────────┘ └─────────────────────┘
            │               │               │
            └───────────────┴───────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HSP SETTLEMENT LAYER                         │
│         (Yield withdrawals · Payment requests ·                 │
│          Receipts · On-chain status sync)                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  HashKey Chain (OP Stack L2)
```

---

## Core Features

### Autonomous Rebalancing
The AI agent continuously monitors portfolio allocation against user-defined target weights. When allocation drift exceeds a configurable threshold (default: 5%), it generates and executes a rebalancing plan.

- Reads live APY from veHSK staking contracts
- Fetches RWA token price feeds via on-chain oracles
- Estimates gas costs before committing to any rebalance
- Logs every decision with natural language reasoning for full auditability

### Multi-Asset Portfolio Support
| Asset Class | Protocol | Description |
|---|---|---|
| Silver RWA Token | HashKey Tokenisation | Regulated silver-backed on-chain token |
| MMF Token | HashKey RWA Suite | Money Market Fund tokenized on-chain |
| veHSK | HashKey Chain Staking | Vote-escrowed HSK with boosted yield |
| Stable LP | On-chain AMM | Stablecoin liquidity pool positions |

### HSP-Powered Yield Withdrawals
When yield is harvested, HashClaw uses **HSP (HashKey Settlement Protocol)** to:
1. Generate a structured payment request (HSP message)
2. Route yield to the user's nominated settlement address
3. Sync receipt and confirmation status on-chain
4. Provide a verifiable, auditable payment trail

This makes HashClaw natively compatible with the **PayFi track** — HSP is the settlement layer, not an afterthought.

### Natural Language Interface
Users interact in plain English (or Hindi) via Telegram:
> *"Move 20% of my portfolio from Silver RWA to the stablecoin pool"*
> *"Show me my yield earned this week"*
> *"Set my risk profile to conservative"*

Voice input is supported via Groq Whisper (`whisper-large-v3-turbo`).

### Portfolio Dashboard
A real-time dashboard shows:
- Current allocation breakdown (pie chart)
- Yield earned per asset class (7d / 30d)
- Rebalancing history with AI reasoning logs
- HSP settlement status for pending withdrawals

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | HashKey Chain (OP Stack L2) |
| AI Orchestration | LLaMA-4 Scout via Groq (reasoning + vision) |
| Voice Input | Groq Whisper (`whisper-large-v3-turbo`) |
| Payment Settlement | HSP — HashKey Settlement Protocol |
| Smart Contracts | Solidity (Hardhat) |
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Node.js + TypeScript |
| Wallet / AA | ethers.js v6 + EIP-4337 Account Abstraction |
| Price Feeds | Chainlink CCIP / on-chain oracles |
| Bot Interface | Telegram Bot API (telegraf) |

---

## Project Structure

```
hashclaw/
├── contracts/
│   ├── TreasuryVault.sol          # Core portfolio vault contract
│   ├── RebalanceExecutor.sol      # On-chain execution of rebalance plans
│   ├── HSPSettlement.sol          # HSP integration for yield withdrawals
│   └── interfaces/
│       ├── IRWAToken.sol
│       └── IveHSK.sol
├── agent/
│   ├── orchestrator.ts            # Main AI agent loop
│   ├── planner.ts                 # Rebalancing strategy planner
│   ├── llm.ts                     # LLM client (Groq / LLaMA-4 Scout)
│   ├── risk.ts                    # Risk profile manager
│   └── signals/
│       ├── yieldFetcher.ts        # Reads live APY from contracts
│       └── priceFetcher.ts        # Reads RWA price feeds
├── hsp/
│   ├── paymentRequest.ts          # Build HSP payment messages
│   ├── settlementMonitor.ts       # Poll HSP status on-chain
│   └── receiptStore.ts            # Store payment receipts
├── bot/
│   ├── index.ts                   # Telegram bot entry point
│   ├── commands.ts                # /portfolio, /rebalance, /withdraw
│   └── voice.ts                   # Groq Whisper voice handler
├── frontend/
│   ├── app/
│   │   ├── dashboard/page.tsx     # Main portfolio dashboard
│   │   └── history/page.tsx       # Rebalancing history
│   └── components/
│       ├── AllocationChart.tsx
│       └── YieldCard.tsx
├── scripts/
│   ├── deploy.ts                  # Contract deployment (HashKey Chain)
│   └── seed.ts                    # Seed demo portfolio for demo
├── test/
│   ├── vault.test.ts
│   └── rebalance.test.ts
├── .env.example
├── hardhat.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- A HashKey Chain wallet with testnet HSK (get from the [faucet](https://hashkeychain.net/))
- API keys: Anthropic (Claude) or OpenRouter, Telegram Bot Token, Groq

### 1. Clone & Install

```bash
git clone https://github.com/your-handle/hashclaw.git
cd hashclaw
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

```env
# HashKey Chain
HASHKEY_RPC_URL=https://mainnet.hsk.xyz
HASHKEY_CHAIN_ID=177
PRIVATE_KEY=your_deployer_private_key

# AI
GROQ_API_KEY=your_groq_key                    # reasoning, vision + voice input

# Bot
TELEGRAM_BOT_TOKEN=your_telegram_token

# Contracts (populated after deploy)
TREASURY_VAULT_ADDRESS=
REBALANCE_EXECUTOR_ADDRESS=
HSP_SETTLEMENT_ADDRESS=
```

### 3. Deploy Contracts

```bash
npx hardhat run scripts/deploy.ts --network hashkey
```

### 4. Run the AI Agent

```bash
npm run agent
```

### 5. Start the Telegram Bot

```bash
npm run bot
```

### 6. Run the Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## Demo Walkthrough

The demo script (`scripts/seed.ts`) sets up a sample portfolio:

| Asset | Initial Allocation |
|---|---|
| Silver RWA Token | 40% |
| veHSK Staking | 35% |
| Stablecoin LP | 25% |

**Demo flow:**
1. Seed the portfolio on HashKey Chain testnet
2. Open the dashboard — see live allocation and APY
3. Trigger a simulated yield spike on the Silver RWA token
4. Watch the AI agent detect the drift, reason through the rebalance, and execute it
5. Agent harvests yield and initiates an HSP payment request to the user's address
6. Dashboard updates with new allocation, transaction hash, and HSP receipt

**Telegram demo:**
```
User:  /portfolio
Agent: Your portfolio: Silver RWA 40% · veHSK 35% · Stable LP 25%
       Total value: $12,450 · Yield (7d): $87.23

User:  Move 10% from Silver to staking
Agent: Executing rebalance: -10% Silver RWA → +10% veHSK
       Estimated gas: 0.0012 HSK · Executing...
       Transaction confirmed: 0xabc...def
```

---

## Security & Compliance

- All contracts use **OpenZeppelin** battle-tested base implementations
- Rebalance operations are **owner-gated** — only the user's own wallet can trigger execution
- AI decisions are **advisory by default**: users can configure the agent to require manual approval before any on-chain action (guardian mode)
- HSP is used only for payment message routing — no funds are custodied by the protocol
- Designed for HashKey Chain's **institutional-grade compliance posture**: every action is logged with a full audit trail

---

## Roadmap

**Hackathon MVP (delivered)**
- Core rebalancing agent with Claude/LLaMA decision layer
- veHSK + RWA + LP portfolio support
- HSP yield withdrawal integration
- Telegram bot with voice input
- Frontend dashboard

**Post-hackathon (with HashKey ecosystem support)**
- ZK-attested portfolio performance proofs (ZKID integration)
- Cross-chain portfolio support via Chainlink CCIP
- Social portfolio vaults — users pool funds and share AI strategy
- Mobile app with biometric approval for on-chain actions
- Integration with HashKey Exchange for fiat on/off ramp of yield

---

## License

MIT License — see [LICENSE](./LICENSE)

---

## Acknowledgements

- [HashKey Chain](https://hashkeychain.net/) for the institutional-grade L2 infrastructure
- [HashKey Tokenisation](https://group.hashkey.com/) for the RWA token suite
- [Groq](https://groq.com) for LLaMA-4 Scout inference and Whisper voice transcription
- [OpenZeppelin](https://openzeppelin.com) for smart contract libraries

---

> *HashClaw — because your on-chain wealth deserves an intelligent guardian.*
