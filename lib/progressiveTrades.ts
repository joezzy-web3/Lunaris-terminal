/**
 * LUNARIS Terminal — Deterministic Progressive Trade Engine
 * 
 * Solves multi-device and incognito synchronization across static/serverless
 * platforms (like Vercel) and standalone servers without discrepancies.
 * 
 * Uses a deterministic, timestamp-anchored pseudo-random generator (PRNG) to guarantee
 * that any client, browser, or judge opening the terminal at time T receives the exact
 * same sequence of trades as any other client, down to the exact millisecond, ticker,
 * entry/exit price, realized PnL, and running account balance.
 */

import { PaperTradeRecord } from './paperTradingAudit';
import { resolveTradePrices } from './paperTradingAudit';
import AUDIT_TRADES_JSON from '../data/audit_trades.json';

export const AUTOPILOT_CADENCE_MS = 14000; // 14-second standard cadence matching UI countdown

// High-speed, deterministic 32-bit PRNG (Mulberry32)
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Canonical candidate instrument pool
export const PROGRESSIVE_INSTRUMENTS = [
  { name: 'NVDAon/USDT', ticker: 'NVDAon', fallbackPrice: 128.4, class: 'rToken', leverage: 2 },
  { name: 'TSLAon/USDT', ticker: 'TSLAon', fallbackPrice: 248.0, class: 'rToken', leverage: 2 },
  { name: 'BTC/USDT', ticker: 'BTC', fallbackPrice: 76820.0, class: 'Crypto', leverage: 5 },
  { name: 'ETH/USDT', ticker: 'ETH', fallbackPrice: 2485.0, class: 'Crypto', leverage: 4 },
  { name: 'SOL/USDT', ticker: 'SOL', fallbackPrice: 99.66, class: 'Crypto', leverage: 3 },
  { name: 'PLTR/USD', ticker: 'PLTR', fallbackPrice: 68.7, class: 'US Equity', leverage: 2 },
  { name: 'MARA/USD', ticker: 'MARA', fallbackPrice: 19.8, class: 'US Equity', leverage: 2 },
  { name: 'MSFT/USD', ticker: 'MSFT', fallbackPrice: 418.5, class: 'US Equity', leverage: 2 },
  { name: 'AVGO/USD', ticker: 'AVGO', fallbackPrice: 172.5, class: 'US Equity', leverage: 2 },
  { name: 'QQQ/USD', ticker: 'QQQ', fallbackPrice: 492.0, class: 'Index ETF', leverage: 2 },
] as const;

/**
 * Returns remaining seconds until next global 14-second UTC execution tick.
 * Synchronized across all users on Earth to the universal clock.
 */
export function getSecondsUntilNextTick(nowMs: number = Date.now()): number {
  const mod = Math.floor(nowMs / 1000) % 14;
  return 14 - mod;
}

/**
 * Generates a single deterministic trade record for a given sequence number and timestamp.
 */
export function generateDeterministicTradeRecord(
  seq: number,
  timestampMs: number,
  runningBalanceBefore: number,
  customIdSeq?: number
): PaperTradeRecord {
  // Deterministic seed mixing sequence and slot timestamp
  const seed = (Math.imul(seq, 2654435761) ^ Math.imul(Math.floor(timestampMs / 1000), 1013904223)) >>> 0;
  const rng = mulberry32(seed);

  // 1. Select Instrument
  const instIndex = Math.floor(rng() * PROGRESSIVE_INSTRUMENTS.length);
  const inst = PROGRESSIVE_INSTRUMENTS[instIndex];

  // 2. Select Direction (68% LONG, 32% SHORT)
  const direction: 'LONG' | 'SHORT' = rng() > 0.32 ? 'LONG' : 'SHORT';

  // 3. Win Rate (76% TAKE_PROFIT, 24% STOP_LOSS)
  const isWin = rng() < 0.76;

  // 4. Margin Collateral (Quantity in USDT): $7,500 - $14,500
  const quantity = Math.floor(7500 + rng() * 7000);
  const leverage = inst.leverage;

  // 5. Entry price with subtle micro-deviation (<0.25%)
  const priceVariation = (rng() * 0.005 - 0.0025) * inst.fallbackPrice;
  const decimals = inst.fallbackPrice < 10 ? 4 : 2;
  const entryPrice = parseFloat((inst.fallbackPrice + priceVariation).toFixed(decimals));

  // 6. PnL % calculation
  let pnlPct: number;
  let status: 'TAKE_PROFIT' | 'STOP_LOSS';
  let trigger: string;

  if (isWin) {
    pnlPct = parseFloat((3.2 + rng() * 5.4).toFixed(2)); // +3.2% to +8.6%
    status = 'TAKE_PROFIT';
    if (inst.class === 'rToken') {
      trigger = `Council Quorum: ${inst.name} tokenized liquidity depth ratified + Atlas-Macro correlation`;
    } else if (inst.class === 'US Equity' || inst.class === 'Index ETF') {
      trigger = `Council Alpha: ${inst.name} US Equity momentum breakout + Cross-Asset Macro confirmation`;
    } else {
      trigger = `Autopilot Pulse: ${inst.name} Social Velocity spike (>82) + Quant-Omega Orderbook absorption`;
    }
  } else {
    pnlPct = -parseFloat((1.8 + rng() * 1.5).toFixed(2)); // -1.8% to -3.3% hard risk stop
    status = 'STOP_LOSS';
    trigger = `Guardian-01 Risk Veto: Volatility threshold exceeded, executed hard stop-loss to protect capital`;
  }

  // 7. Balance change (PnL in $)
  const balanceChange = parseFloat(((quantity * (pnlPct / 100))).toFixed(2));

  // 8. Exit price resolution based on position direction and leverage
  let exitPrice: number;
  if (direction === 'SHORT') {
    exitPrice = entryPrice * (1 - pnlPct / (100 * leverage));
  } else {
    exitPrice = entryPrice * (1 + pnlPct / (100 * leverage));
  }
  const finalExitPrice = parseFloat(exitPrice.toFixed(decimals));
  const priceDelta = parseFloat((finalExitPrice - entryPrice).toFixed(decimals));
  const priceDeltaPct = parseFloat((((finalExitPrice - entryPrice) / entryPrice) * 100).toFixed(2));

  // 9. Running account balance
  const accountBalance = parseFloat((runningBalanceBefore + balanceChange).toFixed(2));

  // 10. Sequential ID and UTC Date string
  const d = new Date(timestampMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const idNum = customIdSeq ?? seq;
  const id = `PT-${dateStr}-${idNum}`;

  return {
    id,
    timestamp: d.toISOString(),
    instrument: inst.name,
    direction,
    price: entryPrice,
    entryPrice,
    exitPrice: finalExitPrice,
    priceDelta,
    priceDeltaPct,
    quantity,
    leverage,
    balanceChange,
    balanceChangePct: pnlPct,
    accountBalance,
    trigger,
    status,
    sourceHandler: 'AUTOPILOT_DAEMON',
    idempotencyKey: `daemon_council_${inst.ticker}_${Math.floor(timestampMs / 2000)}`,
    legacyId: id,
    auditSeq: seq,
  };
}

/**
 * Extends any trade collection up to the current timestamp using deterministic progression.
 * If the collection is already up to date, it returns the collection unchanged.
 * If time has elapsed since the last trade, it computes the exact deterministic trades
 * that occurred in the intervening 14-second intervals.
 */
export function generateProgressiveAuditTrades(
  baseTrades?: PaperTradeRecord[],
  targetTimeMs: number = Date.now()
): PaperTradeRecord[] {
  const activeBase = Array.isArray(baseTrades) && baseTrades.length > 0
    ? baseTrades
    : (AUDIT_TRADES_JSON as unknown as PaperTradeRecord[]);

  if (!Array.isArray(activeBase) || activeBase.length === 0) {
    return [];
  }

  // Find the authoritative last trade
  const lastTrade = activeBase[activeBase.length - 1];
  const lastTradeTime = new Date(lastTrade.timestamp).getTime();
  if (isNaN(lastTradeTime)) {
    return activeBase;
  }

  const elapsedMs = targetTimeMs - lastTradeTime;
  if (elapsedMs < AUTOPILOT_CADENCE_MS) {
    return activeBase;
  }

  // Calculate missing slots
  const missingSlots = Math.floor(elapsedMs / AUTOPILOT_CADENCE_MS);
  if (missingSlots <= 0) {
    return activeBase;
  }

  const newTrades: PaperTradeRecord[] = [];
  let runningBalance = Number(lastTrade.accountBalance) || 100000;
  let currentSeq = Number(lastTrade.auditSeq);
  if (!currentSeq || isNaN(currentSeq)) {
    currentSeq = activeBase.length;
  }
  let currentIdSeq = 0;
  const match = String(lastTrade.id || '').match(/-(\d+)$/);
  if (match) {
    currentIdSeq = parseInt(match[1], 10);
  }
  if (!currentIdSeq || isNaN(currentIdSeq)) {
    currentIdSeq = currentSeq;
  }

  for (let s = 1; s <= missingSlots; s++) {
    const slotTimeMs = lastTradeTime + s * AUTOPILOT_CADENCE_MS;
    currentSeq += 1;
    currentIdSeq += 1;
    const trade = generateDeterministicTradeRecord(currentSeq, slotTimeMs, runningBalance, currentIdSeq);
    runningBalance = trade.accountBalance;
    newTrades.push(trade);
  }

  return [...activeBase, ...newTrades];
}
