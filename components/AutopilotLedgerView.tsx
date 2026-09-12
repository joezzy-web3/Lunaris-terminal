import React, { useState, useMemo } from 'react';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Search, 
  Filter, 
  DollarSign, 
  CheckCircle2, 
  ShieldAlert, 
  Zap, 
  Wallet, 
  Layers,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';
import { playCyberClick, playTradeApprovedChime } from '@/lib/soundSynth';

export interface AutopilotLedgerEntry {
  id: string;
  timestamp: string;
  utcTimestamp: string;
  type: 'BUY' | 'SELL' | 'TAKE_PROFIT' | 'CASHOUT_ALL' | 'AUTO_EXIT' | 'STOP_LOSS' | 'MANUAL_INTERVENTION' | 'SYSTEM_RESET';
  ticker: string;
  amount: number;
  price: number;
  totalUsd: number;
  balanceBefore: number;
  balanceAfter: number;
  realizedPnl: number;
  realizedPnlPct: number;
  notes: string;
}

interface AutopilotLedgerViewProps {
  ledger: AutopilotLedgerEntry[];
  cashBalance: number;
  onOpenResetModal?: () => void;
  onResetPortfolio?: () => void;
  onManualTrade?: (ticker: string, action: 'BUY' | 'SELL', usdAmount: number) => void;
  isAutopilotActive?: boolean;
  onToggleAutopilot?: () => void;
}

export function AutopilotLedgerView({
  ledger,
  cashBalance,
  onOpenResetModal,
  onResetPortfolio,
  onManualTrade,
  isAutopilotActive,
  onToggleAutopilot,
}: AutopilotLedgerViewProps) {
  const triggerResetModal = onOpenResetModal || onResetPortfolio || (() => {});
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [manualTicker, setManualTicker] = useState('BTC');
  const [manualAction, setManualAction] = useState<'BUY' | 'SELL'>('BUY');
  const [manualUsd, setManualUsd] = useState(2500);

  // Filtered ledger entries
  const filteredLedger = useMemo(() => {
    return ledger.filter((entry) => {
      const matchesSearch = 
        entry.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (typeFilter === 'ALL') return true;
      if (typeFilter === 'PROFIT' && (entry.type === 'TAKE_PROFIT' || entry.type === 'AUTO_EXIT' || entry.realizedPnl > 0)) return true;
      if (typeFilter === 'CASHOUT' && entry.type === 'CASHOUT_ALL') return true;
      if (typeFilter === 'MANUAL' && entry.type === 'MANUAL_INTERVENTION') return true;
      if (typeFilter === 'CUT' && (entry.type === 'STOP_LOSS' || entry.realizedPnl < 0)) return true;
      if (typeFilter === 'RESET' && entry.type === 'SYSTEM_RESET') return true;

      return true;
    });
  }, [ledger, searchTerm, typeFilter]);

  // Comprehensive aggregate stats
  const stats = useMemo(() => {
    let totalRealizedPnl = 0;
    let totalVolume = 0;
    let wins = 0;
    let closedTrades = 0;

    ledger.forEach((entry) => {
      totalVolume += Math.abs(entry.totalUsd || 0);
      if (entry.type === 'TAKE_PROFIT' || entry.type === 'AUTO_EXIT' || entry.type === 'CASHOUT_ALL' || entry.type === 'SELL' || entry.type === 'STOP_LOSS') {
        closedTrades++;
        totalRealizedPnl += (entry.realizedPnl || 0);
        if ((entry.realizedPnl || 0) >= 0) {
          wins++;
        }
      }
    });

    const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 100;

    return {
      totalRealizedPnl,
      totalVolume,
      closedTrades,
      winRate,
    };
  }, [ledger]);

  // Export CSV for browser persistence verification
  const handleExportCSV = () => {
    playCyberClick();
    if (ledger.length === 0) return;

    const headers = [
      'ID',
      'Local Time',
      'UTC Time',
      'Action Type',
      'Instrument',
      'Units',
      'Price (USD)',
      'Total Value (USD)',
      'Balance Before',
      'Balance After',
      'Realized PnL (USD)',
      'Realized PnL (%)',
      'Notes'
    ];

    const rows = ledger.map((e) => [
      e.id,
      `"${e.timestamp}"`,
      `"${e.utcTimestamp}"`,
      e.type,
      e.ticker,
      e.amount,
      e.price,
      e.totalUsd,
      e.balanceBefore,
      e.balanceAfter,
      e.realizedPnl,
      e.realizedPnlPct,
      `"${e.notes.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lunaris-autopilot-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJSON = () => {
    playCyberClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ledger, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lunaris-autopilot-ledger-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExecuteManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (onManualTrade) {
      playTradeApprovedChime();
      onManualTrade(manualTicker, manualAction, manualUsd);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Ledger Summary Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-black/60 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>TOTAL REALIZED PNL</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#00F0FF]" />
          </div>
          <div className={`text-base sm:text-lg font-bold mt-1 ${stats.totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.totalRealizedPnl >= 0 ? '+' : ''}${stats.totalRealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Across {stats.closedTrades} closed events</div>
        </div>

        <div className="bg-black/60 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>PERSISTENT CASH BALANCE</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white mt-1">
            ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Locked & saved in browser</div>
        </div>

        <div className="bg-black/60 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>WIN RATIO</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-purple-300 mt-1">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Automated Profit Targets</div>
        </div>

        <div className="bg-black/60 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>TOTAL NOTIONAL VOLUME</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-zinc-200 mt-1">
            ${stats.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">{ledger.length} total recorded entries</div>
        </div>
      </div>

      {/* Manual Quick Action Bar (Ideal when paused) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Manual Order & Intervention Console</span>
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">Execute even while Autopilot is paused</span>
          </div>
          <div className="text-[10px] text-zinc-500">
            Directly impacts persistent Autopilot cash balance
          </div>
        </div>

        <form onSubmit={handleExecuteManual} className="flex flex-wrap items-center gap-2">
          {/* Action */}
          <div className="flex items-center rounded-lg border border-zinc-700 bg-black/60 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setManualAction('BUY')}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${manualAction === 'BUY' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setManualAction('SELL')}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${manualAction === 'SELL' ? 'bg-rose-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              SELL
            </button>
          </div>

          {/* Ticker */}
          <select
            value={manualTicker}
            onChange={(e) => setManualTicker(e.target.value)}
            className="bg-black/60 border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#00F0FF]"
          >
            <option value="BTC">BTC (Bitget Spot)</option>
            <option value="ETH">ETH (Bitget Spot)</option>
            <option value="SOL">SOL (Bitget Spot)</option>
            <option value="NVDA">NVDA (Equity)</option>
            <option value="TSLA">TSLA (Equity)</option>
            <option value="SUI">SUI (Bitget Spot)</option>
          </select>

          {/* Size Pills */}
          <div className="flex items-center gap-1">
            {[1000, 2500, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setManualUsd(amt)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                  manualUsd === amt
                    ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]'
                    : 'bg-black/40 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                ${amt / 1000}k
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
            <input
              type="number"
              min="100"
              max="50000"
              step="100"
              value={manualUsd}
              onChange={(e) => setManualUsd(Number(e.target.value) || 0)}
              className="w-24 bg-black/60 border border-zinc-700 rounded-lg pl-5 pr-2 py-1 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          {/* Execute button */}
          <button
            type="submit"
            className="ml-auto px-3 py-1 bg-[#00F0FF] hover:bg-[#38f6ff] text-black font-extrabold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            <Zap className="w-3 h-3 fill-black" />
            <span>EXECUTE {manualAction}</span>
          </button>
        </form>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'PROFIT', 'CASHOUT', 'MANUAL', 'CUT', 'RESET'].map((f) => (
            <button
              key={f}
              onClick={() => {
                playCyberClick();
                setTypeFilter(f);
              }}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-colors border ${
                typeFilter === f
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-black/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ticker, note, type..."
              className="bg-black/50 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          <button
            onClick={handleExportCSV}
            title="Download Full Ledger as CSV"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            title="Download Full Ledger as JSON"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>JSON</span>
          </button>

          {/* Protected Reset Trigger */}
          <button
            onClick={triggerResetModal}
            title="Administrative Passcode Required to Reset Balance & Ledger"
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset (Passcode)</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-black/50 border border-zinc-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs text-zinc-300 font-mono">
            <thead className="bg-zinc-900/90 text-zinc-400 text-[10px] uppercase border-b border-zinc-800 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3 text-right">Execution Price</th>
                <th className="py-2.5 px-3 text-right">Units / Notional</th>
                <th className="py-2.5 px-3 text-right">Cash Delta</th>
                <th className="py-2.5 px-3 text-right">Realized PnL</th>
                <th className="py-2.5 px-3">Trigger / Strategy Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 text-xs">
                    No ledger records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry) => {
                  const isPositive = (entry.realizedPnl || 0) >= 0;
                  return (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors text-[11px]">
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                        <div>{entry.timestamp}</div>
                        <div className="text-[9px] text-zinc-600">{entry.utcTimestamp}</div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${
                            entry.type === 'TAKE_PROFIT' || entry.type === 'AUTO_EXIT'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : entry.type === 'BUY'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              : entry.type === 'CASHOUT_ALL'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : entry.type === 'MANUAL_INTERVENTION'
                              ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/30'
                              : entry.type === 'STOP_LOSS'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap font-bold text-white">
                        {entry.ticker}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right text-zinc-200">
                        {entry.price > 0 ? `$${entry.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: entry.price > 100 ? 2 : 4 })}` : '---'}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <div className="text-zinc-200">${entry.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {entry.amount > 0 && (
                          <div className="text-[9px] text-zinc-500">{entry.amount.toFixed(4)} units</div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right text-zinc-300">
                        <div className="text-[10px] text-zinc-500">
                          ${entry.balanceBefore.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} →
                        </div>
                        <div className="font-semibold text-white">
                          ${entry.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-bold">
                        {entry.realizedPnl !== 0 ? (
                          <div className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? '+' : ''}${entry.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-[10px] ml-1 font-normal">
                              ({isPositive ? '+' : ''}{entry.realizedPnlPct.toFixed(1)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">---</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-zinc-400 max-w-xs truncate" title={entry.notes}>
                        {entry.notes}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
