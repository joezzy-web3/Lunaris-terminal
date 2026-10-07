// components/BitgetTelemetryHud.tsx
// Real-time Bitget Institutional Derivatives & Order Flow Telemetry HUD
import React from 'react';
import { BitgetDerivativesTelemetry } from '../lib/bitgetService';

interface BitgetTelemetryHudProps {
  telemetry: BitgetDerivativesTelemetry | null;
  ticker: string;
  compact?: boolean;
}

export const BitgetTelemetryHud: React.FC<BitgetTelemetryHudProps> = ({
  telemetry,
  ticker,
  compact = false,
}) => {
  if (!telemetry) {
    return (
      <div className="w-full bg-[#0a0f1d]/80 border border-cyan-900/40 rounded px-3 py-2 text-xs font-mono text-cyan-400/60 flex items-center justify-between animate-pulse">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          CONNECTING BITGET V2 DERIVATIVES TELEMETRY...
        </span>
        <span className="text-[10px] text-gray-500">{ticker} PERP / SPOT L2</span>
      </div>
    );
  }

  const {
    fundingRate,
    fundingRateBias,
    openInterestUsd,
    basisSpreadLabel,
    orderbookImbalanceLabel,
    orderbookImbalanceRatio,
    spreadPct,
    isLive,
  } = telemetry;

  const biasBadge =
    fundingRateBias === 'LONG_OVERCROWDING' ? (
      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold tracking-wider">
        LONGS PAY SHORTS
      </span>
    ) : fundingRateBias === 'SHORT_SQUEEZE_RISK' ? (
      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold tracking-wider">
        SHORT SQUEEZE FUEL
      </span>
    ) : (
      <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-semibold tracking-wider">
        NEUTRAL FLOW
      </span>
    );

  const ratioPct = Math.min(85, Math.max(15, (orderbookImbalanceRatio / (orderbookImbalanceRatio + 1)) * 100));

  if (compact) {
    return (
      <div className="w-full bg-[#070d18] border border-cyan-500/25 rounded p-2.5 font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between mb-1.5 border-b border-cyan-900/30 pb-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
            <span className="text-cyan-300 font-bold tracking-wider text-[11px]">
              BITGET AGENTIC TELEMETRY [{ticker}]
            </span>
          </div>
          {biasBadge}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div>
            <span className="text-gray-400 text-[10px] block">8h Funding Rate</span>
            <span className="text-cyan-200 font-bold">{fundingRate}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] block">Open Interest (OI)</span>
            <span className="text-cyan-200 font-bold">{openInterestUsd}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] block">L2 Book Flow</span>
            <span className="text-purple-300 font-bold truncate block">{orderbookImbalanceLabel}</span>
          </div>
          <div>
            <span className="text-gray-400 text-[10px] block">Spot/Perp Basis</span>
            <span className="text-emerald-300 font-bold">{basisSpreadLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-[#070e1e] via-[#091428] to-[#070e1e] border border-cyan-500/30 rounded-lg p-3 font-mono shadow-lg relative overflow-hidden mb-4">
      {/* Background Accent Grid */}
      <div className="absolute top-0 right-0 w-32 h-full bg-cyan-500/5 pointer-events-none transform skew-x-12" />

      {/* Header Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
          </span>
          <span className="text-cyan-300 text-xs font-bold tracking-widest uppercase">
            BITGET AGENTIC STACK // LIVE INSTITUTIONAL TELEMETRY
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 text-[10px] text-cyan-300">
            {ticker}USDT PERP
          </span>
          {isLive ? (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              ✓ DIRECT BITGET V2 FEED
            </span>
          ) : (
            <span className="text-[10px] text-cyan-400/80">ALGORITHMIC DERIVATIVES FEED</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {biasBadge}
          <span className="text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded border border-gray-800">
            Top Spread: <strong className="text-gray-200">{spreadPct}</strong>
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: 8h Perpetual Funding */}
        <div className="bg-black/40 border border-cyan-900/30 rounded p-2 hover:border-cyan-500/40 transition">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 flex justify-between">
            <span>8h Perp Funding</span>
            <span className="text-cyan-400 font-bold">RATE</span>
          </div>
          <div className="text-sm font-bold text-cyan-100">{fundingRate}</div>
          <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
            <span>Annualized:</span>
            <span className="text-gray-300 font-mono">
              {(telemetry.fundingRateRaw * 3 * 365 * 100).toFixed(1)}% APR
            </span>
          </div>
        </div>

        {/* Metric 2: Open Interest (OI) */}
        <div className="bg-black/40 border border-cyan-900/30 rounded p-2 hover:border-cyan-500/40 transition">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 flex justify-between">
            <span>Futures Open Interest</span>
            <span className="text-cyan-400 font-bold">OI</span>
          </div>
          <div className="text-sm font-bold text-cyan-100">{openInterestUsd}</div>
          <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
            <span>Contract Size:</span>
            <span className="text-gray-300 font-mono">
              {telemetry.openInterestContracts.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Metric 3: Orderbook Depth Imbalance */}
        <div className="bg-black/40 border border-cyan-900/30 rounded p-2 hover:border-cyan-500/40 transition">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 flex justify-between">
            <span>L2 Depth Imbalance</span>
            <span className="text-purple-400 font-bold">FLOW</span>
          </div>
          <div className="text-xs font-bold text-purple-300 truncate">
            {orderbookImbalanceLabel}
          </div>
          {/* Mini Flow Ratio Bar */}
          <div className="w-full bg-red-950/60 h-1.5 rounded-full mt-2 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${ratioPct}%` }}
              title={`Bid Depth: ${ratioPct.toFixed(0)}% vs Ask Depth: ${(100 - ratioPct).toFixed(0)}%`}
            />
          </div>
        </div>

        {/* Metric 4: Spot vs Perp Basis Spread */}
        <div className="bg-black/40 border border-cyan-900/30 rounded p-2 hover:border-cyan-500/40 transition">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 flex justify-between">
            <span>Spot/Perp Basis</span>
            <span className="text-emerald-400 font-bold">ARB</span>
          </div>
          <div className="text-xs font-bold text-emerald-300 truncate">
            {basisSpreadLabel}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
            <span>Mark / Index:</span>
            <span className="text-gray-300 font-mono">
              ${telemetry.markPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Council Connection Footer */}
      <div className="mt-2.5 pt-2 border-t border-cyan-900/30 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="text-cyan-400 font-bold">COUNCIL PERSONAS SYNCED:</span>
          <span>Quant-Omega (Book Depth) • NEXUS-RED (Funding Squeeze) • Atlas-Macro (Basis Spread)</span>
        </span>
        <span className="text-cyan-500/80 font-mono">
          COLLAR: MAX 0.5% SLIPPAGE
        </span>
      </div>
    </div>
  );
};
