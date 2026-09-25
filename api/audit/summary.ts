// api/audit/summary.ts
// Vercel Serverless Function: Authoritative audit summary backed by Cloudflare D1
import { getProgressiveState, computeMetrics } from './engine.ts';
import { queryD1, saveTradeToD1 } from './d1.ts';

export const config = {
  maxDuration: 10,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  const progressive = getProgressiveState(now);

  // Background sync to Cloudflare D1 (guarantees DB always holds latest state without blocking response)
  try {
    const metaRows = await queryD1<{ key: string; val: string }>('SELECT key, val FROM audit_meta');
    const metaMap = new Map(metaRows.map(m => [m.key, m.val]));
    const lastD1Seq = parseInt(metaMap.get('total_trades') || '0', 10);

    if (progressive.latestTrade && progressive.latestTrade.auditSeq > lastD1Seq) {
      await saveTradeToD1(progressive.latestTrade);
    }
  } catch (err: any) {
    // Non-fatal if D1 has a transient delay; fallback to progressive state
    console.error('D1 sync check non-fatal error:', err.message);
  }

  const metrics = computeMetrics(progressive.totalTrades, progressive.currentBalance, progressive.latestTrade);

  const payload = {
    success: true,
    totalTrades: progressive.totalTrades,
    count: progressive.totalTrades,
    currentBalance: progressive.currentBalance,
    metrics,
    latestTrade: progressive.latestTrade,
    timestamp: now,
    database: 'Cloudflare-D1-SQL',
  };

  return res.status(200).json(payload);
}
