// api/audit/trigger-daemon.ts
// Vercel Serverless Function: Trigger/retrieve latest authoritative trade backed by Cloudflare D1
import { getProgressiveState } from './engine.ts';
import { saveTradeToD1 } from './d1.ts';

export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  const state = getProgressiveState(now);

  // Write newly generated authoritative trade to Cloudflare D1
  if (state.latestTrade) {
    try {
      await saveTradeToD1(state.latestTrade);
    } catch (e: any) {
      console.error('Non-fatal D1 write error in trigger-daemon:', e.message);
    }
  }

  return res.status(200).json({
    success: true,
    trade: state.latestTrade,
    count: state.totalTrades,
    currentBalance: state.currentBalance,
    timestamp: now,
    database: 'Cloudflare-D1-SQL',
  });
}
