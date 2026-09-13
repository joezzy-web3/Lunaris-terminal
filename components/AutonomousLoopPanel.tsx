// components/AutonomousLoopPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPriceSnapshot, PriceSnapshot, ASSET_REGISTRY } from '@/lib/liveTokenFeed';
import { getSeededPrice, SEEDED_ASSETS } from '@/lib/demoSeedData';
import { evaluateTradeRisk, TradeProposal } from '@/lib/riskVeto';
import { recordNewPaperTrade } from '@/lib/paperTradingAudit';
import { Play, Square, Zap, ShieldAlert, RotateCcw, ArrowUpRight, ArrowDownRight, RefreshCw, Target, ShieldCheck, Lock, Sliders, BookOpen, Activity } from 'lucide-react';
import { playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';
import { AutopilotResetPasscodeModal } from '@/components/AutopilotResetPasscodeModal';
import { AutopilotLedgerView, AutopilotLedgerEntry } from '@/components/AutopilotLedgerView';
import { useAutopilot } from '@/context/AutopilotContext';

export interface AutonomousLog {
  id: string;
  timestamp: string;
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  sizePct: number;
  text: string;
  status: 'APPROVED' | 'VETOED';
  overrideCode?: string;
  source: 'AUTONOMOUS' | 'COUNCIL_SIGNAL';
}

export interface BuyExecutionResult {
  success: boolean;
  reason?: string;
  ticker: string;
  units?: number;
  price?: number;
  tradeUsd?: number;
  sizePct?: number;
}

export interface SellExecutionResult {
  success: boolean;
  reason?: string;
  ticker: string;
  units?: number;
  price?: number;
  proceeds?: number;
  pnl?: number;
  pnlPct?: number;
}

export interface Position {
  ticker: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  class: 'CX' | 'EQ';
}

interface AutonomousLoopPanelProps {
  key?: React.Key;
  externalProposal?: TradeProposal | null;
  onClearExternalProposal?: () => void;
  demoShockActive?: boolean;
}

const INITIAL_POSITIONS: Record<string, Position> = {};
const INITIAL_CASH = 100000;
const AUTOPILOT_PERSISTENCE_KEY = 'LUNARIS_AUTOPILOT_PERSISTED_STATE_V2';

function loadPersistedAutopilotState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTOPILOT_PERSISTENCE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse persisted autopilot state:', err);
  }
  return null;
}

export function AutonomousLoopPanel({
  externalProposal,
  onClearExternalProposal,
  demoShockActive,
}: AutonomousLoopPanelProps) {
  const {
    isExecuting,
    setIsExecuting,
    toggleExecuting,
    isTurbo,
    setIsTurbo,
    logs,
    setLogs,
    portfolio,
    positions,
    setPositions,
    cashBalance,
    setCashBalance,
    ledger,
    setLedger,
    autoExitPct,
    setAutoExitPct,
    maxOpenPositions,
    setMaxOpenPositions,
    circuitBreakerAlert,
    lastSyncTime,
    calculateTotalValue,
    handleManualTrade,
    handleCashoutAllPositions,
    handleConfirmPasscodeReset,
    handleIncomingCouncilSignal,
    dispatchProposal,
    executeSimulatedBuy,
    executeSimulatedSell,
    monitoredTickers,
  } = useAutopilot();

  const [subTab, setSubTab] = useState<'COCKPIT' | 'LEDGER'>('COCKPIT');
  const [isResetPasscodeModalOpen, setIsResetPasscodeModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'VETOED'>('ALL');

  useEffect(() => {
    if (externalProposal) {
      handleIncomingCouncilSignal(externalProposal);
      onClearExternalProposal?.();
    }
  }, [externalProposal, handleIncomingCouncilSignal, onClearExternalProposal]);

  const handleResetPortfolio = () => {
    setIsResetPasscodeModalOpen(true);
  };

  // Filtered logs
  const filteredLogs = logs.filter((l) => {
    if (filter === 'APPROVED') return l.status === 'APPROVED';
    if (filter === 'VETOED') return l.status === 'VETOED';
    return true;
  });

  // Calculate guaranteed safe metrics for UI display
  const totalPortfolioValue = calculateTotalValue(positions, cashBalance);
  const positionList: Position[] = (Object.values(positions) as Position[]).filter(
    (p: Position) => Boolean(p && Number.isFinite(p.amount) && p.amount > 0 && Number.isFinite(p.currentPrice) && p.currentPrice > 0)
  );
  const totalUnrealizedPnl = positionList.reduce((acc, p) => {
    const pnl = Number(p.unrealizedPnl);
    return acc + (Number.isFinite(pnl) ? pnl : 0);
  }, 0);

  const safePortfolioValue = Number.isFinite(totalPortfolioValue) && totalPortfolioValue > 0 ? totalPortfolioValue : INITIAL_CASH;
  const safeCashBalance = Number.isFinite(cashBalance) && cashBalance >= 0 ? cashBalance : 0;
  const safeUnrealizedPnl = Number.isFinite(totalUnrealizedPnl) ? totalUnrealizedPnl : 0;

  // Baseline initial capital for calculating percentage increase ($100,000 baseline)
  const BASELINE_CAPITAL = INITIAL_CASH;

  // Net Portfolio Value percentage increase / change
  const netValueChange = safePortfolioValue - BASELINE_CAPITAL;
  const netValuePctIncrease = BASELINE_CAPITAL > 0 ? (netValueChange / BASELINE_CAPITAL) * 100 : 0;

  // Available Cash percentage change relative to baseline ($100,000)
  const cashChange = safeCashBalance - BASELINE_CAPITAL;
  const cashPctIncrease = BASELINE_CAPITAL > 0 ? (cashChange / BASELINE_CAPITAL) * 100 : 0;

  // Active positions cost for unrealized PnL percentage
  const totalPositionCost = positionList.reduce((acc, p) => {
    const amt = Number(p.amount) || 0;
    const entry = Number(p.entryPrice) || 0;
    return acc + amt * entry;
  }, 0);
  const unrealizedPnlPct = totalPositionCost > 0 ? (safeUnrealizedPnl / totalPositionCost) * 100 : 0;

  return (
    <div className="bg-[var(--lunaris-panel-bg)] border border-[var(--lunaris-panel-border)] rounded-lg p-4 font-mono shadow-xl relative overflow-hidden">
      {/* Circuit Breaker HUD Toast */}
      {circuitBreakerAlert && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-amber-500/20 border border-amber-500 text-amber-300 text-xs px-3 py-1.5 rounded-md flex items-center gap-2 shadow-lg backdrop-blur-md animate-bounce">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="font-bold">RISK-VETO TRIGGERED:</span>
          <span>{circuitBreakerAlert}</span>
        </div>
      )}

      {/* Module Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isExecuting ? 'bg-[var(--lunaris-accent-cyan)] animate-pulse' : 'bg-gray-600'
              }`}
            />
            {isExecuting && (
              <span className="absolute w-4 h-4 rounded-full bg-[var(--lunaris-accent-cyan)] opacity-40 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-white">LUNARIS AUTOPILOT</h2>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                Core Loop Tier 1
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Deterministic Autonomous Trade Inference & Risk Safeguard</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Cockpit vs Ledger */}
          <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setSubTab('COCKPIT')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                subTab === 'COCKPIT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>COCKPIT</span>
            </button>
            <button
              onClick={() => setSubTab('LEDGER')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                subTab === 'LEDGER'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>LEDGER</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-200 font-mono">
                {ledger.length}
              </span>
            </button>
          </div>

          {/* Manual Full Cashout */}
          <button
            onClick={handleCashoutAllPositions}
            disabled={positionList.length === 0}
            title="Immediately cash out all open positions into Available Cash"
            className="px-2.5 py-1 text-xs border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 rounded flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed font-bold"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>CASHOUT ALL</span>
          </button>

          {/* Reset Portfolio */}
          <button
            onClick={handleResetPortfolio}
            title="Reset Portfolio to initial $100,000 baseline cash reserve (Requires Administrative Passcode Verification)"
            className="p-1.5 text-xs border border-white/15 hover:border-amber-400/50 text-gray-400 hover:text-amber-300 rounded flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => setIsTurbo(!isTurbo)}
            title="Switch execution frequency between Standard (7s) and Turbo (2s)"
            className={`px-2.5 py-1 text-xs border rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              isTurbo
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'border-white/15 text-gray-400 hover:text-white hover:border-white/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTurbo ? 'TURBO 2s' : 'NORMAL 7s'}</span>
          </button>

          {/* Autopilot Master Switch */}
          <button
            onClick={toggleExecuting}
            className={`px-3.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isExecuting
                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {isExecuting ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isExecuting ? 'HALT AUTOPILOT' : 'ENGAGE AUTOPILOT'}</span>
          </button>
        </div>
      </div>

      {/* Conditionally Render Ledger View or Cockpit View */}
      {subTab === 'LEDGER' ? (
        <AutopilotLedgerView
          ledger={ledger}
          cashBalance={cashBalance}
          onResetPortfolio={handleResetPortfolio}
          onManualTrade={handleManualTrade}
          isAutopilotActive={isExecuting}
          onToggleAutopilot={toggleExecuting}
        />
      ) : (
        <>
          {/* Autopilot Risk & Portfolio Controls: Auto-Exit Target + Max Open Positions Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {/* Control 1: Take-Profit Auto-Exit Target (% Gain) */}
            <div className="bg-gradient-to-r from-purple-950/40 via-black/60 to-cyan-950/40 border border-purple-500/30 rounded-lg p-3 text-xs shadow-inner flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Take-Profit Auto-Exit
                    </span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-2 py-0.5 rounded border border-purple-400/30">
                      +{autoExitPct}% Profit Target
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Armed
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">-6% SL</span>
                  </div>
                </div>

                {/* Quick Multiplier Buttons + Range Slider */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {[1.5, 2, 3, 5, 8, 12, 20].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setAutoExitPct(pct)}
                        className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          autoExitPct === pct
                            ? 'bg-purple-500 text-black shadow-[0_0_10px_rgba(168,85,247,0.5)] font-black'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                        }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 flex items-center gap-2 min-w-[120px]">
                    <span className="text-[10px] text-gray-500">1%</span>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      step="0.5"
                      value={autoExitPct}
                      onChange={(e) => setAutoExitPct(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-purple-400 font-bold">25%</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 mt-1">
                Open positions auto-cash-out when gain is <span className="text-purple-300 font-bold">&ge; +{autoExitPct}%</span>. Full proceeds directly credit to your <span className="text-emerald-300 font-bold">Available Cash Reserve</span>.
              </p>
            </div>

            {/* Control 2: Max Open Positions (Pure Spot / Long Model Capacity) */}
            <div className="bg-gradient-to-r from-cyan-950/40 via-black/60 to-purple-950/40 border border-cyan-500/30 rounded-lg p-3 text-xs shadow-inner flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Max Open Positions
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                        positionList.length >= maxOpenPositions
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                      }`}
                    >
                      {positionList.length} / {maxOpenPositions} Slots Active
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" /> Pure Spot
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">Max 5 Cap</span>
                  </div>
                </div>

                {/* Slots Selector Buttons 1, 2, 3, 4, 5 */}
                <div className="flex items-center gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5].map((count) => {
                    const isSelected = maxOpenPositions === count;
                    const isAtOrOver = positionList.length >= count;
                    return (
                      <button
                        key={count}
                        onClick={() => setMaxOpenPositions(count)}
                        title={`Limit concurrent holdings to ${count} open position${count > 1 ? 's' : ''}`}
                        className={`flex-1 py-1.5 rounded text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(34,211,238,0.5)] border border-cyan-300'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                        }`}
                      >
                        <span>{count}</span>
                        <span className="text-[9px] font-normal opacity-75">{count === 1 ? 'pos' : 'pos'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[10px] text-gray-400 mt-1">
                Pure spot/long engine locks concurrent exposure to <span className="text-cyan-300 font-bold">{maxOpenPositions} positions</span>. When filled, incoming BUYs are transparently <span className="text-amber-300 font-bold">VETOED</span> until a slot is freed.
              </p>
            </div>
          </div>

      {/* Portfolio Telemetry Bar - Always Safe Real-Time Values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-black/50 p-2.5 rounded border border-white/5 text-xs">
        {/* Portfolio Net Value */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-between">
            <span>Portfolio Net Value</span>
            {isExecuting ? (
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            ) : (
              <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                <Lock className="w-2.5 h-2.5" /> PNL FROZEN
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-white tracking-wide">
              ${safePortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-[11px] font-extrabold flex items-center gap-0.5 px-1.5 py-0.5 rounded shadow-sm ${
                netValuePctIncrease > 0.001
                  ? 'text-[var(--lunaris-profit)] bg-emerald-500/15 border border-emerald-500/30'
                  : netValuePctIncrease < -0.001
                  ? 'text-[var(--lunaris-loss)] bg-red-500/15 border border-red-500/30'
                  : 'text-gray-400 bg-white/5 border border-white/10'
              }`}
            >
              {netValuePctIncrease > 0.001 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              ) : netValuePctIncrease < -0.001 ? (
                <ArrowDownRight className="w-3 h-3 text-red-400" />
              ) : null}
              {netValuePctIncrease > 0.001 ? '+' : ''}
              {netValuePctIncrease.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5 flex items-center justify-between">
            <span>{isExecuting ? 'Active live market' : 'Locked on last trade'}</span>
            <span className={netValueChange >= 0 ? 'text-emerald-400/90 font-semibold' : 'text-red-400/90 font-semibold'}>
              {netValueChange >= 0 ? '+' : ''}${netValueChange.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Available Cash */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-between">
            <span>Available Cash</span>
            <span className="text-[9px] text-emerald-400/80 font-mono">Reserve</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-semibold text-gray-200">
              ${safeCashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`text-[11px] font-extrabold flex items-center gap-0.5 px-1.5 py-0.5 rounded shadow-sm ${
                cashPctIncrease > 0.001
                  ? 'text-[var(--lunaris-profit)] bg-emerald-500/15 border border-emerald-500/30'
                  : cashPctIncrease < -0.001
                  ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30'
                  : 'text-gray-400 bg-white/5 border border-white/10'
              }`}
            >
              {cashPctIncrease > 0.001 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              ) : cashPctIncrease < -0.001 ? (
                <ArrowDownRight className="w-3 h-3 text-cyan-400" />
              ) : null}
              {cashPctIncrease > 0.001 ? '+' : ''}
              {cashPctIncrease.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-gray-400 mt-0.5 flex items-center justify-between">
            <span>
              {cashPctIncrease > 0.001
                ? 'Realized profit credited'
                : cashPctIncrease < -0.001
                ? 'Active trade deployment'
                : '$100k Baseline Cash'}
            </span>
            <span className={cashChange >= 0 ? 'text-emerald-400/90 font-semibold' : 'text-cyan-400/90 font-semibold'}>
              {cashChange >= 0 ? '+' : ''}${cashChange.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Unrealized PnL */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase flex items-center justify-between">
            <span>Unrealized PnL</span>
            <span className="text-[9px] text-purple-300 font-bold">Exit: +{autoExitPct}%</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
            <span
              className={`text-sm font-bold flex items-center gap-0.5 ${
                safeUnrealizedPnl >= 0 ? 'text-[var(--lunaris-profit)]' : 'text-[var(--lunaris-loss)]'
              }`}
            >
              {safeUnrealizedPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {safeUnrealizedPnl >= 0 ? '+' : ''}${safeUnrealizedPnl.toFixed(2)}
            </span>
            <span
              className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded shadow-sm ${
                safeUnrealizedPnl > 0.001
                  ? 'text-[var(--lunaris-profit)] bg-emerald-500/15 border border-emerald-500/30'
                  : safeUnrealizedPnl < -0.001
                  ? 'text-[var(--lunaris-loss)] bg-red-500/15 border border-red-500/30'
                  : 'text-gray-400 bg-white/5 border border-white/10'
              }`}
            >
              {unrealizedPnlPct > 0.001 ? '+' : ''}
              {unrealizedPnlPct.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">
            {isExecuting ? 'Autopilot monitoring' : 'Stopped on last trade'}
          </div>
        </div>

        {/* Liquidation Shield */}
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Liquidation Shield</div>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            0% LIQUIDATION RISK
          </div>
          <div className="text-[9px] text-gray-400 mt-1">
            Auto-Cut @ -6% | Zero Margin Call
          </div>
        </div>
      </div>

      {/* Grid Display: Real-time Holdings vs System Decision Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Active Positions & Monitored Tickers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Active Portfolio Positions</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  positionList.length >= maxOpenPositions
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {positionList.length} / {maxOpenPositions} Slots
              </span>
            </h3>
            <span className="text-[10px] text-gray-500">Live Tick: {lastSyncTime}</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {positionList.length === 0 ? (
              <div className="text-xs text-gray-500 p-3 bg-black/30 rounded text-center border border-dashed border-white/10">
                No active positions. Autopilot or Council signals will populate simulated trades.
              </div>
            ) : (
              positionList.map((pos) => {
                const isProfitable = (pos.unrealizedPnl || 0) >= 0;
                const safeAmt = Number(pos.amount) || 0;
                const safePrice = Number(pos.currentPrice) || 0;
                const safeEntry = Number(pos.entryPrice) || 0;
                const safePnl = Number(pos.unrealizedPnl) || 0;
                const safePnlPct = Number(pos.unrealizedPnlPct) || 0;
                const totalPosVal = safeAmt * safePrice;

                return (
                  <div
                    key={pos.ticker}
                    className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5 hover:border-white/15 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          pos.class === 'CX'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                        }`}
                      >
                        {pos.class}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {pos.ticker}
                          <span className="text-[10px] font-normal text-gray-400">
                            ({safeAmt.toFixed(pos.class === 'CX' ? 3 : 1)} units)
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                          <span>Entry: ${safeEntry.toFixed(2)} → Now: ${safePrice.toFixed(2)}</span>
                          <span className="text-purple-300/90 font-mono bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20">
                            Auto-Exit: +{autoExitPct}% (${(safeEntry * (1 + autoExitPct / 100)).toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-white font-medium text-xs sm:text-sm">
                          ${totalPosVal.toFixed(2)}
                        </div>
                        <div
                          className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${
                            isProfitable ? 'text-[var(--lunaris-profit)]' : 'text-[var(--lunaris-loss)]'
                          }`}
                        >
                          {isProfitable ? '+' : ''}
                          ${safePnl.toFixed(2)} ({isProfitable ? '+' : ''}
                          {safePnlPct.toFixed(2)}%)
                        </div>
                      </div>

                      {/* Explicit Manual TP Button (Adds principal + profit directly to available cash) */}
                      <button
                        onClick={() => {
                          executeSimulatedSell(pos.ticker, pos.currentPrice);
                          playTradeApprovedChime();
                          setLogs((prev) => [
                            {
                              id: `manual-tp-${Date.now()}-${pos.ticker}`,
                              timestamp: new Date().toLocaleTimeString(),
                              ticker: pos.ticker,
                              action: 'SELL',
                              sizePct: 100,
                              text: `[MANUAL TAKE PROFIT] Closed ${pos.ticker} at $${safePrice.toFixed(2)} (${isProfitable ? '+' : ''}${safePnlPct.toFixed(2)}%). Full proceeds of $${totalPosVal.toFixed(2)} credited into available cash reserve.`,
                              status: 'APPROVED',
                              source: 'AUTONOMOUS',
                            },
                            ...prev.slice(0, 59),
                          ]);
                        }}
                        title={`Take Profit / Close ${pos.ticker} and credit proceeds to available cash`}
                        className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-black transition-all flex items-center gap-1 shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                      >
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        <span>TP / CASH OUT</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Market Feed Radar - Realtime Bitget Spot & Equities Feed */}
          <div className="pt-2 border-t border-white/10">
            <div className="text-[11px] text-gray-400 mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Market Feed Radar (Bitget Spot Realtime)
              </span>
              <span className="text-[10px] text-gray-500 font-mono">15% delta safeguard check</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {monitoredTickers.map((t) => {
                const snap = portfolio[t];
                const price = snap && Number.isFinite(snap.price) && snap.price > 0 ? snap.price : (SEEDED_ASSETS[t]?.basePrice || 100);
                const chg = snap?.change24h || 0;
                const isPositive = chg >= 0;

                return (
                  <div key={t} className="bg-black/40 p-2 rounded border border-white/5 text-[11px] hover:border-white/15 transition-all">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                      <span className="font-bold text-white">{t}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                        BITGET
                      </span>
                    </div>
                    <div className="font-bold text-gray-100 text-xs">
                      ${price.toLocaleString('en-US', { minimumFractionDigits: price > 100 ? 2 : 3, maximumFractionDigits: price > 100 ? 2 : 3 })}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{chg.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Real-time Execution Stream */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>System Decision Stream</span>
              <span className="text-[10px] px-1 rounded bg-white/10 text-gray-300">{filteredLogs.length}</span>
            </h3>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1 text-[10px]">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-1.5 py-0.5 rounded ${filter === 'ALL' ? 'bg-white/20 text-white font-bold' : 'text-gray-400'}`}
              >
                ALL
              </button>
              <button
                onClick={() => setFilter('APPROVED')}
                className={`px-1.5 py-0.5 rounded ${
                  filter === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400'
                }`}
              >
                APPROVED
              </button>
              <button
                onClick={() => setFilter('VETOED')}
                className={`px-1.5 py-0.5 rounded ${
                  filter === 'VETOED' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-gray-400'
                }`}
              >
                VETOED
              </button>
            </div>
          </div>

          <div className="h-64 overflow-y-auto space-y-1.5 pr-1 text-[11px] bg-black/60 p-2.5 rounded border border-white/5 font-mono">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No events match current filter.</div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded border transition-colors ${
                    log.status === 'VETOED'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : log.source === 'COUNCIL_SIGNAL'
                      ? 'bg-purple-950/20 border-purple-500/30'
                      : 'bg-black/40 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-500">{log.timestamp}</span>
                      {log.source === 'COUNCIL_SIGNAL' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold">
                          COUNCIL HANDOFF
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-bold ${
                        log.status === 'VETOED' ? 'text-[var(--lunaris-warn)]' : 'text-emerald-400'
                      }`}
                    >
                      [{log.status}]
                    </span>
                  </div>
                  <div className="text-gray-300 leading-tight break-words">{log.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )}

      {/* Passcode Verification Modal for Resetting Autopilot Portfolio */}
      <AutopilotResetPasscodeModal
        isOpen={isResetPasscodeModalOpen}
        onClose={() => setIsResetPasscodeModalOpen(false)}
        onConfirmReset={handleConfirmPasscodeReset}
      />
    </div>
  );
}

