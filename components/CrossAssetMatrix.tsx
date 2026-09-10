// components/CrossAssetMatrix.tsx
// Real-Time Cross-Asset (Crypto ↔ Tokenized Equities) Correlation & Delta Matrix

import React, { useState } from 'react';
import { Layers, ArrowRightLeft, TrendingUp, Zap, Sparkles, Check } from 'lucide-react';
import { TradeProposal } from '@/lib/riskVeto';
import { playCyberClick, playTradeApprovedChime } from '@/lib/soundSynth';

interface CrossAssetPair {
  id: string;
  cryptoTicker: string;
  equityTicker: string;
  cryptoPrice: string;
  equityPrice: string;
  correlation: number;
  beta: number;
  deltaSpreadPct: number;
  actionRecommendation: 'LONG_EQ_SHORT_CX' | 'LONG_CX_SHORT_EQ' | 'DELTA_NEUTRAL';
}

const PAIRS: CrossAssetPair[] = [
  {
    id: 'p-1',
    cryptoTicker: 'BTC',
    equityTicker: 'MSTR',
    cryptoPrice: '$87,450',
    equityPrice: '$362.50',
    correlation: 0.91,
    beta: 1.84,
    deltaSpreadPct: 2.4,
    actionRecommendation: 'LONG_CX_SHORT_EQ',
  },
  {
    id: 'p-2',
    cryptoTicker: 'ETH',
    equityTicker: 'COIN',
    cryptoPrice: '$2,740',
    equityPrice: '$215.80',
    correlation: 0.83,
    beta: 1.42,
    deltaSpreadPct: -1.2,
    actionRecommendation: 'LONG_EQ_SHORT_CX',
  },
  {
    id: 'p-3',
    cryptoTicker: 'SOL',
    equityTicker: 'NVDA',
    cryptoPrice: '$182.40',
    equityPrice: '$138.20',
    correlation: 0.77,
    beta: 1.95,
    deltaSpreadPct: 3.8,
    actionRecommendation: 'LONG_CX_SHORT_EQ',
  },
];

interface CrossAssetMatrixProps {
  onRoutePairSignal?: (proposal: TradeProposal) => void;
}

export function CrossAssetMatrix({ onRoutePairSignal }: CrossAssetMatrixProps) {
  const [activePairId, setActivePairId] = useState<string>('p-1');
  const [routedSuccess, setRoutedSuccess] = useState<string | null>(null);

  const handleRouteArb = (pair: CrossAssetPair) => {
    playCyberClick();
    playTradeApprovedChime();
    setRoutedSuccess(pair.id);
    setTimeout(() => setRoutedSuccess(null), 2000);

    if (onRoutePairSignal) {
      const proposal: TradeProposal = {
        asset: pair.cryptoTicker,
        action: 'BUY',
        size_pct: 15.0,
        confidence: 0.88,
        reasoning: `Cross-Asset StatArb Opportunity: [${pair.cryptoTicker} (CX) ↔ ${pair.equityTicker} (EQ)] Spread Delta is ${pair.deltaSpreadPct > 0 ? '+' : ''}${pair.deltaSpreadPct}%. Initiating mean-reversion rebalance.`,
      };
      onRoutePairSignal(proposal);
    }
  };

  return (
    <div className="relative bg-[#0b0b0f] border border-[var(--lunaris-panel-border)] rounded-xl p-5 font-mono shadow-2xl overflow-hidden">
      {/* Reticle Marks */}
      <div className="absolute top-2 left-2 text-[10px] text-cyan-400/40 select-none">[+]</div>
      <div className="absolute top-2 right-2 text-[10px] text-pink-400/40 select-none">CX/EQ // STAT_ARB</div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-pink-500/10 border border-pink-500/30 text-pink-400">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-wider text-white flex items-center gap-2">
              CROSS-ASSET STATISTICAL ARBITRAGE MATRIX
              <span className="text-[10px] text-pink-400 bg-pink-500/10 border border-pink-500/30 px-1.5 py-0.5 rounded uppercase">
                Beta &amp; Delta Radar
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Correlating institutional tokenized equities with spot crypto liquidity streams.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Bitget Cross-Margin Ready</span>
        </div>
      </div>

      {/* Pairs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PAIRS.map((pair) => {
          const isSelected = activePairId === pair.id;
          const isSuccess = routedSuccess === pair.id;

          return (
            <div
              key={pair.id}
              onClick={() => setActivePairId(pair.id)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-[#12121a] border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : 'bg-[#070709] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-300">{pair.cryptoTicker} (CX)</span>
                  <span className="text-gray-500">↔</span>
                  <span className="text-pink-400">{pair.equityTicker} (EQ)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                  Corr: {(pair.correlation * 100).toFixed(0)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 my-2">
                <div>
                  <span className="text-gray-500 block text-[9px]">CX Price:</span>
                  <span className="text-white font-semibold">{pair.cryptoPrice}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">EQ Price:</span>
                  <span className="text-white font-semibold">{pair.equityPrice}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">Historical Beta:</span>
                  <span className="text-yellow-400 font-semibold">{pair.beta}x</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">Delta Spread:</span>
                  <span
                    className={`font-semibold ${
                      pair.deltaSpreadPct > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {pair.deltaSpreadPct > 0 ? '+' : ''}
                    {pair.deltaSpreadPct}%
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRouteArb(pair);
                }}
                className="mt-2 w-full py-1.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 transition-all cursor-pointer"
              >
                {isSuccess ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Signal Routed!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span>Execute StatArb Loop</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
