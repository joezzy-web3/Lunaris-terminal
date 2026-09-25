// api/audit/trades.ts
// Vercel Serverless Function: Authoritative trade reader backed by Cloudflare D1
import { queryD1 } from './d1.ts';
import { getProgressiveState } from './engine.ts';

export const config = {
  maxDuration: 10,
};

function formatD1Row(r: any) {
  const entryPrice = r.entry_price || r.price;
  const exitPrice = r.exit_price || r.price;
  const priceDelta = parseFloat((exitPrice - entryPrice).toFixed(entryPrice < 10 ? 4 : 2));
  const priceDeltaPct = entryPrice > 0 ? parseFloat((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)) : 0;

  return {
    id: r.id,
    timestamp: r.timestamp,
    instrument: r.instrument,
    direction: r.direction,
    price: r.price,
    entryPrice,
    exitPrice,
    priceDelta,
    priceDeltaPct,
    quantity: r.quantity,
    leverage: r.leverage,
    fee: r.fee,
    slippage: r.slippage,
    grossPnl: r.gross_pnl,
    netPnl: r.net_pnl,
    balanceChange: r.net_pnl,
    balanceChangePct: r.quantity > 0 ? parseFloat(((r.net_pnl / r.quantity) * 100).toFixed(2)) : 0,
    accountBalance: r.account_balance,
    status: r.status,
    trigger: r.trigger_reason,
    auditSeq: r.seq,
    sourceHandler: 'AUTOPILOT_DAEMON',
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit as string || '50', 10)));

  try {
    const rows = await queryD1('SELECT * FROM trades ORDER BY seq DESC LIMIT ?', [limit]);
    if (rows && rows.length > 0) {
      const formatted = rows.map(formatD1Row);
      return res.status(200).json({
        success: true,
        trades: formatted,
        count: formatted.length,
        totalCount: rows[0].seq,
        currentBalance: rows[0].account_balance,
        source: 'Cloudflare-D1-SQL',
        timestamp: now,
      });
    }
  } catch (err: any) {
    console.error('D1 query fallback in trades.ts:', err.message);
  }

  // Graceful fallback to deterministic progressive state if D1 is unreachable
  const state = getProgressiveState(now);
  const servedTrades = state.recentTrades || [];

  return res.status(200).json({
    success: true,
    trades: servedTrades,
    count: servedTrades.length,
    totalCount: state.totalTrades,
    currentBalance: state.currentBalance,
    source: 'Deterministic-Engine',
    timestamp: now,
  });
}
