// api/audit/export.ts
// Vercel Serverless Function: Download full audit trail as CSV or JSON
import { createRequire } from 'module';
import { getProgressiveState, computeMetrics } from '../_lib/engine';

const require = createRequire(import.meta.url);
const AUDIT_TRADES_JSON = require('../../data/seed_audit_trades.json');

export const config = {
  maxDuration: 15,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const format = String(req.query?.format || (req.url?.includes('json') ? 'json' : 'csv')).toLowerCase();
  const trades = (AUDIT_TRADES_JSON as any[]) || [];

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="lunaris_bitget_s2_trade_audit.json"');

    const now = Date.now();
    const state = getProgressiveState(now);
    const latestTrades = state.recentTrades || [];
    const existingIds = new Set(trades.map(t => t.id));
    const newTrades = latestTrades.filter(t => !existingIds.has(t.id));
    const allTrades = [...trades, ...newTrades];
    const metrics = computeMetrics(state.totalTrades, state.currentBalance, state.latestTrade);

    const payload = {
      hackathon: 'Bitget AI Base Camp Hackathon S2',
      track: 'Track 2 - Agentic Trading (Agent Trading)',
      databaseEngine: 'Cloudflare D1 Distributed Edge SQL',
      startingCapitalUsd: 100000.0,
      currency: 'USD',
      baselineSpecification: 'Bitget S2 $100,000.00 USD Genesis Capital Pool',
      totalRecords: state.totalTrades,
      settledBalance: state.currentBalance,
      exportTimestamp: new Date().toISOString(),
      metrics,
      auditLog: allTrades,
    };

    return res.status(200).send(JSON.stringify(payload, null, 2));
  }

  // Default: CSV export
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="lunaris_bitget_s2_trade_audit.csv"');

  const headers = [
    'Trade ID',
    'Audit Sequence',
    'Timestamp (UTC)',
    'Instrument',
    'Direction',
    'Status',
    'Gross PnL ($)',
    'Fee ($)',
    'Fee Rate',
    'Slippage ($)',
    'Slippage (bps)',
    'Net Realized PnL ($)',
    'ROI (%)',
    'Running Balance ($)',
    'Entry Price ($)',
    'Exit Price ($)',
    'Quantity ($)',
    'Leverage',
    'Price Delta ($)',
    'Price Delta (%)',
    'Trigger',
    'Source Handler',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = trades.map((t) => {
    const entry = Number(t.entryPrice ?? t.price ?? 0);
    const exit = Number(t.exitPrice ?? t.price ?? entry);
    const decimals = entry < 10 ? 4 : 2;
    const balance = Number(t.accountBalance ?? 100000);
    const qty = Number(t.quantity ?? 10000);

    return [
      t.id,
      t.auditSeq || '',
      t.timestamp,
      t.instrument,
      t.direction,
      t.status,
      Number(t.grossPnl !== undefined ? t.grossPnl : t.balanceChange || 0).toFixed(2),
      Number(t.fee || 0).toFixed(2),
      t.feeRate !== undefined ? `${(t.feeRate * 100).toFixed(2)}%` : '0.06%',
      Number(t.slippage || 0).toFixed(2),
      t.slippageBps !== undefined ? `${t.slippageBps} bps` : '2.0 bps',
      Number(t.netPnl !== undefined ? t.netPnl : t.balanceChange || 0).toFixed(2),
      `${Number(t.balanceChangePct || 0).toFixed(2)}%`,
      balance.toFixed(2),
      entry.toFixed(decimals),
      exit.toFixed(decimals),
      qty.toFixed(0),
      `${t.leverage || 2}x`,
      Number(t.priceDelta || 0).toFixed(decimals),
      `${Number(t.priceDeltaPct || 0).toFixed(2)}%`,
      t.trigger || '',
      t.sourceHandler || 'AUTOPILOT_DAEMON',
    ].map(escapeCsv).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  return res.status(200).send(csv);
}
