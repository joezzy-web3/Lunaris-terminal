# ⚡ LUNARIS TERMINAL (BITGET EDITION)
### Autonomous AI Hedge-Terminal & Cross-Asset Trading Cockpit
**Built for the Bitget AI Base Camp Hackathon (Season 2)**  
**Author / Lead Architect:** Joezzy (@JoezzyWeb3 / `joezzyweb3@gmail.com`)  
**Live Application URL:** [https://lunaristerminal.vercel.app/](https://lunaristerminal.vercel.app/)  
**Full Technical Documentation:** See [`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md) for the complete, exhaustive judging guide and architecture specification.

---

## 🌟 OVERVIEW
**Lunaris Terminal** is an institutional-grade, cross-asset AI trading terminal that bridges cryptocurrency markets (`BTC`, `ETH`, `SOL`, `SUI`, `BGB`) with 24/7 tokenized US equities (`NVDAon`, `TSLAon`, `AAPLon`, `GOOGLon` rTokens).

It features a **Four-Pillar Fail-Safe Architecture**:
1. **Multi-Agent Quorum Consensus**: Three specialized AI agents (**Quant-Omega**, **NEXUS-RED**, **Atlas-Macro**) debate real-time market microstructure, liquidity traps, and macroeconomic catalysts, synthesized by **Google Gemini 2.5 Flash AI**.
2. **Deterministic Risk Veto Engine (Guardian-01)**: **Guardian-01 is explicitly NOT an AI or LLM agent.** It is an independent, non-probabilistic, rule-based mathematical risk engine executing downstream of the AI council. Guardian-01 enforces hard mathematical collars (5x max leverage, 15% single-asset allocation, 3%/5% daily drawdown circuit breakers, and 0.5% slippage collars) that cannot be hallucinated away, argued down, or overridden by any LLM.
3. **Institutional Fee & Slippage Execution Engine**: Enforces Bitget's published VIP-0 taker fee schedule (0.06% crypto / 0.10% rTokens) plus dynamic Level-2 orderbook slippage modeling ($Net = Gross - Fee - Slippage$).
4. **7×24 Autonomous Loop & Immutable Ledger**: Real-time paper execution streaming, SHA-256 state proof hashing, interactive **Daily PnL Calendar Heatmap**, and strictly append-only persistence across **Cloudflare D1 Edge SQL Database** and server disk storage.

---

## 🚀 QUICK START
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (.env)
# GEMINI_API_KEY=your_key_here

# 3. Start development server (Port 3000)
npm run dev
```

---

## 🧭 MODULE OVERVIEW FOR JUDGES
- **DECK (`CommandDeckHero`)**: Flagship executive overview, live portfolio telemetry, four-pillar fail-safe architecture, 6×6 cross-asset correlation matrix, and quantitative backtesting engine.
- **TERMINAL (`RealTimeTradingChart` & `LiquidityDepthHeatmap`)**: High-density trading workstation with multi-timeframe candlestick charts and Bitget Level-2 orderbook depth heatmaps.
- **AUTOPILOT (`AutonomousLoopPanel`)**: Dual-mode execution engine. Runs autonomously as a background trading daemon when engaged with dynamic take-profit targets, trailing stops, and margin health monitoring, while also supporting direct manual trader orders and discretionary intervention anytime.
- **COUNCIL (`DebateConsole`)**: Transparent AI debate chamber where three specialized AI agents (**Quant-Omega**, **NEXUS-RED**, **Atlas-Macro**) deliberate over trade signals synthesized by Gemini 2.5 Flash, subject to non-negotiable compliance checks by **Guardian-01** (Deterministic Risk Engine).
- **PULSE (`PulseRadarPanel`)**: Social sentiment velocity index (0–100), funding rate heatmaps, and whale volume anomaly detection.
- **ALGO (`VisualAlgoBuilder`)**: Drag-and-drop block-based trading strategy builder with instant JSON strategy compilation.
- **MATRIX (`CrossAssetMatrix`)**: 6×6 Real-time Pearson correlation & statistical arbitrage matrix bridging Bitget spot crypto (`BTC`, `ETH`, `SOL`, `SUI`) with 24/7 tokenized US equities (`NVDAon`, `TSLAon`). Features interactive pairwise correlation radar, historical beta multiplier, 24h delta spread analysis, and one-click StatArb execution dispatch.
- **STREAM (`AgentActivityStream`)**: Real-time supervisory telemetry and heuristic event stream. Surfaces sub-second agent reasoning, orderbook wall scans, and high-conviction advisories with instant, two-way Natural Language Mandate handoffs to Council Quorum or Autopilot.
- **AUDIT (`PaperTradingAuditView`)**: Strictly append-only verifiable execution ledger, interactive **Daily PnL Calendar**, CSV export, SHA-256 transaction proof viewer, Bitget fee and L2 slippage audit breakdown, and canonical sequence verification.

---

## 💎 REALISTIC FEE & SLIPPAGE MODEL (BITGET PUBLISHED STANDARD)

To guarantee institutional rigor and eliminate unrealistic paper trading returns, Lunaris implements full fee and market-impact modeling calibrated directly to Bitget's published fee schedule:

1. **Bitget Published Taker Fee Tier**:
   - **Crypto / Futures (`BTC`, `ETH`, `SOL`, `SUI`, `BGB`)**: **0.06% (6 bps)** flat taker fee applied against gross trade notional.
   - **Tokenized Equities & rTokens (`NVDAon`, `TSLAon`, `AAPLon`, `GOOGLon`, etc.)**: **0.10% (10 bps)** spot taker fee reflecting real-world tokenized equity market maker spreads.
2. **Dynamic L2 Orderbook Slippage Model**:
   - Simulated dynamic slippage derived from order size and level-2 book depth.
   - Base slippage begins at **2.0 bps (0.02%)** for liquid pairs and dynamically scales with trade notional up to **18.0 bps** for larger block orders or volatile market regimes.
3. **Net Realized PnL Calculation**:
   $$\text{Net Realized PnL} = \text{Gross PnL} - \text{Taker Fee} - \text{Estimated L2 Slippage}$$
4. **Activation Date & Historical Record Transition (Effective: September 19, 2026)**:
   - **Pre-September 19, 2026 (Genesis Calibration Period)**: Early bootstrap trades reflect the baseline gross execution model, which was used during initial protocol development to isolate raw alpha signals and verify cross-asset data feeds without synthetic assumptions.
   - **Post-September 19, 2026 (Institutional Standard Upgrade)**: On **September 19, 2026**, the execution engine was upgraded to enforce Bitget's published VIP-0 taker fee schedule (0.06% crypto / 0.10% rTokens) plus dynamic Level-2 orderbook slippage modeling across all live and autonomous trades. This upgrade ensures that our performance metrics strictly reflect real-world market friction, bid-ask spread crossing, and exchange liquidity drag rather than theoretical paper returns.
   - **Ledger Immutability**: In strict accordance with our append-only accounting policy, historical records remain intact and are never retroactively altered or sanitized. All active trades from September 19, 2026 forward carry full cryptographic fee and slippage breakdown receipts in the Audit Log and CSV exports.

---

## 🛡️ SPECIALIZED FEATURES & TOOLS
- **Bitget BYOK Integration**: Connect real Bitget API keys via secure client-side HMAC-SHA256 V2 authentication.
- **Black Swan Disaster Drills**: Simulate FTX bank runs, Fed 100bps rate shocks, flash crashes, and stablecoin de-pegs to test Guardian-01 veto speed.
- **Command Palette (`Cmd+K` / `Ctrl+K`)**: Rapid keyboard navigation across all modules and emergency controls.
- **Web Audio Sound Engine**: Live trading floor ambient audio with tactile cybernetic execution sounds.

---

## 🔍 AUDIT TRANSPARENCY: CANONICAL SEQUENCE (`#SEQ`) VS. TRANSACTION ID (`PT-ID`)

Evaluators, hackathon judges, and quantitative auditors inspecting the **AUDIT LOG** will notice two distinct identifiers attached to each trade:
1. **The Global Transaction ID** (e.g., `PT-20260918-4267`)
2. **The Yellow Canonical Sequence Tag** (e.g., `#3569`)

### Why are these numbers different? Is there a clash?
**No. This separation is standard institutional exchange accounting practice: separating the Wire Ingress Gateway from the Authoritative Settled Clearinghouse Ledger.**

```
┌────────────────────────────────────────────────────────┐
│   Raw Ingestion Events (~4,267 Wire Pulses)            │  <- Generated by background loops, worker ticks & test pulses
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼  Pre-Trade Ingestion Boundary & Anomaly Filter
┌────────────────────────────────────────────────────────┐
│  - Forensic Quarantine Archive (465 Quarantined Ticks) │  <- Test harness artifacts & out-of-corridor spikes
│    (Isolated from Trading Ledger — Inspect & Download) │     (Preserved for forensic review with raw hashes)
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  = Canonical Settled Ledger Sequence (#3569 Rows)      │  <- Consecutive, gapless immutable ledger chain (#1 .. #N)
└────────────────────────────────────────────────────────┘
```

| Metric | Identifier | Role & Guarantee |
| :--- | :--- | :--- |
| **Transaction ID** | `PT-20260918-4267` | **Global Wire Event Counter:** Assigned immediately when an execution attempt is emitted by background daemon loops, test harness pulses, or multi-tab workers. Format: `PT-[YYYYMMDD]-[SERIAL]`. Acts as an uncommitted ingress drop-copy. |
| **Canonical Sequence** | `#3569` (`auditSeq`) | **Authoritative Settled Ledger Row:** Assigned **strictly after** the trade passes deterministic risk bounds (`ASSET_PRICE_CORRIDORS`), timestamp verification, and deduplication. Forms a gapless, consecutive sequence (`#1, #2, ... #3569`). |

### Institutional Architecture & Transparency Guarantees
- **Exchange FIX Gateway Analogy:** Similar to how institutional exchange matching engines receive thousands of raw wire orders, but only credit-checked, risk-cleared executions commit to clearinghouse settlement, Lunaris maintains a strict separation between raw event telemetry and the settled ledger.
- **Automated Daily Self-Audit & Non-Destructive Quarantine (Activated September 25, 2026):** To eliminate the operational risk, subjectivity, and potential bias of manual log reconciliation, Lunaris Terminal activated an automated daily self-audit daemon on **September 25, 2026**. Under strict financial compliance standards, raw ledger records are **never deleted or retroactively edited**. Instead, the daemon verifies all 5 core mathematical invariants ($Net = Gross - Fee - Slippage$ with $\le 0.5\%$ collar enforcement) and segregates any anomalous ticks or test harness pulses into `/data/quarantine/` with cryptographic timestamps and an explicit `quarantineReason` tag.
- **Rejected Trades Archive (Zero Data Loss):** Quarantined events are never silently purged or injected back into trading history. Judges can click the red **`Rejected Trades`** button directly in the Audit View to inspect each rejected record, verify its rejection reason and SHA-256 hash, or download the raw data as `.JSON` or `.CSV`.
- **Operator Passcode Scope:** The administrative passcode protects the **Operator Control Plane** (preventing public web visitors from pausing the 24/7 background execution daemon or triggering system resets). It cannot rewrite, edit, or delete historical trades. The verified ledger is strictly append-only.
- **In-App Inspection:** Judges can click the yellow **`#Seq`** tag on any trade or click the **`[?] Why #Seq vs PT-ID?`** button directly next to *Pause Auto-Loop* in the Audit Log to inspect the cryptographic verification proof.

---

For complete deep-dive documentation, data schemas, color palettes, and scoring rubric alignment, please read **[`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md)**.

