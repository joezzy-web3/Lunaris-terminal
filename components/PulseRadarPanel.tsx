// components/PulseRadarPanel.tsx
import React, { useState } from 'react';
import { Radio, Flame, TrendingUp, ArrowUpRight, ArrowDownRight, MessageCircle, Twitter, Globe, Search, RefreshCw, Send, Scale } from 'lucide-react';
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
  sources: {
    twitter: number;
    farcaster?: number;
    reddit: number;
    discord: number;
  };
}

const PULSE_DATA: PulseAsset[] = [
  {
    ticker: 'SOL',
    name: 'Solana',
    class: 'CX',
    sentimentScore: 88,
    sentimentLabel: 'EXTREME BULL',
    velocity1h: 312,
    mentionsPerHour: 4820,
    catalystSummary: 'Bitget on-chain liquidity telemetry detects $65M institutional accumulation across spot pairs.',
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
    catalystSummary: 'Global ETF net inflows hit 3-week peak; Bitget futures funding rates stabilize in positive territory.',
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
  const [selectedAsset, setSelectedAsset] = useState<PulseAsset>(PULSE_DATA[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = PULSE_DATA.filter((a) => {
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
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30">
                Tier 1 Social Velocity
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Cross-Asset Social Velocity & Sentiment Heatmap</p>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'ALL' ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter('CX')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'CX'
                ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            CRYPTO (CX)
          </button>
          <button
            onClick={() => setFilter('EQ')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'EQ'
                ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            EQUITIES (EQ)
          </button>
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
                      <span className="text-[10px] text-gray-400">{asset.name}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isBull
                          ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20'
                          : 'text-amber-400 bg-amber-950/40 border border-amber-500/20'
                      }`}
                    >
                      {asset.sentimentScore} / 100
                    </span>
                  </div>

                  {/* Velocity indicator */}
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <div className="flex items-center gap-1">
                      <Flame className={`w-3 h-3 ${isHighVelocity ? 'text-amber-400' : 'text-gray-500'}`} />
                      <span className="text-[10px]">
                        Velocity: <span className="font-bold text-white">+{asset.velocity1h}%/1h</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">{asset.mentionsPerHour.toLocaleString()} mentions/hr</span>
                  </div>

                  {/* Velocity Bar */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
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
                      title={`Convene Tri-Persona Council on ${asset.ticker}`}
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
        <div className="bg-black/50 border border-white/10 rounded-lg p-3 flex flex-col justify-between text-xs">
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
                </div>
                <div className="text-[10px] text-gray-400">{selectedAsset.name}</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase">State</div>
                <div className="text-xs font-bold text-emerald-400">{selectedAsset.sentimentLabel}</div>
              </div>
            </div>

            {/* Social breakdown */}
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Platform Sentiment Score</div>
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
            className="w-full mt-3 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-400 text-purple-200 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all cursor-pointer uppercase tracking-wider"
          >
            <Send className="w-3.5 h-3.5" /> CONVENE COUNCIL WITH {selectedAsset.ticker} INSTRUCTION &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
