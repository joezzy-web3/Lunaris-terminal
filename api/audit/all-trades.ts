// api/audit/all-trades.ts
// Vercel Serverless Function: Export audit trades backup
import { getProgressiveState } from './engine.ts';

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

  // Optional proxy if custom external backend configured
  const backendUrl = process.env.BACKEND_API_URL;
  if (backendUrl) {
    try {
      const url = `${backendUrl.replace(/\/$/, '')}/api/audit/all-trades${req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(2500),
      });
      if (resp.ok) {
        const json = await resp.json();
        return res.status(200).json(json);
      }
    } catch {}
  }

  const now = Date.now();
  const state = getProgressiveState(now);
  const served = state.recentTrades || [];

  return res.status(200).json({
    success: true,
    trades: served,
    count: served.length,
    totalCount: state.totalTrades,
    currentBalance: state.currentBalance,
    timestamp: now,
  });
}
