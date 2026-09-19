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
1. **Multi-Agent Quorum Consensus**: Four specialized agents (**Quant-Omega**, **Guardian-01**, **NEXUS-RED**, **Atlas-Macro**) debate real-time market microstructure, liquidity traps, and macroeconomic catalysts, synthesized by **Google Gemini 2.5 Flash AI**.
2. **Deterministic Risk Veto Engine**: A non-LLM mathematical risk engine enforcing leverage caps, max drawdowns, and automated circuit breakers that cannot be hallucinated away.
3. **Institutional Fee & Slippage Execution Engine**: Enforces Bitget's published VIP-0 taker fee schedule (0.06% crypto / 0.10% rTokens) plus dynamic Level-2 orderbook slippage modeling ($Net = Gross - Fee - Slippage$).
4. **7×24 Autonomous Loop & Immutable Ledger**: Real-time paper execution streaming, SHA-256 state proof hashing, interactive **Daily PnL Calendar Heatmap**, and strictly append-only persistence across **Google Firebase Firestore** and server disk storage.

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
- **COUNCIL (`DebateConsole`)**: Transparent AI debate chamber where four specialized agents (**Quant-Omega**, **Guardian-01**, **NEXUS-RED**, **Atlas-Macro**) deliberate over trade signals synthesized by Gemini 2.5 Flash.
- **PULSE (`PulseRadarPanel`)**: Social sentiment velocity index (0–100), funding rate heatmaps, and whale volume anomaly detection.
- **ALGO (`VisualAlgoBuilder`)**: Drag-and-drop block-based trading strategy builder with instant JSON strategy compilation.
- **MATRIX (`CrossAssetMatrix`)**: 6×6 Real-time Pearson correlation & statistical arbitrage matrix bridging Bitget spot crypto (`BTC`, `ETH`, `SOL`, `SUI`) with 24/7 tokenized US equities (`NVDAon`, `TSLAon`). Features interactive pairwise correlation radar, historical beta multiplier, 24h delta spread analysis, and one-click StatArb execution dispatch.
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
**No. This separation is standard institutional accounting practice and mathematically proves that our ledger enforces active anti-cheating and deterministic risk validation.**

```
┌───────────────────────────────────────┐
│   Raw Ingestion Events (~4,267)       │  <- Generated by daemon loop pulses & worker ticks
└──────────────────┬────────────────────┘
                   │
                   ▼  reconcileTradeCollection()
┌───────────────────────────────────────┐
│  - Filtered / Rejected Ticks (~698)   │  <- Non-conforming risk spikes & duplicate submissions
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│  = Canonical Verified Sequence (#3569)│  <- Consecutive, gapless immutable ledger chain (#1 .. #N)
└───────────────────────────────────────┘
```

| Metric | Identifier | Role & Guarantee |
| :--- | :--- | :--- |
| **Transaction ID** | `PT-20260918-4267` | **Global Event Counter:** Assigned immediately when an execution attempt is emitted by background daemon loops, test harness pulses, or multi-tab workers. Format: `PT-[YYYYMMDD]-[SERIAL]`. |
| **Canonical Sequence** | `#3569` (`auditSeq`) | **Verified Ledger Row:** Assigned **strictly after** the trade passes deterministic risk bounds (`ASSET_PRICE_CORRIDORS`), timestamp verification, and deduplication. Forms a gapless, consecutive sequence (`#1, #2, ... #3569`). |

### Why this Proves System Integrity
- **Real-World Parallel:** Just as Bitcoin's current Block Height (`#890,000`) does not match the total cumulative count of all mempool transaction hashes, or a company's general ledger row index differs from external bank wire reference numbers, LUNARIS maintains an audited separation between **raw event telemetry** and **canonical verified state**.
- **Anti-Cheating Assurance:** If an app were fabricating static or fake trades, every row would simply receive an unvalidated increment with zero sanity filtering. The delta (~698 rejected ticks) represents our reconciliation engine actively filtering out test anomalies and duplicate submissions before they can pollute the portfolio record.
- **In-App Inspection:** Judges can click the yellow **`#Seq`** tag on any trade or click the **`[?] Why #Seq vs PT-ID?`** button directly next to *Pause Auto-Loop* in the Audit Log to inspect the cryptographic verification proof.

---

For complete deep-dive documentation, data schemas, color palettes, and scoring rubric alignment, please read **[`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md)**.

