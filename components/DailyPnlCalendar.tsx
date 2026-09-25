import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FilterX,
  TrendingUp,
  Award,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { PaperTradeRecord } from '../lib/paperTradingAudit';

interface DailyPnlCalendarProps {
  trades: PaperTradeRecord[];
  selectedDate: string | null; // e.g. "2026-09-08" or null
  onSelectDate: (date: string | null) => void;
}

export const DailyPnlCalendar: React.FC<DailyPnlCalendarProps> = ({
  trades,
  selectedDate,
  onSelectDate,
}) => {
  // Active month navigation: "YYYY-MM" (defaults to current competition month: 2026-09)
  const [currentYearMonth, setCurrentYearMonth] = useState('2026-09');
  const [viewMode, setViewMode] = useState<'calendar' | 'chart'>('calendar');
  const [hoveredDayData, setHoveredDayData] = useState<{
    dateStr: string;
    netPnl: number;
    count: number;
    wins: number;
    losses: number;
  } | null>(null);

  const [currentYear, currentMonth] = useMemo(() => {
    const parts = currentYearMonth.split('-');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }, [currentYearMonth]);

  // Aggregate trades by date string "YYYY-MM-DD"
  const dailyAggregation = useMemo(() => {
    const map = new Map<
      string,
      {
        netPnl: number;
        trades: PaperTradeRecord[];
        wins: number;
        losses: number;
      }
    >();

    trades.forEach((trade) => {
      // Resolve execution date string
      let dateKey = '';
      if (trade.timestamp) {
        dateKey = trade.timestamp.slice(0, 10);
      } else if (trade.id) {
        const match = trade.id.match(/PT-(\d{4})-?(\d{2})(\d{2})/i);
        if (match) {
          dateKey = `${match[1]}-${match[2]}-${match[3]}`;
        }
      }

      if (!dateKey || isNaN(new Date(dateKey).getTime())) {
        return;
      }

      const existing = map.get(dateKey) || {
        netPnl: 0,
        trades: [],
        wins: 0,
        losses: 0,
      };

      const change = Number(trade.balanceChange) || 0;
      existing.netPnl = parseFloat((existing.netPnl + change).toFixed(2));
      existing.trades.push(trade);
      if (change > 0) {
        existing.wins++;
      } else if (change < 0) {
        existing.losses++;
      }

      map.set(dateKey, existing);
    });

    return map;
  }, [trades]);

  // Monthly summary metrics
  const monthlyStats = useMemo(() => {
    let totalMonthPnl = 0;
    let profitableDays = 0;
    let losingDays = 0;
    let bestDay = { date: '', pnl: -Infinity };
    let worstDay = { date: '', pnl: Infinity };

    dailyAggregation.forEach((data, dateStr) => {
      if (dateStr.startsWith(currentYearMonth)) {
        totalMonthPnl += data.netPnl;
        if (data.netPnl > 0) {
          profitableDays++;
        } else if (data.netPnl < 0) {
          losingDays++;
        }

        if (data.netPnl > bestDay.pnl) {
          bestDay = { date: dateStr, pnl: data.netPnl };
        }
        if (data.netPnl < worstDay.pnl) {
          worstDay = { date: dateStr, pnl: data.netPnl };
        }
      }
    });

    const activeTradingDays = profitableDays + losingDays;
    const winRate = activeTradingDays > 0 ? (profitableDays / activeTradingDays) * 100 : 0;

    return {
      totalMonthPnl: parseFloat(totalMonthPnl.toFixed(2)),
      profitableDays,
      losingDays,
      activeTradingDays,
      winRate: parseFloat(winRate.toFixed(1)),
      bestDay: bestDay.pnl !== -Infinity ? bestDay : null,
      worstDay: worstDay.pnl !== Infinity ? worstDay : null,
    };
  }, [dailyAggregation, currentYearMonth]);

  // Calendar matrix calculations
  const calendarCells = useMemo(() => {
    // Number of days in current month
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    // Day of week for 1st of month: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();

    const cells: Array<{
      dayNumber: number | null;
      dateStr: string | null;
      hasTrades: boolean;
      netPnl: number;
      count: number;
      wins: number;
      losses: number;
    }> = [];

    // Preceding empty slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({
        dayNumber: null,
        dateStr: null,
        hasTrades: false,
        netPnl: 0,
        count: 0,
        wins: 0,
        losses: 0,
      });
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(currentMonth).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

      const dayData = dailyAggregation.get(dateStr);
      if (dayData && dayData.trades.length > 0) {
        cells.push({
          dayNumber: d,
          dateStr,
          hasTrades: true,
          netPnl: dayData.netPnl,
          count: dayData.trades.length,
          wins: dayData.wins,
          losses: dayData.losses,
        });
      } else {
        cells.push({
          dayNumber: d,
          dateStr,
          hasTrades: false,
          netPnl: 0,
          count: 0,
          wins: 0,
          losses: 0,
        });
      }
    }

    return cells;
  }, [currentYear, currentMonth, dailyAggregation]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonth - 1;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setCurrentYearMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let nextY = currentYear;
    let nextM = currentMonth + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setCurrentYearMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
  };

  // Compact number formatter for calendar pills (+1.41M, +1.35K, -30.99, +820.99)
  const formatPnlCompact = (val: number): string => {
    if (!Number.isFinite(val)) return '—';
    if (val === 0) return '$0';
    const isPositive = val > 0;
    const sign = isPositive ? '+' : val < 0 ? '-' : '';
    const absVal = Math.abs(val);

    if (absVal >= 1_000_000_000) {
      const bVal = (absVal / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
      return `${sign}${bVal}B`;
    } else if (absVal >= 1_000_000) {
      const mVal = (absVal / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
      return `${sign}${mVal}M`;
    } else if (absVal >= 1_000) {
      const kVal = (absVal / 1_000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
      return `${sign}${kVal}K`;
    } else {
      return `${sign}${absVal.toFixed(2).replace(/\.00$/, '')}`;
    }
  };

  return (
    <div className="bg-[#0b0c14] border border-white/10 rounded-2xl p-4 sm:p-5 text-white font-sans shadow-xl">
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Daily PNL
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
              Realized Settled
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Institutional day-by-day PnL reconciliation & historical ledger distribution
          </p>
        </div>

        {/* View Toggle Icons */}
        <div className="flex items-center gap-1.5 bg-[#121422] p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setViewMode('calendar')}
            title="Calendar Grid View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'calendar'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('chart')}
            title="Distribution Bar Chart View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'chart'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Navigation Banner */}
      <div className="flex items-center justify-center gap-3 py-1.5 mb-4 border-y border-white/5">
        <button
          onClick={handlePrevMonth}
          className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer hover:bg-white/5 rounded"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm sm:text-base font-bold font-mono tracking-wide text-gray-200">
          {currentYearMonth}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer hover:bg-white/5 rounded"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Date Filter Banner (if active) */}
      {selectedDate && (
        <div className="mb-4 bg-cyan-950/40 border border-cyan-500/40 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              Filtering Audit Ledger for <strong className="text-white">{selectedDate}</strong>
              {dailyAggregation.has(selectedDate) && (
                <>
                  {' '}(Net:{' '}
                  <span
                    className={
                      dailyAggregation.get(selectedDate)!.netPnl >= 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-rose-400 font-bold'
                    }
                  >
                    {dailyAggregation.get(selectedDate)!.netPnl >= 0 ? '+' : ''}$
                    {dailyAggregation.get(selectedDate)!.netPnl.toLocaleString()}
                  </span>
                  {' '}· {dailyAggregation.get(selectedDate)!.trades.length} trades)
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => onSelectDate(null)}
            className="flex items-center gap-1 text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 px-2 py-1 rounded transition-colors"
          >
            <FilterX className="w-3 h-3" />
            Clear Filter
          </button>
        </div>
      )}

      {/* VIEW A: Calendar Grid View */}
      {viewMode === 'calendar' && (
        <div className="space-y-2">
          {/* Day of week labels */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-mono font-semibold text-gray-400 py-1">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Calendar Grid (7 columns) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell, idx) => {
              if (cell.dayNumber === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[58px] sm:min-h-[66px] rounded-xl bg-transparent"
                  />
                );
              }

              const isSelected = selectedDate === cell.dateStr;

              if (cell.hasTrades) {
                const isPositive = cell.netPnl >= 0;
                return (
                  <button
                    key={`day-${cell.dayNumber}`}
                    onClick={() => {
                      if (cell.dateStr) {
                        onSelectDate(isSelected ? null : cell.dateStr);
                      }
                    }}
                    onMouseEnter={() => {
                      if (cell.dateStr) {
                        setHoveredDayData({
                          dateStr: cell.dateStr,
                          netPnl: cell.netPnl,
                          count: cell.count,
                          wins: cell.wins,
                          losses: cell.losses,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredDayData(null)}
                    className={`min-h-[58px] sm:min-h-[66px] rounded-xl p-1.5 sm:p-2 flex flex-col justify-between text-left transition-all duration-150 cursor-pointer relative group ${
                      isPositive
                        ? 'bg-[#0d281e]/90 hover:bg-[#133528] border border-emerald-500/35 hover:border-emerald-400/60 shadow-[0_2px_8px_rgba(16,185,129,0.06)]'
                        : 'bg-[#2a1215]/90 hover:bg-[#38181c] border border-rose-500/35 hover:border-rose-400/60 shadow-[0_2px_8px_rgba(244,63,94,0.06)]'
                    } ${
                      isSelected
                        ? 'ring-2 ring-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-[1.03] z-10'
                        : ''
                    }`}
                  >
                    {/* Day number header */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-[11px] sm:text-xs font-semibold ${
                          isPositive ? 'text-emerald-200/90' : 'text-rose-200/90'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 font-mono">
                        {cell.count}t
                      </span>
                    </div>

                    {/* Net PnL number */}
                    <div className="mt-auto">
                      <span
                        className={`text-[11px] sm:text-xs md:text-sm font-bold font-mono tracking-tight ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPnlCompact(cell.netPnl)}
                      </span>
                    </div>
                  </button>
                );
              }

              // Days without trades: styled neutral frame so the calendar grid remains visually balanced and never looks cropped
              return (
                <div
                  key={`day-${cell.dayNumber}`}
                  className="min-h-[58px] sm:min-h-[66px] rounded-xl p-1.5 sm:p-2 flex flex-col justify-between border border-white/[0.04] bg-white/[0.015] text-gray-600 hover:border-white/10 transition-colors"
                >
                  <span className="text-[11px] sm:text-xs font-mono font-medium text-gray-500">{cell.dayNumber}</span>
                  <div className="mt-auto text-center">
                    <span className="text-[10px] sm:text-xs font-mono text-gray-700">—</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: Bar Chart Distribution View */}
      {viewMode === 'chart' && (
        <div className="pt-2 pb-1">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Daily Realized PnL Progression ({currentYearMonth})</span>
            <span className="font-mono text-[11px]">Click any bar to filter ledger</span>
          </div>

          {/* Responsive SVG Bar Chart */}
          <div className="w-full h-44 bg-[#080910] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
            {(() => {
              // Extract all trading days in this month
              const activeDays = Array.from(dailyAggregation.entries())
                .filter(([date]) => date.startsWith(currentYearMonth))
                .sort(([a], [b]) => a.localeCompare(b));

              if (activeDays.length === 0) {
                return (
                  <div className="h-full flex items-center justify-center text-gray-500 text-xs font-mono">
                    No settled trading activity recorded for {currentYearMonth}
                  </div>
                );
              }

              const maxAbs = Math.max(
                ...activeDays.map(([, d]) => Math.abs(d.netPnl)),
                100
              );

              return (
                <div className="h-full flex items-end justify-between gap-1 sm:gap-2 px-1 relative">
                  {/* Zero axis guide */}
                  <div className="absolute left-0 right-0 top-1/2 border-b border-white/10 z-0 pointer-events-none" />

                  {activeDays.map(([dateStr, data]) => {
                    const isPositive = data.netPnl >= 0;
                    const heightPct = Math.min(
                      48,
                      Math.max(6, (Math.abs(data.netPnl) / maxAbs) * 45)
                    );
                    const isSelected = selectedDate === dateStr;
                    const dayNum = dateStr.slice(8);

                    return (
                      <div
                        key={dateStr}
                        onClick={() => onSelectDate(isSelected ? null : dateStr)}
                        className="flex-1 flex flex-col items-center justify-center h-full relative group cursor-pointer z-10"
                      >
                        {/* Upper half bar (Positive) */}
                        <div className="w-full flex-1 flex items-end justify-center">
                          {isPositive && (
                            <div
                              style={{ height: `${heightPct * 2}%` }}
                              className={`w-full max-w-[28px] rounded-t-sm transition-all ${
                                isSelected
                                  ? 'bg-cyan-400 ring-2 ring-[#00F0FF]'
                                  : 'bg-emerald-500 hover:bg-emerald-400'
                              }`}
                            />
                          )}
                        </div>

                        {/* Lower half bar (Negative) */}
                        <div className="w-full flex-1 flex items-start justify-center">
                          {!isPositive && (
                            <div
                              style={{ height: `${heightPct * 2}%` }}
                              className={`w-full max-w-[28px] rounded-b-sm transition-all ${
                                isSelected
                                  ? 'bg-cyan-400 ring-2 ring-[#00F0FF]'
                                  : 'bg-rose-500 hover:bg-rose-400'
                              }`}
                            />
                          )}
                        </div>

                        {/* Day label */}
                        <span className="text-[10px] font-mono text-gray-400 mt-1">
                          {dayNum}
                        </span>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-black/90 border border-white/20 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-30 shadow-xl">
                          <div>{dateStr}</div>
                          <div className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? '+' : ''}${data.netPnl.toLocaleString()}
                          </div>
                          <div className="text-gray-400">{data.trades.length} trades</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Monthly Performance Summary Ribbon */}
      <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs font-mono">
        <div className="bg-[#121422] p-2.5 rounded-xl border border-white/5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Month Net PnL</p>
          <p
            className={`text-sm font-bold mt-0.5 ${
              monthlyStats.totalMonthPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {monthlyStats.totalMonthPnl >= 0 ? '+' : ''}$
            {monthlyStats.totalMonthPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-[#121422] p-2.5 rounded-xl border border-white/5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Trading Win Rate</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">
            {monthlyStats.winRate}%{' '}
            <span className="text-[10px] text-gray-400 font-normal">
              ({monthlyStats.profitableDays}W / {monthlyStats.losingDays}L)
            </span>
          </p>
        </div>

        <div className="bg-[#121422] p-2.5 rounded-xl border border-white/5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Best Day</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">
            {monthlyStats.bestDay
              ? `+$${monthlyStats.bestDay.pnl.toLocaleString()} (${monthlyStats.bestDay.date.slice(5)})`
              : '—'}
          </p>
        </div>

        <div className="bg-[#121422] p-2.5 rounded-xl border border-white/5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Worst Day</p>
          <p className="text-sm font-bold text-rose-400 mt-0.5">
            {monthlyStats.worstDay
              ? `-$${Math.abs(monthlyStats.worstDay.pnl).toLocaleString()} (${monthlyStats.worstDay.date.slice(5)})`
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
};
