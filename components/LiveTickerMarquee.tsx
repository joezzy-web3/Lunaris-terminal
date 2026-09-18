// components/LiveTickerMarquee.tsx
import React from 'react';
import { AssetQuote, useLiveMarketQuotes } from '@/lib/livePrices';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface LiveTickerMarqueeProps {
  onSelectAsset?: (ticker: string) => void;
  activeTicker?: string;
}

const NEW_STOCKS = new Set(['PLTR', 'MARA', 'MSFT', 'AVGO', 'QQQ']);

export const LiveTickerMarquee: React.FC<LiveTickerMarqueeProps> = ({
  onSelectAsset,
  activeTicker,
}) => {
  const { quotes } = useLiveMarketQuotes();

  const assetList: AssetQuote[] = Object.values(quotes);
  // Duplicate for seamless infinite marquee scroll
  const displayList: AssetQuote[] = [...assetList, ...assetList];

  return (
    <div className="w-full bg-[#050508] border-y border-white/10 overflow-hidden relative group py-2 select-none">
      {/* Subtle edge vignette */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#050508] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#050508] to-transparent z-10 pointer-events-none" />

      {/* Marquee Track with CSS animation */}
      <div className="flex w-max animate-ticker hover:[animation-play-state:paused] items-center gap-6">
        {displayList.map((asset: AssetQuote, idx: number) => {
          const isUp = asset.change24h >= 0;
          const isSelected = activeTicker === asset.ticker;
          const isNew = NEW_STOCKS.has(asset.ticker);

          return (
            <button
              key={`${asset.ticker}-${idx}`}
              onClick={() => {
                playCyberClick();
                if (onSelectAsset) onSelectAsset(asset.ticker);
              }}
              className={`flex items-center gap-2.5 px-3 py-1 rounded-md border transition-all text-xs cursor-pointer ${
                isSelected
                  ? 'bg-white text-black border-white font-bold shadow-sm'
                  : 'bg-white/[0.02] border-white/8 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              {/* Asset Class Badge */}
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isSelected
                    ? 'bg-black/15 text-black'
                    : 'bg-white/10 text-zinc-300 border border-white/10'
                }`}
              >
                {asset.class === 'CX' ? 'CRYPTO' : 'EQUITY'}
              </span>

              {/* Ticker Name */}
              <span className={`font-bold tracking-wider ${isSelected ? 'text-black' : 'text-white'}`}>
                {asset.ticker}
              </span>

              {isNew && (
                <span className="text-[8px] font-mono font-extrabold px-1 py-0.2 rounded bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40 tracking-wider">
                  NEW
                </span>
              )}

              {/* Live Price */}
              <span className={`font-mono font-medium ${isSelected ? 'text-zinc-900' : 'text-zinc-200'}`}>
                ${asset.price > 1000 ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : asset.price.toFixed(2)}
              </span>

              {/* Spike/Dip indicator with strictly 2 decimal places */}
              <span
                className={`flex items-center gap-0.5 text-[11px] font-mono font-bold ${
                  isSelected
                    ? isUp ? 'text-emerald-700' : 'text-rose-700'
                    : isUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}
                {asset.change24h.toFixed(2)}%
              </span>

              {/* Animated pulse dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUp ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-pulse'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
