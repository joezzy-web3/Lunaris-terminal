// components/DemoModeController.tsx
import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, Sliders, Play, RotateCcw, Zap, Sparkles, Check, Info } from 'lucide-react';
import { MAX_POSITION_PCT, DRAWDOWN_LIMIT_PCT, TradeProposal } from '@/lib/riskVeto';
import { setAssetShock, clearAssetShocks } from '@/lib/demoSeedData';

interface DemoModeControllerProps {
  onTriggerDirectProposal: (proposal: TradeProposal) => void;
  onResetBalances: () => void;
}

export function DemoModeController({
  onTriggerDirectProposal,
  onResetBalances,
}: DemoModeControllerProps) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const triggerOverAllocationScenario = () => {
    setActiveScenario('OVER_ALLOCATION');
    const proposal: TradeProposal = {
      asset: 'NVDA',
      action: 'BUY',
      size_pct: 30, // 30% > 25% max limit
      confidence: 0.88,
      reasoning: 'Aggressive momentum signal generated post tokenized stock volume surge.',
    };
    onTriggerDirectProposal(proposal);
    setFeedback('Dispatched 30% NVDA proposal -> Risk Veto [MAX_POSITION] override expected!');
    setTimeout(() => {
      setFeedback(null);
      setActiveScenario(null);
    }, 4000);
  };

  const triggerStopLossScenario = () => {
    setActiveScenario('STOP_LOSS');
    // Apply a -12% shock to SOL to engage the -10% circuit breaker
    setAssetShock('SOL', 0.88);
    const proposal: TradeProposal = {
      asset: 'SOL',
      action: 'BUY',
      size_pct: 15,
      confidence: 0.92,
      reasoning: 'Re-entry attempt during localized liquidity contraction.',
    };
    onTriggerDirectProposal(proposal);
    setFeedback('Injected -12% shock on SOL -> Risk Veto [STOP_LOSS] circuit breaker expected!');
    setTimeout(() => {
      clearAssetShocks();
      setFeedback(null);
      setActiveScenario(null);
    }, 5000);
  };

  const triggerApprovedTrade = () => {
    setActiveScenario('APPROVED');
    const proposal: TradeProposal = {
      asset: 'BTC',
      action: 'BUY',
      size_pct: 12,
      confidence: 0.89,
      reasoning: 'Standard SMA5/SMA20 cross with Bitget positive funding rate. Fully compliant with bounds.',
    };
    onTriggerDirectProposal(proposal);
    setFeedback('Dispatched 12% BTC proposal -> Risk Veto [APPROVED] verified!');
    setTimeout(() => {
      setFeedback(null);
      setActiveScenario(null);
    }, 4000);
  };

  return (
    <div className="bg-[var(--lunaris-panel-bg)] border border-[var(--lunaris-panel-border)] rounded-lg p-4 font-mono shadow-xl text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <h2 className="text-sm font-bold tracking-wider text-white">DEMO MODE & RISK TELEMETRY</h2>
          <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            Tier 1 Engine Sandbox
          </span>
        </div>
        <div className="text-[11px] text-gray-400 flex items-center gap-3">
          <span>Max Trade: <b className="text-white">{MAX_POSITION_PCT}%</b></span>
          <span>Stop-Loss Limit: <b className="text-amber-400">-{DRAWDOWN_LIMIT_PCT}%</b></span>
          <span>Delta Safeguard: <b className="text-cyan-400">15%</b></span>
        </div>
      </div>

      {feedback && (
        <div className="mb-3 p-2 rounded bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Scenario Trigger Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={triggerOverAllocationScenario}
          className={`p-2.5 rounded border text-left transition-all ${
            activeScenario === 'OVER_ALLOCATION'
              ? 'bg-amber-950/50 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'bg-black/40 border-white/10 text-gray-300 hover:border-amber-500/50'
          }`}
        >
          <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
            <AlertOctagon className="w-3.5 h-3.5" /> Test Size Veto (30%)
          </div>
          <div className="text-[10px] text-gray-400 leading-tight">
            Dispatches proposal exceeding 25% max position limit. Triggers MAX_POSITION override.
          </div>
        </button>

        <button
          onClick={triggerStopLossScenario}
          className={`p-2.5 rounded border text-left transition-all ${
            activeScenario === 'STOP_LOSS'
              ? 'bg-red-950/50 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
              : 'bg-black/40 border-white/10 text-gray-300 hover:border-red-500/50'
          }`}
        >
          <div className="font-bold text-red-400 flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Test Stop-Loss (-12%)
          </div>
          <div className="text-[10px] text-gray-400 leading-tight">
            Simulates drawdowns exceeding -10% threshold. Triggers STOP_LOSS circuit breaker.
          </div>
        </button>

        <button
          onClick={triggerApprovedTrade}
          className={`p-2.5 rounded border text-left transition-all ${
            activeScenario === 'APPROVED'
              ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
              : 'bg-black/40 border-white/10 text-gray-300 hover:border-emerald-500/50'
          }`}
        >
          <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5" /> Test Approved Trade
          </div>
          <div className="text-[10px] text-gray-400 leading-tight">
            Dispatches compliant 12% BTC allocation with high confidence. Passes all risk gates.
          </div>
        </button>

        <button
          onClick={onResetBalances}
          className="p-2.5 rounded border bg-black/40 border-white/10 text-gray-300 hover:border-white/30 text-left transition-all"
        >
          <div className="font-bold text-gray-200 flex items-center gap-1.5 mb-1">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Paper Account
          </div>
          <div className="text-[10px] text-gray-400 leading-tight">
            Restores initial $100,000 USDT test capital, clears active shocks, and flushes cache.
          </div>
        </button>
      </div>
    </div>
  );
}
