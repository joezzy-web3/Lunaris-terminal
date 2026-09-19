// components/PulseRadarPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Flame, TrendingUp, ArrowUpRight, ArrowDownRight, MessageCircle, Twitter, Globe, Search, RefreshCw, Send, Scale, Sparkles, Activity } from 'lucide-react';
import { PulseContext } from '@/lib/councilDebateEngine';

export interface PulseAsset {
  ticker: string;
  name: string;
  class: 'CX' | 'EQ';
  sentimentScore: number; // -100 to +100
  sentimentLabel: 'EXTREME BULL' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'EXTREME FEAR';
  velocity1h: number; // % spike
  mentionsPerHour: number;
  catalystSummary: string;
  currentPrice?: number;
  change24h?: number;
  isTrending?: boolean;
  searchQueries?: string[];
  sources: {
    twitter: number;
    farcaster?: number;
    reddit: number;
    discord: number;
  };
}

const INITIAL_PULSE_DATA: PulseAsset[] = [
  {
    ticker: 'SOL',
    name: 'Solana',
    class: 'CX',
    sentimentScore: 88,
    sentimentLabel: 'EXTREME BULL',
    velocity1h: 312,
    mentionsPerHour: 4820,
    catalystSummary: 'Bitget on-chain liquidity telemetry detects institutional accumulation across spot pairs.',
    sources: { twitter: 91, farcaster: 84, reddit: 76, discord: 89 },
  },
  {
    ticker: 'NVDAon',
    name: 'NVIDIA (rToken 7x24)',
    class: 'EQ',
    sentimentScore: 82,
    sentimentLabel: 'BULLISH',
    velocity1h: 185,
    mentionsPerHour: 3940,
    catalystSummary: 'Bitget tokenized equity 7x24 volume surge as datacenter AI accelerator reports cross wire.',
    sources: { twitter: 84, reddit: 80, discord: 78 },
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    class: 'CX',
    sentimentScore: 74,
    sentimentLabel: 'BULLISH',
    velocity1h: 94,
    mentionsPerHour: 12450,
    catalystSummary: 'Global ETF net inflows hit positive streak; Bitget futures funding rates stabilize in positive territory.',
    sources: { twitter: 78, farcaster: 72, reddit: 69, discord: 75 },
  },
  {
    ticker: 'TSLAon',
    name: 'Tesla (rToken 7x24)',
    class: 'EQ',
    sentimentScore: 68,
    sentimentLabel: 'BULLISH',
    velocity1h: 142,
    mentionsPerHour: 3120,
    catalystSummary: 'Bitget 7x24 tokenized stock breakout after robotaxi regulatory trial filings.',
    sources: { twitter: 72, reddit: 65, discord: 68 },
  },
  {
    ticker: 'MSTR',
    name: 'MicroStrategy',
    class: 'EQ',
    sentimentScore: 79,
    sentimentLabel: 'BULLISH',
    velocity1h: 142,
    mentionsPerHour: 2150,
    catalystSummary: 'Treasury convertible note offering closed with high institutional demand.',
    sources: { twitter: 82, reddit: 75, discord: 80 },
  },
  {
    ticker: 'ETH',
    name: 'Ethereum',
    class: 'CX',
    sentimentScore: 58,
    sentimentLabel: 'NEUTRAL',
    velocity1h: 48,
    mentionsPerHour: 5120,
    catalystSummary: 'Layer-2 gas fee compression remains positive; DeFi total value locked consolidation ongoing.',
    sources: { twitter: 62, farcaster: 68, reddit: 54, discord: 60 },
  },
  {
    ticker: 'COIN',
    name: 'Coinbase',
    class: 'EQ',
    sentimentScore: 66,
    sentimentLabel: 'BULLISH',
    velocity1h: 88,
    mentionsPerHour: 1420,
    catalystSummary: 'Base network L2 transaction volume hit weekly records; custody assets growing.',
    sources: { twitter: 70, reddit: 64, discord: 68 },
  },
  {
    ticker: 'AVAX',
    name: 'Avalanche',
    class: 'CX',
    sentimentScore: 63,
    sentimentLabel: 'BULLISH',
    velocity1h: 110,
    mentionsPerHour: 980,
    catalystSummary: 'Institutional subnets pilot launched for tokenized RWA settlement.',
    sources: { twitter: 65, farcaster: 60, reddit: 58, discord: 64 },
  },
];

export interface PulseRadarPanelProps {
  onSelectTickerForCouncil: (ticker: string, context?: PulseContext) => void;
}

export function PulseRadarPanel({ onSelectTickerForCouncil }: PulseRadarPanelProps) {
  const [filter, setFilter] = useState<'ALL' | 'CX' | 'EQ'>('ALL');
  const [pulseData, setPulseData] = useState<PulseAsset[]>(INITIAL_PULSE_DATA);
  const [selectedAsset, setSelectedAsset] = useState<PulseAsset>(INITIAL_PULSE_DATA[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Live');
  const [fearGreed, setFearGreed] = useState<{ value: number; label: string }>({ value: 65, label: 'Greed' });
  const [aiGroundingLog, setAiGroundingLog] = useState<string[]>([]);

  // Fetch live market pulse from server endpoint
  const fetchLivePulse = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/market/pulse');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPulseData(json.data);
          if (json.fearAndGreed) setFearGreed(json.fearAndGreed);
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          
          // Update selected asset if already picked
          setSelectedAsset((prev) => {
            const match = json.data.find((a: PulseAsset) => a.ticker === prev.ticker);
            return match || prev;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live pulse:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic polling every 12 seconds
  useEffect(() => {
    fetchLivePulse();
    const interval = setInterval(fetchLivePulse, 12000);
    return () => clearInterval(interval);
  }, [fetchLivePulse]);

  // Real-Time Gemini AI Live Search Refresh for Selected Asset
  const triggerAiLiveSearch = async () => {
    if (!selectedAsset) return;
    try {
      setIsAiScanning(true);
      const res = await fetch('/api/market/pulse/ai-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: selectedAsset.ticker }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const d = result.data;
          const updatedAsset: PulseAsset = {
            ...selectedAsset,
            sentimentScore: d.sentimentScore || selectedAsset.sentimentScore,
            sentimentLabel: d.sentimentLabel || selectedAsset.sentimentLabel,
            velocity1h: d.velocity1h || selectedAsset.velocity1h,
            mentionsPerHour: d.mentionsPerHour || selectedAsset.mentionsPerHour,
            catalystSummary: d.breakingCatalyst || selectedAsset.catalystSummary,
            searchQueries: d.searchQueries || [],
            sources: {
              twitter: d.twitterSentiment || selectedAsset.sources.twitter,
              farcaster: d.farcasterSentiment || selectedAsset.sources.farcaster,
              reddit: d.redditSentiment || selectedAsset.sources.reddit,
              discord: selectedAsset.sources.discord,
            },
          };

          setSelectedAsset(updatedAsset);
          setPulseData((prev) => prev.map((a) => (a.ticker === updatedAsset.ticker ? updatedAsset : a)));
          if (d.searchQueries && d.searchQueries.length > 0) {
            setAiGroundingLog(d.searchQueries);
          }
        }
      }
    } catch (err) {
      console.warn('AI live search pulse error:', err);
    } finally {
      setIsAiScanning(false);
    }
  };

  const filteredAssets = pulseData.filter((a) => {
    if (filter === 'CX' && a.class !== 'CX') return false;
    if (filter === 'EQ' && a.class !== 'EQ') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="bg-[var(--lunaris-panel-bg)] border border-[var(--lunaris-panel-border)] rounded-lg p-4 font-mono shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          {/* Signature Lunaris Multi-Color Diamond Emblem */}
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 rounded-xs bg-gradient-to-tr from-[#00F0FF] via-[#FACC15] to-[#D946EF] rotate-45 shadow-[0_0_10px_rgba(0,240,255,0.65)]" />
            <div className="absolute w-1 h-1 rounded-full bg-[#0c0e14]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-white">LUNARIS PULSE</h2>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Social Velocity
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-950/50 border border-amber-500/30 px-1.5 py-0.5 rounded hidden sm:inline-flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" /> F&G: {fearGreed.value} ({fearGreed.label})
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Cross-Asset Social Velocity & Sentiment Heatmap • Refreshed: {lastUpdated}
            </p>
          </div>
        </div>

        {/* Controls: Manual Refresh & Filter Badges */}
        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={fetchLivePulse}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Poll live CoinGecko & Bitget social momentum"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-gray-400'}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Feeds'}</span>
          </button>

          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-0.5 rounded">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'ALL' ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilter('CX')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'CX'
                  ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              CX
            </button>
            <button
              onClick={() => setFilter('EQ')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === 'EQ'
                  ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              EQ
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Heatmap Cards & Selected Asset Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap List */}
        <div className="lg:col-span-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredAssets.map((asset) => {
              const isSelected = selectedAsset.ticker === asset.ticker;
              const isHighVelocity = asset.velocity1h > 100;
              const isBull = asset.sentimentScore >= 60;

              return (
                <div
                  key={asset.ticker}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-2.5 rounded-md cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-white/10 border-[var(--lunaris-accent-cyan)] shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                      : 'bg-black/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          asset.class === 'CX' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                        }`}
                      >
                        {asset.class}
                      </span>
                      <span className="font-bold text-white text-xs">{asset.ticker}</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{asset.name}</span>
                      {asset.isTrending && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded uppercase font-bold">
                          Trending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {asset.currentPrice !== undefined && (
                        <span className="text-[10px] text-gray-300 font-mono">
                          ${asset.currentPrice >= 1 ? asset.currentPrice.toLocaleString() : asset.currentPrice.toFixed(4)}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isBull
                            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20'
                            : 'text-amber-400 bg-amber-950/40 border border-amber-500/20'
                        }`}
                      >
                        {asset.sentimentScore}/100
                      </span>
                    </div>
                  </div>

                  {/* Velocity indicator */}
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <div className="flex items-center gap-1">
                      <Flame className={`w-3 h-3 ${isHighVelocity ? 'text-amber-400 animate-pulse' : 'text-gray-500'}`} />
                      <span className="text-[10px]">
                        Velocity: <span className="font-bold text-white">+{asset.velocity1h}%/1h</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">{asset.mentionsPerHour.toLocaleString()} mentions/hr</span>
                  </div>

                  {/* Velocity Bar */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHighVelocity ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, (asset.velocity1h / 350) * 100)}%` }}
                    />
                  </div>

                  {/* Quick Convene Row */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                    <span className="text-[9px] text-gray-400 truncate max-w-[130px]">
                      {asset.catalystSummary.slice(0, 32)}...
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAsset(asset);
                        onSelectTickerForCouncil(asset.ticker, {
                          catalystSummary: asset.catalystSummary,
                          sentimentLabel: asset.sentimentLabel,
                          sentimentScore: asset.sentimentScore,
                          velocity1h: asset.velocity1h,
                          mentionsPerHour: asset.mentionsPerHour,
                        });
                      }}
                      className="text-[10px] text-purple-300 hover:text-purple-100 hover:bg-purple-500/30 bg-purple-500/15 border border-purple-500/40 rounded px-1.5 py-0.5 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title={`Convene 4-Pillar Council on ${asset.ticker}`}
                    >
                      <Scale className="w-2.5 h-2.5" /> Convene &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Asset Deep Dive Card */}
        <div className="bg-black/50 border border-white/10 rounded-lg p-3 flex flex-col justify-between text-xs space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{selectedAsset.ticker}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      selectedAsset.class === 'CX' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                    }`}
                  >
                    {selectedAsset.class === 'CX' ? 'Crypto Token' : 'Tokenized Equity'}
                  </span>
                  {selectedAsset.isTrending && (
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-bold">
                      Viral Spike
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400">
                  {selectedAsset.name} {selectedAsset.currentPrice ? `• $${selectedAsset.currentPrice >= 1 ? selectedAsset.currentPrice.toLocaleString() : selectedAsset.currentPrice.toFixed(4)}` : ''}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase">State</div>
                <div className="text-xs font-bold text-emerald-400">{selectedAsset.sentimentLabel}</div>
              </div>
            </div>

            {/* AI Live Search Refresh Button */}
            <button
              onClick={triggerAiLiveSearch}
              disabled={isAiScanning}
              className="w-full py-1.5 px-2.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 hover:text-white flex items-center justify-center gap-2 text-[11px] font-bold shadow-[0_0_10px_rgba(0,240,255,0.15)] transition-all cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${isAiScanning ? 'animate-spin' : ''}`} />
              <span>{isAiScanning ? `Scanning Google & X for ${selectedAsset.ticker}...` : `AI Live Search Pulse for ${selectedAsset.ticker}`}</span>
            </button>

            {/* Social breakdown */}
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Live Platform Sentiment Split</div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Twitter className="w-3 h-3 text-sky-400" /> X / Twitter
                  </span>
                  <span className="text-white font-semibold">{selectedAsset.sources.twitter}% Bullish</span>
                </div>
                {selectedAsset.sources.farcaster && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-purple-400" /> Farcaster / Base
                    </span>
                    <span className="text-white font-semibold">{selectedAsset.sources.farcaster}% Bullish</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-orange-400" /> Reddit Quant Forums
                  </span>
                  <span className="text-white font-semibold">{selectedAsset.sources.reddit}% Bullish</span>
                </div>
              </div>
            </div>

            {/* AI Catalyst Snippet */}
            <div className="p-2.5 bg-black/60 rounded-lg border border-blue-500/20">
              <div className="text-[10px] text-cyan-400 font-bold mb-1 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse text-cyan-400" /> Active Pulse Catalyst Stream
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed italic">
                "{selectedAsset.catalystSummary}"
              </p>
              {selectedAsset.searchQueries && selectedAsset.searchQueries.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-white/5 flex flex-wrap gap-1">
                  <span className="text-[9px] text-gray-500">Grounding Sources:</span>
                  {selectedAsset.searchQueries.slice(0, 2).map((q, idx) => (
                    <span key={idx} className="text-[9px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                      {q}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Handoff Button to Council */}
          <button
            onClick={() =>
              onSelectTickerForCouncil(selectedAsset.ticker, {
                catalystSummary: selectedAsset.catalystSummary,
                sentimentLabel: selectedAsset.sentimentLabel,
                sentimentScore: selectedAsset.sentimentScore,
                velocity1h: selectedAsset.velocity1h,
                mentionsPerHour: selectedAsset.mentionsPerHour,
              })
            }
            className="w-full mt-2 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-400 text-purple-200 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all cursor-pointer uppercase tracking-wider"
          >
            <Send className="w-3.5 h-3.5" /> CONVENE COUNCIL WITH {selectedAsset.ticker} INSTRUCTION &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

