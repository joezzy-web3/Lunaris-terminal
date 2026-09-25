// lib/d1TradeSync.ts
/**
 * Cloudflare D1 Trade Repository
 * Bridges the audit engine to Cloudflare D1 SQL database.
 */
import { executeD1Query, D1TradeRow } from './cloudflareD1.ts';
import { getProgressiveState } from '../api/audit/engine.ts';

export function rowToPaperTrade(r: D1TradeRow) {
  const entryPrice = r.entry_price || r.price;
  const exitPrice = r.exit_price || r.price;
  const priceDelta = parseFloat((exitPrice - entryPrice).toFixed(entryPrice < 10 ? 4 : 2));
  const priceDeltaPct = entryPrice > 0 ? parseFloat((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2)) : 0;
  const balanceChange = r.net_pnl;
  const balanceChangePct = r.quantity > 0 ? parseFloat(((r.net_pnl / r.quantity) * 100).toFixed(2)) : 0;

  return {
    id: r.id,
    timestamp: r.timestamp,
    instrument: r.instrument,
    direction: r.direction as 'LONG' | 'SHORT',
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
    balanceChange,
    balanceChangePct,
    accountBalance: r.account_balance,
    status: r.status as 'TAKE_PROFIT' | 'STOP_LOSS' | 'CLOSED',
    trigger: r.trigger_reason,
    auditSeq: r.seq,
    sourceHandler: 'AUTOPILOT_DAEMON' as const,
  };
}

export async function insertTradeToD1(t: any): Promise<boolean> {
  const sql = `
    INSERT OR IGNORE INTO trades (
      id, seq, timestamp, instrument, direction, price,
      entry_price, exit_price, quantity, leverage, fee,
      slippage, gross_pnl, net_pnl, account_balance, status, trigger_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    t.id,
    t.auditSeq,
    t.timestamp,
    t.instrument,
    t.direction,
    t.price,
    t.entryPrice,
    t.exitPrice,
    t.quantity,
    t.leverage,
    t.fee,
    t.slippage,
    t.grossPnl,
    t.netPnl,
    t.accountBalance,
    t.status,
    t.trigger || '',
  ];

  try {
    await executeD1Query(sql, params);
    await executeD1Query(
      `INSERT OR REPLACE INTO audit_meta (key, val) VALUES ('total_trades', ?), ('current_balance', ?), ('last_updated', ?)`,
      [String(t.auditSeq), String(t.accountBalance), new Date().toISOString()]
    );
    return true;
  } catch (err: any) {
    console.error('Failed to insert trade into D1:', err.message);
    return false;
  }
}

export async function getD1Summary() {
  try {
    // 1. Fetch latest row
    const latestRows = await executeD1Query<D1TradeRow>(
      'SELECT * FROM trades ORDER BY seq DESC LIMIT 1'
    );
    // 2. Fetch meta
    const metaRows = await executeD1Query<{ key: string; val: string }>(
      'SELECT key, val FROM audit_meta'
    );

    const metaMap = new Map(metaRows.map(m => [m.key, m.val]));
    const totalTrades = parseInt(metaMap.get('total_trades') || '0', 10);
    const currentBalance = parseFloat(metaMap.get('current_balance') || '0');

    if (latestRows.length > 0 && totalTrades > 0) {
      return {
        totalTrades,
        currentBalance,
        latestTrade: rowToPaperTrade(latestRows[0]),
      };
    }
  } catch (e: any) {
    console.error('Error fetching summary from D1:', e.message);
  }
  return null;
}

export async function getD1Trades(limit: number = 50) {
  try {
    const rows = await executeD1Query<D1TradeRow>(
      'SELECT * FROM trades ORDER BY seq DESC LIMIT ?',
      [limit]
    );
    return rows.map(rowToPaperTrade);
  } catch (e: any) {
    console.error('Error fetching trades from D1:', e.message);
    return [];
  }
}

/**
 * Ensures D1 is caught up with the active slot window and writes any missing trades
 */
export async function syncD1WithLatest(): Promise<{
  totalTrades: number;
  currentBalance: number;
  latestTrade: any;
}> {
  const progressive = getProgressiveState(Date.now());

  // Check latest seq in D1
  let maxSeq = 0;
  try {
    const res = await executeD1Query<{ max_seq: number | null }>('SELECT MAX(seq) as max_seq FROM trades');
    maxSeq = res[0]?.max_seq || 0;
  } catch {}

  // If D1 is behind the active slot, insert the missing recent trades
  if (maxSeq < progressive.totalTrades && progressive.recentTrades) {
    const missing = progressive.recentTrades.filter((t: any) => t.auditSeq > maxSeq);
    for (const t of missing) {
      await insertTradeToD1(t);
    }
  }

  // Return the authoritative latest
  const d1Summary = await getD1Summary();
  if (d1Summary && d1Summary.totalTrades > 0) {
    return d1Summary;
  }

  return {
    totalTrades: progressive.totalTrades,
    currentBalance: progressive.currentBalance,
    latestTrade: progressive.latestTrade,
  };
}
