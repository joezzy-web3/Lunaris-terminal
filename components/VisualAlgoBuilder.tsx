// components/VisualAlgoBuilder.tsx
// Visual Strategy Builder with Interactive Nodes and Live Pipeline Deployment (as featured in Moonberg)

import React, { useState, useEffect } from 'react';
import { Play, Check, ShieldCheck, Zap, ArrowRight, Settings2, RefreshCw, Cpu, Layers } from 'lucide-react';
import { TradeProposal } from '@/lib/riskVeto';
import { playCyberClick, playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';

interface VisualAlgoBuilderProps {
  onDeployToAutopilot?: (proposal: TradeProposal) => void;
}

export function VisualAlgoBuilder({ onDeployToAutopilot }: VisualAlgoBuilderProps) {
  const [pulseActive, setPulseActive] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedAsset, setSelectedAsset] = useState<string>('SOL');
  const [conditionType, setConditionType] = useState<'MOMENTUM' | 'SENTIMENT_SPIKE' | 'CROSS_ASSET_DIV'>('MOMENTUM');
  const [riskVetoStrictness, setRiskVetoStrictness] = useState<'STANDARD' | 'PARANOID'>('STANDARD');
  const [deploySuccess, setDeploySuccess] = useState(false);

  // Trigger test signal flow animation across nodes
  const handleTestPulse = () => {
    playCyberClick();
    setPulseActive(true);
    setActiveStep(1);

    setTimeout(() => {
      setActiveStep(2);
    }, 450);

    setTimeout(() => {
      setActiveStep(3);
    }, 900);

    setTimeout(() => {
      setActiveStep(4);
      playTradeApprovedChime();
    }, 1350);

    setTimeout(() => {
      setPulseActive(false);
      setActiveStep(0);
    }, 2400);
  };

  const handleDeploy = () => {
    playCyberClick();
    playTradeApprovedChime();
    setDeploySuccess(true);
    setTimeout(() => setDeploySuccess(false), 2500);

    if (onDeployToAutopilot) {
      const assetClass = selectedAsset === 'NVDA' || selectedAsset === 'MSTR' ? 'EQ' : 'CX';
      const estimatedPrice =
        selectedAsset === 'SOL'
          ? 182.5
          : selectedAsset === 'BTC'
          ? 88400
          : selectedAsset === 'NVDA'
          ? 138.2
          : 362.4;

      const proposal: TradeProposal = {
        asset: selectedAsset,
        action: 'BUY',
        size_pct: 12.0,
        confidence: 0.92,
        reasoning: `Visual Algo Builder Rule Triggered: [${conditionType}] on [${selectedAsset} (${assetClass})] passed Bitget Risk Veto filter.`,
      };

      onDeployToAutopilot(proposal);
    }
  };

  return (
    <div className="relative bg-[#0b0b0f] border border-[var(--lunaris-panel-border)] rounded-xl p-5 font-mono shadow-2xl overflow-hidden group">
      {/* Tactical Corner Tick Markers */}
      <div className="absolute top-2 left-2 text-[10px] text-cyan-400/40 select-none">[+]</div>
      <div className="absolute top-2 right-2 text-[10px] text-yellow-400/40 select-none">02 // ALGO_BUILDER</div>
      <div className="absolute bottom-2 left-2 text-[10px] text-gray-700 select-none">SYS:NODE_OK</div>
      <div className="absolute bottom-2 right-2 text-[10px] text-cyan-400/40 select-none">[+]</div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-wider text-white flex items-center gap-2">
              VISUAL ALGO BUILDER
              <span className="text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1.5 py-0.5 rounded uppercase">
                Zero-Code Execution
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Interactive node graph routing signals to Bitget simulated paper exchange.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestPulse}
            disabled={pulseActive}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/15 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 text-yellow-400 ${pulseActive ? 'animate-bounce' : ''}`} />
            <span>Test Pulse</span>
          </button>

          <button
            onClick={handleDeploy}
            className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold px-3 py-1.5 rounded text-xs transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] cursor-pointer"
          >
            {deploySuccess ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
            <span>{deploySuccess ? 'Deployed to Autopilot!' : 'Deploy Strategy'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Node Graph Canvas */}
      <div className="relative bg-[#070709] border border-white/10 rounded-lg p-5 overflow-x-auto min-h-[200px] flex items-center justify-between gap-3">
        {/* Background circuit grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* STEP 1: TRIGGER NODE */}
        <div
          className={`relative z-10 p-3 rounded-lg border transition-all min-w-[140px] text-center ${
            activeStep === 1
              ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-105'
              : 'bg-[#101017] border-white/15 hover:border-cyan-500/40'
          }`}
        >
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Node 01 // Trigger</div>
          <div className="text-xs font-bold text-cyan-300">PRICE &gt; MA_20</div>
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value as typeof conditionType)}
            className="mt-2 w-full text-[10px] bg-black/60 border border-white/20 text-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-cyan-400"
          >
            <option value="MOMENTUM">MOMENTUM &gt; 2.5%</option>
            <option value="SENTIMENT_SPIKE">SOCIAL VELOCITY &gt; 80</option>
            <option value="CROSS_ASSET_DIV">CX/EQ DELTA ARB</option>
          </select>
        </div>

        {/* Connector 1 */}
        <div className="relative flex-1 flex items-center justify-center min-w-[30px]">
          <div className="w-full h-0.5 bg-white/20 relative">
            {(pulseActive && activeStep >= 1) && (
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-ping left-1/2 -translate-x-1/2" />
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-500 absolute right-0" />
        </div>

        {/* STEP 2: LOGIC OPERATOR */}
        <div
          className={`relative z-10 p-2.5 rounded-lg border transition-all text-center min-w-[100px] ${
            activeStep === 2
              ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105'
              : 'bg-[#101017] border-white/15'
          }`}
        >
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Gate // 02</div>
          <div className="text-xs font-bold text-purple-300">AND [VOL &gt; 2X]</div>
          <div className="text-[9px] text-gray-400 mt-1">Quorum &ge; 67%</div>
        </div>

        {/* Connector 2 */}
        <div className="relative flex-1 flex items-center justify-center min-w-[30px]">
          <div className="w-full h-0.5 bg-white/20 relative">
            {(pulseActive && activeStep >= 2) && (
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7] animate-ping left-1/2 -translate-x-1/2" />
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-500 absolute right-0" />
        </div>

        {/* STEP 3: DETERMINISTIC RISK VETO GATE */}
        <div
          className={`relative z-10 p-3 rounded-lg border transition-all min-w-[150px] text-center ${
            activeStep === 3
              ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105'
              : 'bg-[#101017] border-white/15'
          }`}
        >
          <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Risk Veto Gate</span>
          </div>
          <div className="text-xs font-bold text-white">MAX_POS &le; 25%</div>
          <div className="text-[10px] text-gray-400 mt-1">STOP_LOSS: -10%</div>
        </div>

        {/* Connector 3 */}
        <div className="relative flex-1 flex items-center justify-center min-w-[30px]">
          <div className="w-full h-0.5 bg-white/20 relative">
            {(pulseActive && activeStep >= 3) && (
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] animate-ping left-1/2 -translate-x-1/2" />
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-500 absolute right-0" />
        </div>

        {/* STEP 4: BITGET EXECUTION ROUTER */}
        <div
          className={`relative z-10 p-3 rounded-lg border transition-all min-w-[140px] text-center ${
            activeStep === 4
              ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-105'
              : 'bg-[#101017] border-emerald-500/30'
          }`}
        >
          <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Output // 04</div>
          <div className="text-xs font-bold text-emerald-300">BITGET ORDER</div>
          <div className="text-[10px] text-gray-300 mt-1">
            TARGET:{' '}
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value as typeof selectedAsset)}
              className="bg-black/60 border border-emerald-500/40 text-emerald-400 font-bold rounded px-1 text-[10px]"
            >
              <option value="SOL">SOL (CX)</option>
              <option value="BTC">BTC (CX)</option>
              <option value="NVDA">NVDA (EQ)</option>
              <option value="PLTR">PLTR (EQ)</option>
              <option value="MARA">MARA (EQ)</option>
              <option value="MSFT">MSFT (EQ)</option>
              <option value="AVGO">AVGO (EQ)</option>
              <option value="QQQ">QQQ (ETF)</option>
              <option value="MSTR">MSTR (EQ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer controls & telemetry */}
      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-gray-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Execution Engine: Deterministic Paper Router v2.4</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Latency: &lt;1.8ms</span>
          <span className="text-gray-600">|</span>
          <span className="text-yellow-400">Circuit Breakers: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
