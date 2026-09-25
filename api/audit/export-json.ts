// api/audit/export-json.ts
// Vercel Serverless Function: Download full audit trail as JSON file
import AUDIT_TRADES_JSON from '../../data/seed_audit_trades.json';
import { getProgressiveState, computeMetrics } from './engine.ts';

export const config = {
  maxDuration: 15,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="lunaris_bitget_s2_trade_audit.json"');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  const state = getProgressiveState(now);
  const baseTrades = (AUDIT_TRADES_JSON as any[]) || [];

  // Merge seed trades with any progressive trades up to the current sequence
  const latestTrades = state.recentTrades || [];
  const existingIds = new Set(baseTrades.map(t => t.id));
  const newTrades = latestTrades.filter(t => !existingIds.has(t.id));
  const allTrades = [...baseTrades, ...newTrades];

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
