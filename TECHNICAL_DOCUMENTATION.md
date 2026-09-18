# LUNARIS TERMINAL — TECHNICAL SPECIFICATION & JUDGING MASTER GUIDE
### Bitget AI Base Camp Hackathon (Season 2)
**Project Name:** Lunaris Terminal (Bitget Edition)  
**Developer / Architect:** Joezzy (@JoezzyWeb3 / joezzyweb3@gmail.com)  
**Live Application URL:** https://lunaristerminal.vercel.app/  
**Platform Track:** Autonomous AI Trading Agents / Institutional Cross-Asset Terminal  
**Core Technologies:** React 19, TypeScript, Tailwind CSS v4, Express Node.js Engine, Google Gemini 2.5/Flash AI, Google Firebase Firestore, Bitget Open API V2, Web Audio API Parametric Sound Engine  

---

## TABLE OF CONTENTS
1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [What Makes Lunaris Unique (The Competitive Edge)](#2-what-makes-lunaris-unique-the-competitive-edge)
3. [Design System & Cybernetic Visual Architecture](#3-design-system--cybernetic-visual-architecture)
4. [High-Level Technical Architecture](#4-high-level-technical-architecture)
5. [The Three Architectural Pillars](#5-the-three-architectural-pillars)
   - 5.1 [Pillar I: Multi-Agent Quorum Consensus Engine](#51-pillar-i-multi-agent-quorum-consensus-engine)
   - 5.2 [Pillar II: Deterministic Risk Veto Engine & Hard Kill Switch](#52-pillar-ii-deterministic-risk-veto-engine--hard-kill-switch)
   - 5.3 [Pillar III: 7×24 Autonomous Loop & Verifiable Ledger](#53-pillar-iii-724-autonomous-loop--verifiable-ledger)
6. [Comprehensive Section-by-Section Walkthrough (Judge's Guide)](#6-comprehensive-section-by-section-walkthrough-judges-guide)
   - 6.1 [Command Deck (DECK)](#61-command-deck-deck)
   - 6.2 [Terminal Cockpit (TERMINAL)](#62-terminal-cockpit-terminal)
   - 6.3 [Autonomous Loop (AUTOPILOT)](#63-autonomous-loop-autopilot)
   - 6.4 [AI Multi-Agent Council (COUNCIL)](#64-ai-multi-agent-council-council)
   - 6.5 [Social Pulse Radar (PULSE)](#65-social-pulse-radar-pulse)
   - 6.6 [Visual Algo Strategy Builder (ALGO)](#66-visual-algo-strategy-builder-algo)
   - 6.7 [Paper Trading Audit & Daily PnL Calendar (AUDIT)](#67-paper-trading-audit--daily-pnl-calendar-audit)
7. [Specialized Modals & Disaster Drills](#7-specialized-modals--disaster-drills)
   - 7.1 [Bitget V2 API BYOK Modal](#71-bitget-v2-api-byok-modal)
   - 7.2 [Black Swan Disaster Drill Modal](#72-black-swan-disaster-drill-modal)
   - 7.3 [Global Command Palette (Cmd+K / Ctrl+K)](#73-global-command-palette-cmdk--ctrlk)
   - 7.4 [Web Audio API Synthesizer & Soundscape](#74-web-audio-api-synthesizer--soundscape)
   - 7.5 [Auditor Cloud Sanitizer & Passcode Gate](#75-auditor-cloud-sanitizer--passcode-gate)
8. [Data Models & State Synchronization](#8-data-models--state-synchronization)
9. [Bitget Hackathon Scoring Rubric Alignment](#9-bitget-hackathon-scoring-rubric-alignment)
10. [Local Development & Deployment Guide](#10-local-development--deployment-guide)

---

## 1. EXECUTIVE SUMMARY & PRODUCT VISION

**Lunaris Terminal** is an institutional-grade, cross-asset AI autonomous trading terminal designed specifically for the **Bitget AI Base Camp S2 Hackathon**. Inspired by institutional trading systems (Bloomberg Terminal, Moonberg, Aladdin), Lunaris solves the single largest vulnerability in modern algorithmic and AI trading: **unregulated LLM hallucinations in financial execution**.

Traditional trading bots either rely on rigid, brittle technical indicators (RSI/MACD crossovers that fail during regime shifts) or naive LLM prompts that suffer from hallucinations, order duplication, and lack of mathematical risk boundaries.

Lunaris introduces a tri-layer fail-safe trading model:
1. **Multi-Agent Deliberation (Adversarial AI)**: Three specialized, competing AI agents evaluate every market signal simultaneously.
2. **Deterministic Risk Veto (Zero-Trust Mathematical Gate)**: A strict, non-LLM algorithmic ruleset with absolute veto power over all AI decisions.
3. **Autonomous 7×24 Execution with Verifiable Auditability**: Real-time trade streaming, order execution simulation against live Bitget orderbooks, SHA-256 transaction proof hashing, and multi-tier cloud persistence across Google Firebase Firestore and disk storage.

Lunaris bridges native cryptocurrency pairs (`BTC/USDT`, `ETH/USDT`, `SOL/USDT`, `SUI/USDT`, `BGB/USDT`) with **24/7 tokenized equities (rTokens)** (`NVDAon/USDT`, `TSLAon/USDT`, `AAPLon/USDT`, `GOOGLon/USDT`), unlocking continuous cross-asset macro correlation trading even during traditional equity market weekend closures.

---

## 2. WHAT MAKES LUNARIS UNIQUE (THE COMPETITIVE EDGE)

| Typical Hackathon Trading Bots | Lunaris Terminal (Bitget Edition) |
| :--- | :--- |
| Single prompt LLM makes buy/sell decisions directly. | **Tri-Agent Quorum Consensus**: Quant, Risk, and Macro agents debate in real time before generating an order proposal. |
| AI hallucinations cause catastrophic account blowups. | **Deterministic Non-LLM Risk Veto**: Guardian-01 enforces hard mathematical collars (max drawdown, leverage limits, slippage collars). The LLM cannot override the risk engine. |
| Disconnected from real exchanges; fake mock static prices. | **Direct Bitget V2 API Pipeline**: Real-time ticker streaming, orderbook depth mapping, and signed HMAC-SHA256 BYOK live trading connectivity. |
| Confined to standard crypto assets. | **Cross-Asset rToken Bridge**: Real-time statistical arbitrage and correlation trading between crypto and tokenized US equities (NVDA, TSLA). |
| Ephemeral local state lost on refresh. | **Enterprise Hybrid Storage**: Cloud synchronization via Firebase Firestore, local disk ledger backup, and client localStorage resilience. |
| Opaque black-box outputs. | **Cryptographic Audit Trail & Daily PnL Calendar**: Every trade logged with entry, exit, trigger rationale, SHA-256 signature, and institutional calendar visualization. |
| Static UI dashboards. | **Institutional Cybernetic UX**: Web Audio API trading floor synthesizer, real-time depth heatmaps, visual drag-and-drop strategy builder, and keyboard-first Cmd+K palette. |

---

## 3. DESIGN SYSTEM & CYBERNETIC VISUAL ARCHITECTURE

The visual identity of Lunaris Terminal was meticulously engineered to evoke the high-density, low-latency ambiance of top-tier proprietary trading firms and hedge funds.

### 3.1 Color Palette & Semantic Significance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LUNARIS COLOR SPECIFICATION                           │
├───────────────────┬─────────────┬───────────────────────────────────────────┤
│ COLOR NAME        │ HEX CODE    │ SEMANTIC PURPOSE / MAPPING                │
├───────────────────┼─────────────┼───────────────────────────────────────────┤
│ Deep Obsidian     │ #080910     │ Primary canvas; eliminates OLED glare     │
│ Dark Void         │ #0B0C14     │ Module backgrounds, cards, table rows     │
│ Bitget Cyan       │ #00F0FF     │ Primary active brand, live feed, focus    │
│ Forest Emerald    │ #10B981     │ Realized profits, longs, council approvals│
│ Emerald Glow      │ #0D281E     │ Positive PnL calendar & depth bid fills   │
│ Crimson Rose      │ #F43F5E     │ Risk vetoes, stop losses, liquidations    │
│ Rose Glow         │ #2A1215     │ Drawdown alerts, ask depth pressure       │
│ Solar Amber       │ #FACC15     │ Pending quorum debates, high volatility   │
│ Cyber Violet      │ #818CF8     │ Agent neural synthesis, Gemini Flash AI   │
│ Slate Gray        │ #94A3B8     │ Muted metadata, timestamps, non-critical  │
└───────────────────┴─────────────┴───────────────────────────────────────────┘
```

### 3.2 Typography & Spacing Hierarchy
- **Primary Technical Font**: `JetBrains Mono` / monospace tabular fonts for prices, ticks, order quantities, execution timestamps, and cryptographic hashes. Tabular numerals prevent jitter during high-frequency price updates.
- **Display Typography**: `Plus Jakarta Sans` and `Inter` for headings and analytical summaries, calibrated at a 1.25 step ratio.
- **Nested Border Radius Rule**: Outer card containers use `rounded-2xl` (16px), inner action elements use `rounded-xl` (12px), and compact badges use `rounded-md` (6px), maintaining strict geometric nesting without visual clipping.

---

## 4. HIGH-LEVEL TECHNICAL ARCHITECTURE

```
                               ┌────────────────────────────────────────┐
                               │           BROWSER CLIENT               │
                               │   React 19 + TypeScript + Vite         │
                               │   Tailwind CSS v4 + Motion + Lucide    │
                               └──────┬───────────────────────┬─────────┘
                                      │                       │
                        WebSocket /   │                       │  Direct Firebase
                        REST Requests │                       │  Web SDK Client
                                      ▼                       ▼
            ┌───────────────────────────────────┐    ┌─────────────────────────────────┐
            │       EXPRESS NODE.JS PROXY       │    │     GOOGLE FIREBASE FIRESTORE   │
            │           (server.ts)             │    │ (ai-studio-lunaristerminal...)  │
            ├───────────────────────────────────┤    ├─────────────────────────────────┤
            │ • Bitget API V2 Reverse Proxy     │    │ • Paper Trade Collection Sync   │
            │ • HMAC-SHA256 V2 Signature Engine │    │ • 7x24 Autonomous Ledger Audit  │
            │ • 7×24 Daemon Background Loop     │    │ • Quota-Resilient Fallback Cache│
            │ • Auditor Disk Backup (JSON)      │    └─────────────────────────────────┘
            │ • Google Gemini GenAI SDK Proxy   │
            └───────┬───────────────────┬───────┘
                    │                   │
                    ▼                   ▼
    ┌────────────────────────┐  ┌──────────────────────────────────┐
    │     BITGET OPEN API    │  │    GOOGLE GEMINI 2.5 FLASH AI    │
    │      (api.bitget.com)  │  │   (Generative Language API)      │
    ├────────────────────────┤  ├──────────────────────────────────┤
    │ • Spot / Futures Feeds │  │ • Multi-Agent Persona Reasoning  │
    │ • Level-2 Orderbooks   │  │ • Macro Sentiment Synthesis      │
    │ • Live Ticker Quotes   │  │ • Automated Trade Rationales     │
    │ • BYOK Order Execution │  └──────────────────────────────────┘
    └────────────────────────┘
```

---

## 5. THE THREE ARCHITECTURAL PILLARS

### 5.1 Pillar I: Multi-Agent Quorum Consensus Engine & NEXUS-RED Adversarial Red Team
Financial markets are non-stationary and adversarial. No single model archetype can successfully navigate trending, range-bound, and high-volatility regimes simultaneously. Lunaris implements an autonomous **Council of 4 Adversarial AI Personas**:

1. **Quant-Omega (Alpha Generator / Momentum Engine)**:
   - Evaluates micro-structure signals, orderbook imbalances (bid/ask ratio > 1.3), short-term momentum (EMA 9/21 cross), and volume surges.
   - Aggressive persona focused on capturing breakout volatility.
2. **Guardian-01 (Risk Officer / Chief Compliance)**:
   - Evaluates volatility regimes, Average True Range (ATR) expansion, portfolio drawdown thresholds, and tail-risk exposure.
   - Defensive persona with non-negotiable veto jurisdiction and Value-at-Risk (VaR) hard limits.
3. **NEXUS-RED (Adversarial Red Team & Chaos Arbiter)**:
   - **Crucial Counter-Intelligence Persona**: Assumes the role of an adversarial market maker, MEV searcher, or predator liquidity pool.
   - **Orderbook Trap & Manipulation Detection**: Interrogates signals for spoofing, artificial bid walls, bull/bear traps, and low-volume fakeouts.
   - **Stress-Testing Execution Feasibility**: Challenges Quant-Omega’s aggressive alpha assumptions, mandating strict slippage collars, limit order enforcement (Bitget IOC/FOK), and dynamic risk mitigation clauses before permitting order commitment.
   - **Post-Mortem Forensics**: Analyzes any stop-loss or drawdown event through an automated retrospective breakdown, identifying root causes, adversarial market dynamics, and writing adaptive policy amendments.
4. **Atlas-Macro (Cross-Asset Strategist)**:
   - Evaluates funding rates, Bitcoin dominance, macroeconomic catalysts, and crypto-to-equities correlations (e.g. S&P 500 correlation with BTC/NVDA).
   - Medium-term regime identifier.
5. **Gemini 2.5 Flash Synthesis**:
   - Acts as the Council Scribe and High Arbiter, synthesizing individual agent rationales into a unified decision output, assigning confidence scores (0–100%), and drafting the formal execution prospectus.

**Consensus Rule**: A trade proposal requires **unanimous or supermajority approval (≥66%)**, must pass **NEXUS-RED Trap & Manipulation Audit**, AND must NOT be vetoed by Guardian-01.

---

### 5.2 Pillar II: Deterministic Risk Veto Engine & Hard Kill Switch
To prevent disastrous LLM hallucination in financial applications, Lunaris places a **Deterministic Risk Engine (`lib/riskVeto.ts`)** downstream of the AI council. The risk engine is pure, non-probabilistic code:

- **Absolute Maximum Leverage**: Hard cap at 5x (configurable down to 2x for equities).
- **Single Trade Allocation Limit**: Maximum 15% of current equity allocated to any single instrument.
- **Drawdown Circuit Breakers**:
  - Daily Loss > 3%: Trading volume throttled by 50%.
  - Daily Loss > 5%: Complete execution freeze for 24 hours.
- **Slippage Collar**: Price execution deviation cannot exceed 0.5% from the live Bitget spot ticker.
- **Deterministic Hard Kill Switch**: One-click instantaneous liquidation of all open paper/live positions with an emergency circuit freeze.

---

### 5.3 Pillar III: 7×24 Autonomous Loop & Verifiable Ledger
Hedge funds do not trade manually; systems run continuously. Lunaris features a background autonomous trading loop:

- **Background Heartbeat**: Executes every 8–15 seconds, scanning asset tickers for momentum, orderbook absorption, and sentiment triggers.
- **Price-Collar Stability**: All simulated price updates are anchored strictly to real Bitget spot quotes, preventing synthetic drift.
- **Cryptographic Trade Verification**: Every trade logs an indelible record with entry, exit, balance change, timestamp, and a SHA-256 hash verifying that transaction records have not been altered.
- **Dual Persistence Architecture**: Real-time writing to Google Firebase Firestore, mirrored directly to the server's local file store (`data/audit_trades.json`) to guarantee 100% data availability even under external network partitions.

---

## 6. COMPREHENSIVE SECTION-BY-SECTION WALKTHROUGH (JUDGE'S GUIDE)

### 6.1 Command Deck (`DECK`)
The **Command Deck** is the flagship executive overview of Lunaris Terminal:
- **Hero Display**: Live animated status displaying active autonomous trading telemetry, real-time portfolio equity, win rate metrics, and the active Bitget Gateway status.
- **Live Ticker Marquee**: Horizontally scrolling ticker strip tracking real-time prices, 24h delta percentages, and volume for BTC, ETH, SOL, SUI, BGB, NVDAon, TSLAon, and AAPLon.
- **Three-Pillar Bento Grid**: Interactive cards detailing Multi-Agent Quorum, Deterministic Risk Guardrails, and Institutional rToken Arbitrage.
- **What Lunaris Does Explainer**: High-level visual architectural breakdown for judges and institutional allocators.
- **6×6 Cross-Asset Correlation & StatArb Matrix (`CrossAssetMatrix`)**:
  - **Crypto ↔ 24/7 rTokens Bridge**: Quantifies rolling 24-hour Pearson correlation coefficients between Bitget spot crypto (`BTC`, `ETH`, `SOL`, `SUI`) and 24/7 tokenized US equities (`NVDAon`, `TSLAon`).
  - **Bitget Cross-Margin Ready**: Highlights statistical arbitrage and pairs trading opportunities with cross-margin leverage.
  - **Interactive 24h Pearson Heatmap**: Real-time cell visualizer color-coded by correlation intensity: Strong (`>0.75`), Moderate (`0.60–0.74`), and Weak (`<0.60`). Traders can click any cell to inspect pairwise dynamics.
  - **Selected Pair Radar**: Displays pair-specific analytics (e.g., `SOL ⇄ NVDAon`), correlation percentage, 24h delta spread %, historical beta multiplier, and live quotes.
  - **Automated StatArb Trade Handoff**: Formulates actionable mean-reversion theses (`LONG_A_SHORT_B`, `LONG_B_SHORT_A`, or `DELTA_NEUTRAL`) with one-click dispatch into the AI Council or Autopilot execution loop.
- **Unified Data Constellation**: Interactive visual node network illustrating data flow between Bitget feeds, AI inference engines, and risk verifiers.
- **Institutional Backtest Engine**: Interactive backtest suite allowing users to simulate multi-agent performance across historical market regimes (Bull Run, Chop Market, Black Swan Crash).

---

### 6.2 Terminal Cockpit (`TERMINAL`)
The **Terminal Cockpit** is the high-density tactical workspace for active monitoring:
- **Real-Time Candlestick Chart**: Interactive charting engine supporting 1m, 5m, 15m, 1h, and 1D timeframes with EMA, Volume, and RSI indicators.
- **Level-2 Orderbook Depth Heatmap**: Dynamic bid/ask visualizer showing buy walls, sell walls, and real-time orderbook delta imbalances directly from Bitget gateways.
- **Tactical Sub-Module Switcher**: Switch between Chart, Autopilot, Council, Pulse, Depth, Stat-Arb, Kill-Switch, and Audit views within a single cohesive viewport.

---

### 6.3 Autonomous Loop (`AUTOPILOT`)
The **Autopilot View** provides real-time oversight of the autonomous trading daemon:
- **Live Capital Metrics**: Real-time balance display, unrealized PnL, daily realized return, and active margin utilization.
- **Active Position Monitor**: Real-time tracking of active long/short positions, entry prices, live mark prices, leverage, and liquidation safety cushions.
- **Execution Log Feed**: Real-time streaming log of automated bot triggers, order fills, and trailing take-profit adjustments.
- **Loop Frequency & Pause Controls**: Fine-tune bot scanning intervals or pause the autonomous cycle with administrative authentication.

---

### 6.4 AI Multi-Agent Council (`COUNCIL`)
The **Council Debate Console** reveals the transparent inner reasoning of the autonomous AI team:
- **Ticker Selector**: Choose any asset (BTC, ETH, SOL, NVDAon, TSLAon, etc.) to trigger an on-demand council deliberation.
- **Adversarial Debates**: Read real-time, interactive debate arguments across 4 distinct agent personas:
  - **Quant-Omega**: Argues aggressive alpha momentum, orderbook absorption, and breakout catalysts.
  - **Guardian-01**: Challenges with volatility collars, stop-loss barriers, and strict Value-at-Risk limits.
  - **NEXUS-RED (Adversarial Red Team & Chaos Arbiter)**: Interrogates orderbook spoofing, flags predatory liquidity traps (e.g. artificial bid walls), and injects risk-mitigation clauses (mandatory IOC execution, tight slippage bounds).
  - **Atlas-Macro**: Correlates institutional OTC flows, macro basis, and cross-asset equities context.
- **NEXUS-RED Adversarial Risk Mitigation Clause**: When consensus is reached, NEXUS-RED appends an explicit counter-trap clause (e.g., *"Orderbook depth verified. Limit order execution enforced to prevent predatory slippage. Max VaR bounded at -10% NAV"*).
- **Gemini Flash Synthesis Card**: Displays the consensus verdict (e.g. `BUY / LONG`, `HOLD`, `VETO`), the collective confidence score (e.g. `87%`), and the synthesized execution rationale.
- **Force Simulation Button**: Allows judges to test how the council reacts to simulated sudden orderbook imbalances or volatility shocks.

---

### 6.5 Social Pulse Radar (`PULSE`)
The **Social Pulse Radar** tracks market psychology and sentiment velocity:
- **Social Velocity Meter (0–100)**: Real-time sentiment index measuring market excitement, fear, and institutional social chatter.
- **Funding Rate Monitor**: Real-time Bitget perpetual funding rates; identifies over-leveraged short squeezes and long liquidation cascades.
- **Whale Inflow & Volume Anomalies**: Highlights abnormal volume spikes exceeding 2.5 standard deviations from the 30-day mean.
- **Send to Council Action**: One-click button to forward any detected sentiment spike directly to the Multi-Agent Council for immediate trade evaluation.

---

### 6.6 Visual Algo Strategy Builder (`ALGO`)
The **Visual Algo Builder** empowers traders to construct algorithmic strategies without writing code:
- **Drag-and-Drop Node Canvas**: Connect Market Conditions (RSI < 30, MACD Bullish Cross, Social Velocity > 80), Risk Filters (Max Drawdown < 2%, Guardian Approval), and Execution Actions (Market Long, Limit Short, Trailing Stop).
- **Preset Library**: Instant templates for *Momentum Breakout*, *Cross-Asset rToken Arbitrage*, and *Conservative Mean Reversion*.
- **Strategy Code Generator**: Automatically compiles the visual block diagram into executable JSON strategy definitions for the Autopilot daemon.

---

### 6.7 Paper Trading Audit & Daily PnL Calendar (`AUDIT`)
The **Paper Trading Audit View** provides mathematical proof of all trade executions:
- **Daily PnL Calendar Grid**:
  - Standard 7-column calendar matrix (`S M T W T F S`) with month navigation (`2026-09`).
  - **Profitable Days**: Displayed as dark emerald cards with day number and compact realized gain (e.g. `+$1.35K`, `+$1.81K`).
  - **Losing Days**: Displayed as deep rose cards with controlled risk drawdowns (e.g. `-$30.99`).
  - **Date Filter Interactivity**: Clicking any calendar date instantly filters the audit table below to display only transactions executed on that specific day.
- **Distribution Bar Chart Toggle**: Alternative view displaying relative daily net profit/loss bars across the zero axis.
- **Monthly Summary Performance Ribbon**: Real-time breakdown of Month Net PnL, Trading Win Rate, Best Day, and Worst Day dynamically aggregated from the verifiable paper trade ledger.
- **Cryptographic Ledger Table**: Comprehensive table with Trade ID, Timestamp, Instrument, Direction, Executed Price, Position Size, Leverage, Net PnL, Cumulative Balance, and Algorithmic Trigger Rationale.
- **Export & Verification Tools**:
  - **Download CSV**: Instant download of the full ledger for external audit in Excel / Python.
  - **Copy JSON**: Copy the entire ledger payload directly to the clipboard.
  - **Verify Proof Modal (`TradeProofModal`)**: Inspect SHA-256 hash verification for any individual trade, review the 4-agent voting breakdown (including NEXUS-RED's dissent/stress-test verdict), and examine the **NEXUS-RED Post-Mortem Forensics Suite** (Root Cause Analysis, Adversarial Flag, Pre-Execution Mitigation, and Dynamic Policy Adjustment).
  - **Cloud Sanitizer**: Reconcile price corridors and sequential balances across Firestore and disk storage.

---

## 7. SPECIALIZED MODALS & DISASTER DRILLS

### 7.1 Bitget V2 API BYOK Modal
- **BYOK (Bring Your Own Key)**: Allows any judge or user to connect their real Bitget API keys (`apiKey`, `apiSecret`, `passphrase`).
- **Zero-Storage Security**: Keys are stored exclusively in client-side encrypted local memory; never logged or transmitted to third-party servers.
- **HMAC-SHA256 Authentication**: Complies strictly with Bitget V2 API specifications, generating Base64 HMAC-SHA256 signatures with millisecond timestamp verification (`ACCESS-KEY`, `ACCESS-SIGN`, `ACCESS-TIMESTAMP`, `ACCESS-PASSPHRASE`).

### 7.2 Black Swan Disaster Drill Modal
Institutional judges can stress-test the risk architecture by simulating catastrophic real-world scenarios:
1. **FTX-Style Liquidity Bank Run**: Simulates sudden -40% market collapse with severe orderbook depth evaporation.
2. **Emergency Fed Rate Hike (+100bps)**: Simulates violent bond yield spikes and cross-asset selloffs.
3. **Flash Crash (-25% in 3 Minutes)**: Simulates cascade liquidation triggers.
4. **Stablecoin De-Pegging Crisis**: Simulates USDT/USDC deviations down to $0.88.
- **Outcome**: The drill demonstrates Guardian-01 instantly executing risk vetoes, closing vulnerable positions, and preserving capital.

### 7.3 Global Command Palette (`Cmd+K` / `Ctrl+K`)
- Accessible from anywhere in the terminal via `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) or via the header search button.
- Rapid fuzzy-search navigation across all 7 core modules.
- Fast execution shortcuts: Toggle Terminal Sound, Launch Black Swan Drill, Trigger Emergency Kill-Switch, and Export Audit CSV.

### 7.4 Web Audio API Synthesizer & Soundscape
- **Custom Parametric Audio Engine (`lib/soundSynth.ts`)**: Built natively using the browser's `AudioContext` without external MP3 dependencies.
- **Trading Floor Ambience**: A low-frequency brown noise and bandpass resonance simulating a live Wall Street / institutional trading floor.
- **Tactile Cybernetic Feedback**: Discrete cyber clicks for button presses, resonant chimes for approved profitable executions, and dual-tone klaxon alerts for Guardian risk vetoes.

### 7.5 Auditor Cloud Sanitizer & Passcode Gate
- **Administrative Passcode Protection**: Secured via administrative passcode authorization (configurable via server environment or customized by the authorized auditor in the in-app security manager).
- **Purpose**: Protects critical ledger operations (Ledger Reset, Cloud Sanitization, and Daemon Pausing) from unauthorized or accidental triggers during live operations.
- **Cloud Sanitizer**: Recalibrates historical price quotes into strict Bitget spot corridors, verifies sequential mathematical continuity from the $100,000.00 baseline, and commits reconciled records to Firestore and server disk storage simultaneously.

---

## 8. DATA MODELS & STATE SYNCHRONIZATION

### Trade Record Schema (`PaperTradeRecord`)
```typescript
interface PaperTradeRecord {
  id: string;              // e.g. "PT-2026-0908-11"
  timestamp: string;       // ISO-8601 UTC timestamp
  instrument: string;      // "BTC/USDT", "NVDAon/USDT", etc.
  direction: 'LONG' | 'SHORT';
  price: number;          // Execution price
  quantity: number;       // Position notional value ($)
  leverage: number;       // Leverage multiplier (1x - 5x)
  balanceChange: number;  // Realized profit or loss in USD
  balanceChangePct: number;// Percentage gain/loss on trade
  accountBalance: number; // Sequential cumulative account equity
  trigger: string;        // Specific AI agent rationale or risk rule
  status: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_CLOSE' | 'LIQUIDATION';
  proofHash?: string;     // SHA-256 cryptographic state signature
}
```

---

## 9. BITGET HACKATHON SCORING RUBRIC ALIGNMENT

| Judging Criteria | Weight | How Lunaris Terminal Excels |
| :--- | :---: | :--- |
| **Technical Innovation & Architecture** | 30% | Tri-Agent Quorum Consensus with Google Gemini Flash AI, coupled with a non-LLM Deterministic Risk Veto Engine that mathematically prevents financial hallucinations. |
| **Bitget Ecosystem Integration** | 25% | Direct integration with Bitget V2 Market & Trading APIs (Level-2 orderbooks, live spot tickers, HMAC-SHA256 signed BYOK trading) and tokenized rToken support. |
| **Execution Quality & Usability** | 20% | Institutional cybernetic UI/UX, responsive sub-millisecond tab switching, Web Audio soundscape, Command Palette (`Cmd+K`), and Daily PnL Calendar heatmap. |
| **Auditability & Risk Safety** | 15% | Transparent ledger tracking, SHA-256 trade state proofs, Daily PnL distribution analytics, and live Black Swan disaster drills. |
| **Commercial Viability & Completeness**| 10% | Fully functional end-to-end full-stack applet with hybrid Firebase Firestore cloud persistence and server disk backups; production-ready for deployment. |

---

## 10. LOCAL DEVELOPMENT & DEPLOYMENT GUIDE

### Prerequisites
- Node.js 18+ or 20+
- npm or bun

### Step 1: Clone and Install Dependencies
```bash
git clone <repository-url>
cd lunaris-terminal
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file based on `.env.example`:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Run the Development Server
```bash
npm run dev
```
The terminal boots with Express + Vite on `http://localhost:3000`.

### Step 4: Production Build
```bash
npm run build
npm start
```

---
*Built with precision for the Bitget AI Base Camp Hackathon Season 2.*  
*Architected by Joezzy (@JoezzyWeb3).*
