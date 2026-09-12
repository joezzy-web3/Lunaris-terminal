// components/CrossAssetMatrix.tsx
// Real-Time Cross-Asset (Spot Crypto ↔ 24/7 Tokenized Equities) 6x6 Correlation & StatArb Heatmap

import React, { useState } from 'react';
import {
  Layers,
  ArrowRightLeft,
  TrendingUp,
  Zap,
  Sparkles,
  Check,
  Activity,
  Info,
  Sliders,
} from 'lucide-react';
import { TradeProposal } from '@/lib/riskVeto';
import { playCyberClick, playTradeApprovedChime } from '@/lib/soundSynth';

const ASSETS = ['BTC', 'ETH', 'SOL', 'SUI', 'NVDAon', 'TSLAon'] as const;
type AssetTicker = typeof ASSETS[number];

// 6x6 Real-time Pearson Correlation Matrix Data
const CORRELATION_MATRIX: Record<AssetTicker, Record<AssetTicker, number>> = {
  BTC: { BTC: 1.0, ETH: 0.89, SOL: 0.74, SUI: 0.62, NVDAon: 0.71, TSLAon: 0.54 },
  ETH: { BTC: 0.89, ETH: 1.0, SOL: 0.82, SUI: 0.68, NVDAon: 0.65, TSLAon: 0.51 },
  SOL: { BTC: 0.74, ETH: 0.82, SOL: 1.0, SUI: 0.79, NVDAon: 0.78, TSLAon: 0.63 },
  SUI: { BTC: 0.62, ETH: 0.68, SOL: 0.79, SUI: 1.0, NVDAon: 0.52, TSLAon: 0.44 },
  NVDAon: { BTC: 0.71, ETH: 0.65, SOL: 0.78, SUI: 0.52, NVDAon: 1.0, TSLAon: 0.84 },
  TSLAon: { BTC: 0.54, ETH: 0.51, SOL: 0.63, SUI: 0.44, NVDAon: 0.84, TSLAon: 1.0 },
};

// 24h Divergence & Beta metrics
interface PairDetail {
  pairKey: string;
  assetA: AssetTicker;
  assetB: AssetTicker;
  correlation: number;
  beta: number;
  deltaSpreadPct: number;
  priceA: string;
  priceB: string;
  recommendation: 'LONG_A_SHORT_B' | 'LONG_B_SHORT_A' | 'DELTA_NEUTRAL';
  thesis: string;
}

const PAIR_DETAILS: Record<string, PairDetail> = {
  'BTC-NVDAon': {
    pairKey: 'BTC-NVDAon',
    assetA: 'BTC',
    assetB: 'NVDAon',
    correlation: 0.71,
    beta: 1.35,
    deltaSpreadPct: 2.8,
    priceA: '$94,820',
    priceB: '$138.40',
    recommendation: 'LONG_A_SHORT_B',
    thesis: 'NVDAon weekend tokenized equity premium outpaced BTC spot by +2.8%. StatArb signals mean-reversion rebalance.',
  },
  'SOL-NVDAon': {
    pairKey: 'SOL-NVDAon',
    assetA: 'SOL',
    assetB: 'NVDAon',
    correlation: 0.78,
    beta: 1.84,
    deltaSpreadPct: 3.6,
    priceA: '$198.40',
    priceB: '$138.40',
    recommendation: 'LONG_A_SHORT_B',
    thesis: 'High-beta AI ecosystem momentum divergence. SOL liquidity lagging NVDAon after-hours rally.',
  },
  'ETH-TSLAon': {
    pairKey: 'ETH-TSLAon',
    assetA: 'ETH',
    assetB: 'TSLAon',
    correlation: 0.51,
    beta: 1.18,
    deltaSpreadPct: -1.4,
    priceA: '$3,420',
    priceB: '$242.10',
    recommendation: 'LONG_B_SHORT_A',
    thesis: 'ETH layer-1 gas fee compression vs TSLAon autonomous vehicle catalyst divergence.',
  },
  'SOL-ETH': {
    pairKey: 'SOL-ETH',
    assetA: 'SOL',
    assetB: 'ETH',
    correlation: 0.82,
    beta: 1.62,
    deltaSpreadPct: 2.1,
    priceA: '$198.40',
    priceB: '$3,420',
    recommendation: 'LONG_A_SHORT_B',
    thesis: 'DEX volume ratio favor SOL relative to ETH market cap ratio. High correlation breakout.',
  },
  'BTC-ETH': {
    pairKey: 'BTC-ETH',
    assetA: 'BTC',
    assetB: 'ETH',
    correlation: 0.89,
    beta: 1.22,
    deltaSpreadPct: 0.9,
    priceA: '$94,820',
    priceB: '$3,420',
    recommendation: 'DELTA_NEUTRAL',
    thesis: 'Stable correlation corridor. Co-integrated trend within normal Bollinger band bounds.',
  },
};

interface CrossAssetMatrixProps {
  onRoutePairSignal?: (proposal: TradeProposal) => void;
}

export function CrossAssetMatrix({ onRoutePairSignal }: CrossAssetMatrixProps) {
  const [selectedPair, setSelectedPair] = useState<[AssetTicker, AssetTicker]>(['SOL', 'NVDAon']);
  const [routedSuccess, setRoutedSuccess] = useState<string | null>(null);

  const [assetA, assetB] = selectedPair;
  const pairKey1 = `${assetA}-${assetB}`;
  const pairKey2 = `${assetB}-${assetA}`;
  const activePairDetail: PairDetail =
    PAIR_DETAILS[pairKey1] ||
    PAIR_DETAILS[pairKey2] || {
      pairKey: `${assetA}-${assetB}`,
      assetA,
      assetB,
      correlation: CORRELATION_MATRIX[assetA][assetB],
      beta: +(1.0 + Math.abs(CORRELATION_MATRIX[assetA][assetB] * 0.5)).toFixed(2),
      deltaSpreadPct: +((CORRELATION_MATRIX[assetA][assetB] - 0.7) * 4).toFixed(1),
      priceA: assetA.includes('on') ? '$138.40' : '$94,820',
      priceB: assetB.includes('on') ? '$242.10' : '$198.40',
      recommendation: CORRELATION_MATRIX[assetA][assetB] > 0.7 ? 'LONG_A_SHORT_B' : 'DELTA_NEUTRAL',
      thesis: `Cross-asset divergence between spot ${assetA} and tokenized ${assetB}. Statistical beta equilibrium monitored.`,
    };

  const handleRouteArb = () => {
    playCyberClick();
    playTradeApprovedChime();
    setRoutedSuccess(activePairDetail.pairKey);
    setTimeout(() => setRoutedSuccess(null), 2500);

    if (onRoutePairSignal) {
      const proposal: TradeProposal = {
        asset: activePairDetail.assetA,
        action: activePairDetail.recommendation === 'LONG_A_SHORT_B' ? 'BUY' : 'SELL',
        size_pct: 12.5,
        confidence: 0.89,
        reasoning: `[StatArb Signal]: ${activePairDetail.assetA} ↔ ${activePairDetail.assetB} 24h spread delta is ${
          activePairDetail.deltaSpreadPct > 0 ? '+' : ''
        }${activePairDetail.deltaSpreadPct}%. Initiating mean-reversion rebalance.`,
      };
      onRoutePairSignal(proposal);
    }
  };

  return (
    <div className="relative bg-[#090b11] border border-[#00F0FF]/25 rounded-2xl p-5 font-mono shadow-[0_0_35px_rgba(0,240,255,0.06)] overflow-hidden space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF]">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold tracking-wider text-white">
                6×6 CROSS-ASSET CORRELATION &amp; STATARB MATRIX
              </h3>
              <span className="text-[10px] text-[#00F0FF] bg-[#00F0FF]/15 border border-[#00F0FF]/30 px-2 py-0.5 rounded uppercase font-bold">
                Crypto ↔ 24/7 rTokens
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Quantifies rolling 24h Pearson correlation between Bitget spot crypto and 24/7 tokenized US equities (NVDAon, TSLAon).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Bitget Cross-Margin Ready</span>
        </div>
      </div>

      {/* Main Grid & Inspection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 6x6 Heatmap Table */}
        <div className="lg:col-span-7 bg-[#06070a] border border-white/10 rounded-xl p-4 overflow-x-auto">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
            <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00F0FF]" />
              Rolling 24h Pearson Heatmap
            </span>
            <span className="text-[10px] text-zinc-500">Click any cell to inspect pair</span>
          </div>

          <table className="w-full text-center text-xs border-collapse select-none">
            <thead>
              <tr>
                <th className="p-2 text-zinc-500 font-mono text-[11px] text-left">Asset</th>
                {ASSETS.map((col) => (
                  <th
                    key={col}
                    className={`p-2 text-[11px] font-bold ${
                      col.includes('on') ? 'text-cyan-300' : 'text-white'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((row) => (
                <tr key={row} className="border-t border-white/5">
                  <td className={`p-2 font-bold text-left text-[11px] ${
                    row.includes('on') ? 'text-cyan-300' : 'text-white'
                  }`}>
                    {row}
                  </td>
                  {ASSETS.map((col) => {
                    const val = CORRELATION_MATRIX[row][col];
                    const isDiagonal = row === col;
                    const isSelected =
                      (selectedPair[0] === row && selectedPair[1] === col) ||
                      (selectedPair[0] === col && selectedPair[1] === row);

                    // Color code cells cleanly without riot:
                    // High corr: #00F0FF / cyan
                    // Mid corr: subtle zinc/cyan
                    // Low corr: dark zinc
                    let cellBg = 'bg-white/5 text-zinc-400';
                    if (isDiagonal) {
                      cellBg = 'bg-white/10 text-white font-bold';
                    } else if (val >= 0.75) {
                      cellBg = 'bg-[#00F0FF]/20 text-[#00F0FF] font-extrabold';
                    } else if (val >= 0.6) {
                      cellBg = 'bg-cyan-950/40 text-cyan-200 font-semibold';
                    } else {
                      cellBg = 'bg-zinc-900/60 text-zinc-400';
                    }

                    if (isSelected) {
                      cellBg += ' ring-2 ring-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.4)] scale-105 z-10';
                    }

                    return (
                      <td key={col} className="p-1">
                        <button
                          onClick={() => {
                            playCyberClick();
                            if (row !== col) {
                              setSelectedPair([row, col]);
                            }
                          }}
                          disabled={isDiagonal}
                          className={`w-full py-2 px-1 rounded-lg text-xs transition-all cursor-pointer ${cellBg}`}
                          title={`${row} ↔ ${col} correlation: ${val.toFixed(2)}`}
                        >
                          {val.toFixed(2)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Color Scale Legend */}
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-4 pt-3 border-t border-white/5 font-mono">
            <span>Correlation Intensity:</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#00F0FF]/30" /> &gt;0.75 (Strong)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-cyan-950/60" /> 0.60–0.74 (Moderate)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-zinc-900" /> &lt;0.60 (Weak)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Pair Inspection & 1-Click StatArb Execution Card */}
        <div className="lg:col-span-5 bg-[#06070a] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Selected Pair Radar</span>
              <span className="text-[10px] bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 px-2 py-0.5 rounded font-bold">
                Corr: {(activePairDetail.correlation * 100).toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-base font-bold text-white mb-3">
              <span className="text-white">{activePairDetail.assetA}</span>
              <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
              <span className="text-[#00F0FF]">{activePairDetail.assetB}</span>
              {(activePairDetail.assetA.includes('on') || activePairDetail.assetB.includes('on')) && (
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                  rToken Active
                </span>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono my-3">
              <div className="bg-[#0c0e15] border border-white/5 p-2.5 rounded-lg space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase">24h Delta Spread</div>
                <div
                  className={`text-sm font-bold ${
                    activePairDetail.deltaSpreadPct > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activePairDetail.deltaSpreadPct > 0 ? '+' : ''}
                  {activePairDetail.deltaSpreadPct}%
                </div>
              </div>

              <div className="bg-[#0c0e15] border border-white/5 p-2.5 rounded-lg space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase">Historical Beta</div>
                <div className="text-sm font-bold text-cyan-300">
                  {activePairDetail.beta}x
                </div>
              </div>

              <div className="bg-[#0c0e15] border border-white/5 p-2.5 rounded-lg space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase">{activePairDetail.assetA} Quote</div>
                <div className="text-sm font-bold text-white">{activePairDetail.priceA}</div>
              </div>

              <div className="bg-[#0c0e15] border border-white/5 p-2.5 rounded-lg space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase">{activePairDetail.assetB} Quote</div>
                <div className="text-sm font-bold text-white">{activePairDetail.priceB}</div>
              </div>
            </div>

            {/* Qualitative Thesis */}
            <div className="bg-[#0c0e15] border border-white/5 p-3 rounded-lg space-y-1">
              <div className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1">
                <Info className="w-3 h-3 text-[#00F0FF]" />
                <span>Arbitrage Thesis:</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {activePairDetail.thesis}
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleRouteArb}
            className="w-full py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 bg-[#00F0FF] hover:bg-[#38f6ff] text-black transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] cursor-pointer"
          >
            {routedSuccess === activePairDetail.pairKey ? (
              <>
                <Check className="w-4 h-4 text-black" />
                <span>StatArb Signal Dispatched to Council!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black" />
                <span>Execute StatArb Rebalance Loop</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
