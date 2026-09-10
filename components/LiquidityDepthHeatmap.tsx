// components/LiquidityDepthHeatmap.tsx
import React, { useState, useEffect } from 'react';
import { Layers, Activity, ShieldCheck, ArrowRight, RefreshCw, BarChart2 } from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface LiquidityDepthProps {
  ticker?: string;
}

interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export const LiquidityDepthHeatmap: React.FC<LiquidityDepthProps> = ({ ticker = 'BTC' }) => {
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);
  const [imbalanceRatio, setImbalanceRatio] = useState<number>(53.4); // % bullish buy pressure

  useEffect(() => {
    // Generate realistic order book depth around current asset base
    const basePrices: Record<string, number> = {
      BTC: 88420,
      ETH: 2748,
      SOL: 184.6,
      NVDA: 139.4,
      MSTR: 368.2,
      COIN: 218.5,
      TSLA: 249.8,
      AAPL: 224.8,
    };
    const mid = basePrices[ticker] || 88400;

    const generateBook = () => {
      const newBids: OrderBookLevel[] = [];
      const newAsks: OrderBookLevel[] = [];
      let cumBid = 0;
      let cumAsk = 0;

      for (let i = 1; i <= 8; i++) {
        const bidPrice = mid * (1 - 0.0006 * i);
        const bidSize = Number((Math.random() * 4.5 + 0.8).toFixed(2));
        cumBid += bidSize;
        newBids.push({ price: bidPrice, size: bidSize, total: Number(cumBid.toFixed(2)) });

        const askPrice = mid * (1 + 0.0006 * i);
        const askSize = Number((Math.random() * 4.5 + 0.8).toFixed(2));
        cumAsk += askSize;
        newAsks.push({ price: askPrice, size: askSize, total: Number(cumAsk.toFixed(2)) });
      }

      setBids(newBids);
      setAsks(newAsks);
      setImbalanceRatio(Number(((cumBid / (cumBid + cumAsk)) * 100).toFixed(1)));
    };

    generateBook();
    const interval = setInterval(generateBook, 2400);
    return () => clearInterval(interval);
  }, [ticker]);

  const maxTotal = Math.max(
    bids[bids.length - 1]?.total || 1,
    asks[asks.length - 1]?.total || 1
  );

  return (
    <div className="bg-[#0c0c11] border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
            BITGET DEPTH & LIQUIDITY HEATMAP
            <span className="text-[10px] text-yellow-400 border border-yellow-400/30 px-1.5 py-0.2 rounded bg-yellow-400/10">
              {ticker}/USDT
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">
            Order Book Imbalance:{' '}
            <b className={imbalanceRatio >= 50 ? 'text-emerald-400' : 'text-red-400'}>
              {imbalanceRatio}% {imbalanceRatio >= 50 ? 'BUY BIAS' : 'SELL BIAS'}
            </b>
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">Spread: <b className="text-white">0.02%</b></span>
        </div>
      </div>

      {/* Imbalance Meter */}
      <div className="w-full bg-red-950/60 rounded-full h-2 overflow-hidden flex border border-white/10">
        <div
          className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          style={{ width: `${imbalanceRatio}%` }}
        />
      </div>

      {/* Order Book Depth Dual Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* BIDS (BUY WALLS) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-gray-400 text-[11px] px-2 font-bold pb-1 border-b border-white/5">
            <span>PRICE (USDT)</span>
            <span>SIZE ({ticker})</span>
            <span>CUMULATIVE</span>
          </div>
          {bids.map((b, i) => {
            const depthPct = (b.total / maxTotal) * 100;
            return (
              <div key={`bid-${i}`} className="relative flex justify-between px-2 py-1 rounded overflow-hidden">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500/15 transition-all duration-300 pointer-events-none"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="text-emerald-400 font-bold relative z-10">
                  ${b.price.toFixed(b.price > 1000 ? 1 : 2)}
                </span>
                <span className="text-gray-300 relative z-10">{b.size}</span>
                <span className="text-gray-400 relative z-10">{b.total}</span>
              </div>
            );
          })}
        </div>

        {/* ASKS (SELL PRESSURE) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-gray-400 text-[11px] px-2 font-bold pb-1 border-b border-white/5">
            <span>PRICE (USDT)</span>
            <span>SIZE ({ticker})</span>
            <span>CUMULATIVE</span>
          </div>
          {asks.map((a, i) => {
            const depthPct = (a.total / maxTotal) * 100;
            return (
              <div key={`ask-${i}`} className="relative flex justify-between px-2 py-1 rounded overflow-hidden">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-500/15 transition-all duration-300 pointer-events-none"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="text-red-400 font-bold relative z-10">
                  ${a.price.toFixed(a.price > 1000 ? 1 : 2)}
                </span>
                <span className="text-gray-300 relative z-10">{a.size}</span>
                <span className="text-gray-400 relative z-10">{a.total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
