// components/LiveTickerMarquee.tsx
import React, { useEffect, useState } from 'react';
import { AssetQuote, INITIAL_ASSET_QUOTES, fetchLiveCryptoPrices } from '@/lib/livePrices';
import { TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface LiveTickerMarqueeProps {
  onSelectAsset?: (ticker: string) => void;
  activeTicker?: string;
}

export const LiveTickerMarquee: React.FC<LiveTickerMarqueeProps> = ({
  onSelectAsset,
  activeTicker,
}) => {
  const [quotes, setQuotes] = useState<Record<string, AssetQuote>>(INITIAL_ASSET_QUOTES);
  const [lastSpikedTicker, setLastSpikedTicker] = useState<string | null>(null);

  // Periodic real public API sync
  useEffect(() => {
    let isMounted = true;
    const syncRealCrypto = async () => {
      const realPrices = await fetchLiveCryptoPrices();
      if (!isMounted) return;
      if (Object.keys(realPrices).length > 0) {
        setQuotes((prev) => {
          const next = { ...prev };
          Object.entries(realPrices).forEach(([ticker, data]) => {
            if (next[ticker] && data) {
              const oldPrice = next[ticker].price;
              const dir = data.price >= oldPrice ? 'UP' : 'DOWN';
              next[ticker] = {
                ...next[ticker],
                price: data.price,
                change24h: data.change24h,
                lastTickDirection: dir,
                lastUpdated: Date.now(),
              };
            }
          });
          return next;
        });
      }
    };

    syncRealCrypto();
    const interval = setInterval(syncRealCrypto, 10000); // sync every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // High-frequency micro-tick simulation for active live feel
  useEffect(() => {
    const tickInterval = setInterval(() => {
      const tickers = Object.keys(quotes);
      const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];

      setQuotes((prev) => {
        const item = prev[randomTicker];
        if (!item) return prev;

        // Micro-jitter: -0.15% to +0.18%
        const deltaPercent = (Math.random() * 0.33 - 0.15) / 100;
        const newPrice = Number((item.price * (1 + deltaPercent)).toFixed(item.price > 1000 ? 1 : 2));
        const dir = newPrice >= item.price ? 'UP' : 'DOWN';

        if (Math.abs(deltaPercent) > 0.001) {
          setLastSpikedTicker(randomTicker);
          setTimeout(() => setLastSpikedTicker(null), 1200);
        }

        return {
          ...prev,
          [randomTicker]: {
            ...item,
            price: newPrice,
            change24h: Number((item.change24h + (dir === 'UP' ? 0.02 : -0.02)).toFixed(2)),
            lastTickDirection: dir,
            lastUpdated: Date.now(),
          },
        };
      });
    }, 1800);

    return () => clearInterval(tickInterval);
  }, [quotes]);

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
          const isSpiking = lastSpikedTicker === asset.ticker;

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
                  : isSpiking
                  ? isUp
                    ? 'bg-emerald-950/40 border-emerald-500/50'
                    : 'bg-rose-950/40 border-rose-500/50'
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

              {/* Live Price */}
              <span className={`font-mono font-medium ${isSelected ? 'text-zinc-900' : 'text-zinc-200'}`}>
                ${asset.price > 1000 ? asset.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : asset.price.toFixed(2)}
              </span>

              {/* Spike/Dip indicator */}
              <span
                className={`flex items-center gap-0.5 text-[11px] font-mono font-bold ${
                  isSelected
                    ? isUp ? 'text-emerald-700' : 'text-rose-700'
                    : isUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? '+' : ''}
                {asset.change24h}%
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
