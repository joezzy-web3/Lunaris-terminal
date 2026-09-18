# ⚡ LUNARIS TERMINAL (BITGET EDITION)
### Autonomous AI Hedge-Terminal & Cross-Asset Trading Cockpit
**Built for the Bitget AI Base Camp Hackathon (Season 2)**  
**Author / Lead Architect:** Joezzy (@JoezzyWeb3 / `joezzyweb3@gmail.com`)  
**Live Application URL:** [https://lunaristerminal.vercel.app/](https://lunaristerminal.vercel.app/)  
**Full Technical Documentation:** See [`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md) for the complete, exhaustive judging guide and architecture specification.

---

## 🌟 OVERVIEW
**Lunaris Terminal** is an institutional-grade, cross-asset AI trading terminal that bridges cryptocurrency markets (`BTC`, `ETH`, `SOL`, `SUI`, `BGB`) with 24/7 tokenized US equities (`NVDAon`, `TSLAon`, `AAPLon`, `GOOGLon` rTokens).

It features a **Three-Pillar Fail-Safe Architecture**:
1. **Multi-Agent Quorum Consensus**: Three adversarial AI agents (**Quant-Omega**, **Guardian-01**, **Atlas-Macro**) debate real-time market structure, synthesized by **Google Gemini 2.5 Flash AI**.
2. **Deterministic Risk Veto Engine**: A non-LLM mathematical risk engine enforcing leverage caps, max drawdowns, and automated circuit breakers that cannot be hallucinated away.
3. **7×24 Autonomous Loop & Verifiable Ledger**: Real-time paper execution streaming, SHA-256 state proof hashing, interactive **Daily PnL Calendar Heatmap**, and multi-tier persistence across **Google Firebase Firestore** and server disk storage.

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
- **DECK (`CommandDeckHero`)**: Flagship executive overview, live portfolio telemetry, three-pillar fail-safe architecture, 6×6 cross-asset correlation matrix, and quantitative backtesting engine.
- **TERMINAL (`RealTimeTradingChart` & `LiquidityDepthHeatmap`)**: High-density trading workstation with multi-timeframe candlestick charts and Bitget Level-2 orderbook depth heatmaps.
- **AUTOPILOT (`AutonomousLoopPanel`)**: Dual-mode execution engine. Runs autonomously as a background trading daemon when engaged with dynamic take-profit targets, trailing stops, and margin health monitoring, while also supporting direct manual trader orders and discretionary intervention anytime.
- **COUNCIL (`DebateConsole`)**: Transparent AI debate chamber where Quant-Omega, Guardian-01, and Atlas-Macro deliberate over trade signals synthesized by Gemini 2.5 Flash.
- **PULSE (`PulseRadarPanel`)**: Social sentiment velocity index (0–100), funding rate heatmaps, and whale volume anomaly detection.
- **ALGO (`VisualAlgoBuilder`)**: Drag-and-drop block-based trading strategy builder with instant JSON strategy compilation.
- **MATRIX (`CrossAssetMatrix`)**: 6×6 Real-time Pearson correlation & statistical arbitrage matrix bridging Bitget spot crypto (`BTC`, `ETH`, `SOL`, `SUI`) with 24/7 tokenized US equities (`NVDAon`, `TSLAon`). Features interactive pairwise correlation radar, historical beta multiplier, 24h delta spread analysis, and one-click StatArb execution dispatch.
- **AUDIT (`PaperTradingAuditView`)**: Verifiable execution ledger, interactive **Daily PnL Calendar**, CSV export, SHA-256 transaction proof viewer, and Auditor Cloud Sanitizer with administrative passcode protection.

---

## 🛡️ SPECIALIZED FEATURES & TOOLS
- **Bitget BYOK Integration**: Connect real Bitget API keys via secure client-side HMAC-SHA256 V2 authentication.
- **Black Swan Disaster Drills**: Simulate FTX bank runs, Fed 100bps rate shocks, flash crashes, and stablecoin de-pegs to test Guardian-01 veto speed.
- **Command Palette (`Cmd+K` / `Ctrl+K`)**: Rapid keyboard navigation across all modules and emergency controls.
- **Web Audio Sound Engine**: Live trading floor ambient audio with tactile cybernetic execution sounds.

For complete deep-dive documentation, data schemas, color palettes, and scoring rubric alignment, please read **[`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md)**.

