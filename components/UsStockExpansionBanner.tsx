import React, { useState, useEffect } from 'react';
import { useLiveMarketQuotes, AssetQuote } from '@/lib/livePrices';
import { playCyberClick } from '@/lib/soundSynth';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  X,
  ChevronRight,
  Flame,
  Bot,
  Scale,
  Clock,
  Layers,
} from 'lucide-react';

interface UsStockExpansionBannerProps {
  onSelectTicker?: (ticker: string) => void;
  onNavigateTab?: (tab: 'TERMINAL' | 'AUTOPILOT' | 'COUNCIL' | 'AUDIT') => void;
}

// 5-day competition window starting Sep 18, 2026 until Sep 23, 2026 23:59:59 UTC
const EXPANSION_START_TIME = new Date('2026-09-18T00:00:00Z').getTime();
const EXPANSION_END_TIME = EXPANSION_START_TIME + 5 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'LUNARIS_US_STOCKS_EXPANSION_BANNER_DISMISSED_V1';

const EXPANSION_TICKERS = [
  { ticker: 'PLTR', name: 'Palantir Tech', tag: 'AI Defense' },
  { ticker: 'MARA', name: 'MARA Holdings', tag: 'BTC Miner' },
  { ticker: 'MSFT', name: 'Microsoft Corp', tag: 'AI Mega-Cap' },
  { ticker: 'AVGO', name: 'Broadcom Inc', tag: 'Custom Silicon' },
  { ticker: 'QQQ', name: 'Nasdaq 100 ETF', tag: 'Tech Benchmark' },
];

export const UsStockExpansionBanner: React.FC<UsStockExpansionBannerProps> = ({
  onSelectTicker,
  onNavigateTab,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [daysRemaining, setDaysRemaining] = useState<number>(5);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const { quotes, getQuote } = useLiveMarketQuotes();

  // Compute countdown and check expiration
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      if (now > EXPANSION_END_TIME) {
        setIsExpired(true);
        return;
      }
      const msLeft = Math.max(0, EXPANSION_END_TIME - now);
      const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
      const hours = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      setDaysRemaining(Math.max(1, days));
      setHoursRemaining(hours);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleDismiss = () => {
    playCyberClick();
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Storage fallback
    }
  };

  const handleReopen = () => {
    playCyberClick();
    setIsDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage fallback
    }
  };

  // If expired past 5 days, unmount cleanly
  if (isExpired) {
    return null;
  }

  // If dismissed, render a subtle, non-intrusive compact badge so user can restore it if desired
  if (isDismissed) {
    return (
      <div className="w-full bg-[#0a0c14]/90 border-b border-cyan-500/20 py-1.5 px-4 text-xs font-mono flex items-center justify-between text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F0FF]"></span>
          </span>
          <span className="text-zinc-300 font-medium">
            Equities Expanded: <strong className="text-white">PLTR, MARA, MSFT, AVGO, QQQ</strong> live synced.
          </span>
          <span className="hidden sm:inline-block text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.2 rounded">
            {daysRemaining}d {hoursRemaining}h remaining
          </span>
        </div>
        <button
          onClick={handleReopen}
          className="text-xs text-[#00F0FF] hover:underline hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-semibold"
        >
          <span>View Notice</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-[#04060c] via-[#091122] to-[#04060c] border-b border-cyan-500/30 relative shadow-[0_4px_24px_rgba(0,240,255,0.08)] select-none animate-fadeIn">
      {/* Decorative cybernetic glow bars */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-80" />

      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        {/* Left: Headline & Description */}
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40">
              <Sparkles className="w-3 h-3 animate-pulse text-[#00F0FF]" />
              HACKATHON EXPANSION · 5-DAY NOTICE
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              Active for Next 5 Days ({daysRemaining}d {hoursRemaining}h left)
            </span>
            <span className="text-[10px] text-zinc-400 font-mono hidden lg:inline">
              Real-Time Yahoo Finance Feeds
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-1.5">
              <span>Expanded Equities Trading Universe</span>
              <span className="text-zinc-500 font-normal hidden sm:inline">|</span>
              <span className="text-xs sm:text-sm font-medium text-cyan-300 hidden sm:inline">
                Cross-Asset Autopilot, Live Charts & Council Quorum
              </span>
            </h3>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed max-w-4xl">
            We have integrated 5 high-impact institutional equities and ETFs:
            <strong className="text-white ml-1">PLTR</strong>,{' '}
            <strong className="text-white">MARA</strong>,{' '}
            <strong className="text-white">MSFT</strong>,{' '}
            <strong className="text-white">AVGO</strong>, and{' '}
            <strong className="text-white">QQQ</strong>.
            New trades are now automatically ingested, vetted by our deterministic risk engine, and tradeable across Autopilot and the multi-agent council.
          </p>
        </div>

        {/* Center: Live Interactive Ticker Chips */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {EXPANSION_TICKERS.map((item) => {
            const quote: AssetQuote = getQuote(item.ticker);
            const isUp = (quote?.change24h ?? 0) >= 0;

            return (
              <button
                key={item.ticker}
                onClick={() => {
                  playCyberClick();
                  if (onSelectTicker) onSelectTicker(item.ticker);
                  if (onNavigateTab) onNavigateTab('TERMINAL');
                }}
                title={`Click to inspect ${item.name} (${item.ticker}) in Pro Cockpit`}
                className="group relative flex items-center gap-2 bg-[#0e1628] hover:bg-[#16233f] border border-cyan-500/25 hover:border-cyan-400/60 px-2.5 py-1.5 rounded-lg transition-all text-xs cursor-pointer shadow-sm"
              >
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-white text-[11px] group-hover:text-[#00F0FF] transition-colors">
                      {item.ticker}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {item.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="text-zinc-200 font-semibold">
                      ${quote?.price ? (quote.price > 1000 ? quote.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : quote.price.toFixed(2)) : '---'}
                    </span>
                    <span className={`flex items-center font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}
                      {quote?.change24h ? quote.change24h.toFixed(2) : '0.00'}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Action & Close */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {onNavigateTab && (
            <div className="hidden xl:flex items-center gap-1.5">
              <button
                onClick={() => {
                  playCyberClick();
                  onNavigateTab('AUTOPILOT');
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-md transition-all cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>Autopilot</span>
              </button>
              <button
                onClick={() => {
                  playCyberClick();
                  onNavigateTab('COUNCIL');
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-md transition-all cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Council</span>
              </button>
            </div>
          )}

          <button
            onClick={handleDismiss}
            title="Dismiss announcement (accessible via compact bar)"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
