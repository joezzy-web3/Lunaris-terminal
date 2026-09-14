# ⚡ LUNARIS TERMINAL (BITGET EDITION)
### Autonomous AI Hedge-Terminal & Cross-Asset Trading Cockpit
**Built for the Bitget AI Base Camp Hackathon (Season 2)**  
**Author / Lead Architect:** Joezzy (@JoezzyWeb3 / `joezzyweb3@gmail.com`)  
**Live Application URL:** [https://ais-pre-gegkhptny4neh265lrerrb-190002869500.europe-west2.run.app](https://ais-pre-gegkhptny4neh265lrerrb-190002869500.europe-west2.run.app)  
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
- **DECK (`CommandDeckHero`)**: Flagship executive overview, live portfolio equity ($111,578.18+), 24h win rate (92.3%), three-pillar bento grid, cross-asset correlation matrix, and backtesting engine.
- **TERMINAL (`RealTimeTradingChart` & `LiquidityDepthHeatmap`)**: High-density trading workstation with multi-timeframe candlestick charts and Bitget Level-2 orderbook depth heatmaps.
- **AUTOPILOT (`AutonomousLoopPanel`)**: 7×24 background trading daemon managing active positions, margin health, and real-time execution streaming.
- **COUNCIL (`DebateConsole`)**: Transparent AI debate chamber where Quant-Omega, Guardian-01, and Atlas-Macro deliberate over trade signals.
- **PULSE (`PulseRadarPanel`)**: Social sentiment velocity index (0–100), funding rate heatmaps, and whale volume anomaly detection.
- **ALGO (`VisualAlgoBuilder`)**: Drag-and-drop block-based trading strategy builder with instant JSON strategy compilation.
- **AUDIT (`PaperTradingAuditView`)**: Verifiable execution ledger, interactive **Daily PnL Calendar**, CSV export, SHA-256 transaction proof viewer, and Auditor Cloud Sanitizer (Passcode: `chllap5803`).

---

## 🛡️ SPECIALIZED FEATURES & TOOLS
- **Bitget BYOK Integration**: Connect real Bitget API keys via secure client-side HMAC-SHA256 V2 authentication.
- **Black Swan Disaster Drills**: Simulate FTX bank runs, Fed 100bps rate shocks, flash crashes, and stablecoin de-pegs to test Guardian-01 veto speed.
- **Command Palette (`Cmd+K` / `Ctrl+K`)**: Rapid keyboard navigation across all modules and emergency controls.
- **Web Audio Sound Engine**: Live trading floor ambient audio with tactile cybernetic execution sounds.

For complete deep-dive documentation, data schemas, color palettes, and scoring rubric alignment, please read **[`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md)**.

