// components/CommandPaletteModal.tsx
// Quick Agentic Command Palette (Cmd + K / Ctrl + K) for Lunaris Terminal

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Zap,
  Cpu,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  Terminal,
  Radio,
  ScrollText,
  Activity,
  Layers,
  Sparkles,
  Command,
  X,
} from 'lucide-react';
import { playCyberClick, playTradeApprovedChime } from '@/lib/soundSynth';

export interface CommandItem {
  id: string;
  category: 'AGENTIC_ACTION' | 'COUNCIL_INQUIRY' | 'BACKTEST_SIM' | 'NAVIGATION';
  title: string;
  description: string;
  badge?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'DECK' | 'TERMINAL' | 'AUTOPILOT' | 'COUNCIL' | 'PULSE' | 'ALGO' | 'AUDIT') => void;
  onNavigateCockpitModule?: (module: 'CHART' | 'AUTOPILOT' | 'COUNCIL' | 'PULSE' | 'DEPTH' | 'STATARB' | 'KILLSWITCH' | 'AUDIT' | 'ALL') => void;
  onConveneCouncil?: (ticker: string, prompt?: string) => void;
  onOpenFlashCrashDrill?: () => void;
  onOpenAuditLedger?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onNavigateCockpitModule,
  onConveneCouncil,
  onOpenFlashCrashDrill,
  onOpenAuditLedger,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        playCyberClick();
        if (isOpen) {
          onClose();
        } else {
          // Open trigger handled outside or via parent state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allCommands: CommandItem[] = [
    // 1. Agentic Actions
    {
      id: 'cmd-hedge-eth-sol',
      category: 'AGENTIC_ACTION',
      title: 'Hedge 30% of ETH exposure with SOL short',
      description: 'Deploy synthetic inverse perp delta-neutral pairs hedge on Bitget liquidity pool',
      badge: 'Autopilot Route',
      action: () => {
        onNavigateTab('AUTOPILOT');
        onClose();
      },
    },
    {
      id: 'cmd-flash-crash-drill',
      category: 'AGENTIC_ACTION',
      title: 'Simulate Black Swan Flash Crash drill (-8%)',
      description: 'Guardian-01 slams emergency killswitch to demonstrate autonomous capital defense',
      badge: 'Defcon-1 Drill',
      action: () => {
        onClose();
        if (onOpenFlashCrashDrill) onOpenFlashCrashDrill();
      },
    },
    {
      id: 'cmd-trigger-instant-trade',
      category: 'AGENTIC_ACTION',
      title: 'Trigger instantaneous Council Quorum paper trade',
      description: 'Execute tripartite consensus verification and append settled PnL to audit log',
      badge: 'Audit Verified',
      action: () => {
        onNavigateTab('AUDIT');
        onClose();
      },
    },

    // 2. Council Inquiries
    {
      id: 'cmd-council-nvda',
      category: 'COUNCIL_INQUIRY',
      title: 'What does Atlas-Macro think about NVDAon catalyst?',
      description: 'Consult Atlas-Macro on 24/7 tokenized US equity liquidity & AI chip earnings narrative',
      badge: 'Atlas-Macro',
      action: () => {
        onNavigateTab('COUNCIL');
        if (onConveneCouncil) onConveneCouncil('NVDAon', 'Analyze weekend tokenized equity catalyst vs semiconductor ETF flows.');
        onClose();
      },
    },
    {
      id: 'cmd-council-btc',
      category: 'COUNCIL_INQUIRY',
      title: 'Ask Quant-Omega for orderbook breakout thesis on BTC',
      description: 'Evaluate microstructural bid-ask depth and high-frequency momentum acceleration',
      badge: 'Quant-Omega',
      action: () => {
        onNavigateTab('COUNCIL');
        if (onConveneCouncil) onConveneCouncil('BTC', 'Evaluate orderbook liquidation walls and institutional accumulation depth.');
        onClose();
      },
    },
    {
      id: 'cmd-council-guardian',
      category: 'COUNCIL_INQUIRY',
      title: 'Ask Guardian-01 for deterministic risk ceiling audit',
      description: 'Verify hard -10% stop-loss limits, 25% single-asset VaR cap, and liquidation buffers',
      badge: 'Guardian-01',
      action: () => {
        onNavigateTab('COUNCIL');
        if (onConveneCouncil) onConveneCouncil('SOL', 'Audit portfolio VaR ceiling under current market volatility regime.');
        onClose();
      },
    },

    // 3. Simulations & Analytics
    {
      id: 'cmd-chart-sui',
      category: 'BACKTEST_SIM',
      title: 'Analyze real-time momentum chart on SUI/USDT',
      description: 'Inspect live green spike & red dip price-action indicators and liquidity levels',
      badge: 'Live Chart',
      action: () => {
        onNavigateTab('TERMINAL');
        if (onNavigateCockpitModule) onNavigateCockpitModule('CHART');
        onClose();
      },
    },
    {
      id: 'cmd-statarb-matrix',
      category: 'BACKTEST_SIM',
      title: 'View 6x6 Cross-Asset Correlation & StatArb Heatmap',
      description: 'Inspect rolling correlation divergence between spot crypto and 24/7 tokenized stocks',
      badge: 'Matrix Radar',
      action: () => {
        onNavigateTab('TERMINAL');
        if (onNavigateCockpitModule) onNavigateCockpitModule('STATARB');
        onClose();
      },
    },
    {
      id: 'cmd-open-audit-ledger',
      category: 'BACKTEST_SIM',
      title: 'Open Bitget S2 Official Paper-Trading Audit Ledger',
      description: 'Inspect complete Track 2 trade settlement receipts, Sharpe ratio, and compliance hashes',
      badge: 'Track 2 S2',
      action: () => {
        if (onOpenAuditLedger) onOpenAuditLedger();
        else onNavigateTab('AUDIT');
        onClose();
      },
    },

    // 4. Navigation
    {
      id: 'nav-deck',
      category: 'NAVIGATION',
      title: 'Jump to Command Deck (Overview)',
      description: 'Executive dashboard with institutional liquidity streams and system health',
      action: () => {
        onNavigateTab('DECK');
        onClose();
      },
    },
    {
      id: 'nav-cockpit',
      category: 'NAVIGATION',
      title: 'Jump to Pro Trading Cockpit',
      description: 'Multi-screen institutional terminal with TradingView charts and live depth heatmap',
      action: () => {
        onNavigateTab('TERMINAL');
        onClose();
      },
    },
    {
      id: 'nav-autopilot',
      category: 'NAVIGATION',
      title: 'Jump to Autonomous 24/7 Execution Loop',
      description: 'Self-governing autopilot agent executing algorithmic cross-asset positions',
      action: () => {
        onNavigateTab('AUTOPILOT');
        onClose();
      },
    },
    {
      id: 'nav-pulse',
      category: 'NAVIGATION',
      title: 'Jump to Social & Whale Pulse Radar',
      description: 'Real-time Telegram/X sentiment velocity and smart-money whale accumulation scanner',
      action: () => {
        onNavigateTab('PULSE');
        onClose();
      },
    },
    {
      id: 'nav-algo',
      category: 'NAVIGATION',
      title: 'Jump to Visual Algorithm Node Canvas',
      description: 'Drag-and-drop quantitative logic graph builder for deterministic strategies',
      action: () => {
        onNavigateTab('ALGO');
        onClose();
      },
    },
  ];

  // Filter commands by query
  const filteredCommands = allCommands.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDownInList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        playTradeApprovedChime();
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-fadeIn font-mono">
      <div className="bg-[#0c0e15] border border-[#00F0FF]/40 rounded-2xl max-w-2xl w-full shadow-[0_0_50px_rgba(0,240,255,0.18)] overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#08090e]">
          <Search className="w-5 h-5 text-[#00F0FF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInList}
            placeholder="Type a command or ask Council (e.g. 'Hedge ETH with SOL', 'NVDAon catalyst')..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              Clear
            </button>
          )}
          <div className="flex items-center gap-1 text-[10px] bg-white/10 border border-white/15 px-2 py-0.5 rounded text-zinc-300 shrink-0">
            <span>ESC</span>
          </div>
        </div>

        {/* Command Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {filteredCommands.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-xs">
              No matching agentic commands found for &quot;{query}&quot;. Try typing &quot;Hedge&quot;, &quot;Council&quot;, or &quot;Backtest&quot;.
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    playTradeApprovedChime();
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-white shadow-sm'
                      : 'hover:bg-white/[0.04] border border-transparent text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        item.category === 'AGENTIC_ACTION'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : item.category === 'COUNCIL_INQUIRY'
                          ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30'
                          : item.category === 'BACKTEST_SIM'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-white/5 text-zinc-400 border border-white/10'
                      }`}
                    >
                      {item.category === 'AGENTIC_ACTION' && <Zap className="w-3.5 h-3.5" />}
                      {item.category === 'COUNCIL_INQUIRY' && <Cpu className="w-3.5 h-3.5" />}
                      {item.category === 'BACKTEST_SIM' && <Activity className="w-3.5 h-3.5" />}
                      {item.category === 'NAVIGATION' && <ArrowRight className="w-3.5 h-3.5" />}
                    </div>

                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate font-sans">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[10px] bg-white/10 text-zinc-300 border border-white/10 px-2 py-0.5 rounded font-mono hidden sm:inline-block">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[10px] text-[#00F0FF] font-bold flex items-center gap-1 font-mono">
                        <span>↵ EXECUTE</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Quick Hints */}
        <div className="px-4 py-2 border-t border-white/10 bg-[#08090e] flex items-center justify-between text-[10px] text-zinc-400 shrink-0 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select / Execute</span>
            <span>ESC to Dismiss</span>
          </div>
          <div className="flex items-center gap-1 text-[#00F0FF]">
            <Sparkles className="w-3 h-3" />
            <span>Agentic Quick Dispatcher</span>
          </div>
        </div>
      </div>
    </div>
  );
};
