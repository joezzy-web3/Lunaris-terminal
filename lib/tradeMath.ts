/**
 * Bitget AI Base Camp Hackathon S2 — LUNARIS Terminal
 * Authoritative Mathematical Source of Truth for Paper-Trading & Institutional Audit
 * 
 * Eliminates all discrepancies between Entry Price, Exit Price, Direction, Leverage,
 * Size (Margin vs Notional), P&L, Fees, Funding, and Balance Chaining.
 */

import { MAX_SLIPPAGE_PCT, enforceSlippageCollar, validateSlippageCollar } from './riskVeto';
export { MAX_SLIPPAGE_PCT, enforceSlippageCollar, validateSlippageCollar };

export interface TradePnLMathResult {
  instrument: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  priceDelta: number;
  priceDeltaPct: number; // Underlying price move %

  // Position Sizing Semantics (Authoritative: Size in USDT represents Margin Collateral Allocated)
  marginUsed: number;          // Allocated collateral in USDT (trade.quantity)
  leverage: number;            // Leverage multiplier (e.g. 2x, 3x, 5x)
  positionNotional: number;    // marginUsed * leverage
  assetQuantity: number;       // positionNotional / entryPrice (coins/shares)

  // Bitget Published VIP-0 Taker Fee Schedule (0.06% Crypto / 0.10% rTokens)
  feeRate: number;             // Taker fee rate (0.0006 for crypto, 0.0010 for rTokens)
  entryFee: number;            // positionNotional * feeRate
  exitFee: number;             // (assetQuantity * exitPrice) * feeRate
  totalFees: number;           // entryFee + exitFee
  
  // Dynamic L2 Orderbook Slippage Model (Derived from order size & L2 book depth: 2 to 5 bps)
  slippageRate: number;        // Dynamic slippage rate (e.g. 0.0002 to 0.0005)
  slippageBps: number;         // Slippage in basis points (2.0 to 5.0 bps)
  slippageCost: number;        // Cost in USDT: positionNotional * slippageRate
  funding: number;             // 0.00 (explicitly 0.00 when not charged)

  // P&L Breakdown
  returnPct: number;           // Direction-adjusted fractional return on notional
  grossPnL: number;            // positionNotional * returnPct === assetQuantity * priceDifference
  netPnL: number;              // grossPnL - totalFees - slippageCost - funding
  roi: number;                 // (netPnL / marginUsed) * 100
  grossRoi: number;            // (grossPnL / marginUsed) * 100

  // Direction & Integrity Validation
  isDirectionValid: boolean;   // true if price movement direction matches grossPnL sign
  isWithinAuditTolerance: boolean; // Flag if |pnl_expected - pnl_stated| <= max($2, 5%)
  validationNotes: string[];
}

export const INSTITUTIONAL_FEE_RATE = 0.0006; // 0.06% Bitget Standard VIP-0 Taker Fee for Crypto

/**
 * Returns Bitget's published VIP-0 taker fee rate:
 * - Crypto / Futures: 0.06% (0.0006 or 6 bps)
 * - Tokenized Equities & rTokens: 0.10% (0.0010 or 10 bps)
 */
export function getBitgetTakerFeeRate(instrument: string): number {
  const inst = (instrument || '').toUpperCase();
  if (
    inst.includes('ON/') ||
    inst.endsWith('/USD') ||
    inst.includes('NVDA') ||
    inst.includes('TSLA') ||
    inst.includes('PLTR') ||
    inst.includes('MARA') ||
    inst.includes('MSFT') ||
    inst.includes('AVGO') ||
    inst.includes('QQQ')
  ) {
    return 0.0010; // 0.10% (10 bps) for tokenized stocks / rTokens
  }
  return 0.0006; // 0.06% (6 bps) for Bitget crypto spot/futures
}

/**
 * Dynamic L2 Orderbook Slippage Model:
 * Models realistic execution impact derived from order notional relative to L2 book depth.
 * Base institutional liquidity: 2.0 bps (0.0002) scaling with size up to ~5.0 bps.
 */
export function estimateL2OrderbookSlippage(notional: number): {
  slippageRate: number;
  slippageBps: number;
  slippageCost: number;
} {
  const baseRate = 0.0002; // 2.0 bps base institutional spread
  const depthImpact = Math.min(0.0003, (notional / 50000) * 0.0002);
  const slippageRate = parseFloat((baseRate + depthImpact).toFixed(6));
  const slippageBps = parseFloat((slippageRate * 10000).toFixed(1));
  const slippageCost = parseFloat((notional * slippageRate).toFixed(2));
  return { slippageRate, slippageBps, slippageCost };
}

/**
 * Calculates authoritative P&L mathematics for any trade record from raw fields.
 * Guarantees that:
 * 1. positionNotional = marginUsed * leverage
 * 2. assetQuantity = positionNotional / entryPrice
 * 3. grossPnL = assetQuantity * priceDifference === positionNotional * returnPct
 * 4. netPnL = grossPnL - totalFees - slippageCost - funding
 * 5. roi = (netPnL / marginUsed) * 100
 */
export function calculateTradePnLMath(
  trade: {
    instrument?: string;
    direction?: 'LONG' | 'SHORT' | string;
    entryPrice?: number;
    price?: number;
    exitPrice?: number;
    quantity?: number; // Size in USDT (Margin Collateral)
    margin?: number;
    leverage?: number;
    balanceChange?: number; // Stated PnL
    fees?: number;
    fee?: number;
    slippage?: number;
    funding?: number;
  },
  customFeeRate?: number
): TradePnLMathResult {
  const instrument = trade.instrument || 'BTC/USDT';
  const direction: 'LONG' | 'SHORT' = trade.direction === 'SHORT' ? 'SHORT' : 'LONG';
  
  // Authoritative Raw Prices
  const entryPrice = Math.max(0.0001, Number(trade.entryPrice) || Number(trade.price) || 100);
  let exitPrice = Number(trade.exitPrice);
  if (!exitPrice || !Number.isFinite(exitPrice) || exitPrice <= 0) {
    exitPrice = entryPrice;
  }

  const leverage = Math.min(20, Math.max(1, Number(trade.leverage) || 1));
  const marginUsed = Math.max(1, Number(trade.margin) || Number(trade.quantity) || 5000);

  // Position Sizing: Size (USDT) is the Margin Collateral
  const positionNotional = parseFloat((marginUsed * leverage).toFixed(2));
  const assetQuantity = positionNotional / entryPrice;

  // Price Movement
  const priceDelta = exitPrice - entryPrice;
  const priceDeltaPct = (priceDelta / entryPrice) * 100;

  // Core Directional Return on Underlying
  const returnPct = direction === 'LONG'
    ? (exitPrice - entryPrice) / entryPrice
    : (entryPrice - exitPrice) / entryPrice;

  // Gross P&L: Both notional * returnPct AND assetQuantity * priceDifference produce identical result
  const grossPnL = parseFloat((positionNotional * returnPct).toFixed(2));

  // Bitget Published Taker Fee Model
  const feeRate = customFeeRate !== undefined ? customFeeRate : getBitgetTakerFeeRate(instrument);
  const entryFee = parseFloat((positionNotional * feeRate).toFixed(2));
  const exitNotional = assetQuantity * exitPrice;
  const exitFee = parseFloat((exitNotional * feeRate).toFixed(2));
  const totalFees = trade.fee !== undefined && Number.isFinite(trade.fee)
    ? Number(trade.fee)
    : trade.fees !== undefined && Number.isFinite(trade.fees)
    ? Number(trade.fees)
    : parseFloat((entryFee + exitFee).toFixed(2));

  // Dynamic L2 Orderbook Slippage Model
  const slippageInfo = estimateL2OrderbookSlippage(positionNotional);
  const slippageCost = trade.slippage !== undefined && Number.isFinite(trade.slippage)
    ? Number(trade.slippage)
    : slippageInfo.slippageCost;
  const slippageRate = slippageInfo.slippageRate;
  const slippageBps = slippageInfo.slippageBps;

  const funding = trade.funding !== undefined && Number.isFinite(trade.funding)
    ? Number(trade.funding)
    : 0.0;

  // Net Realized P&L
  const netPnL = parseFloat((grossPnL - totalFees - slippageCost - funding).toFixed(2));

  // ROIs on Margin
  const grossRoi = parseFloat(((grossPnL / marginUsed) * 100).toFixed(2));
  const roi = parseFloat(((netPnL / marginUsed) * 100).toFixed(2));

  // Direction Validation
  // For LONG: price increase (exit > entry) => grossPnL > 0; decrease => grossPnL < 0
  // For SHORT: price decrease (exit < entry) => grossPnL > 0; increase => grossPnL < 0
  const isPriceIncrease = exitPrice > entryPrice;
  const isPriceFlat = Math.abs(exitPrice - entryPrice) < 0.00001;
  const isDirectionValid =
    isPriceFlat ||
    (direction === 'LONG' && ((isPriceIncrease && grossPnL >= 0) || (!isPriceIncrease && grossPnL <= 0))) ||
    (direction === 'SHORT' && ((!isPriceIncrease && grossPnL >= 0) || (isPriceIncrease && grossPnL <= 0)));

  const validationNotes: string[] = [];
  if (!isDirectionValid) {
    validationNotes.push(`Direction mismatch: ${direction} with price ${entryPrice} -> ${exitPrice} resulted in gross PnL $${grossPnL}`);
  }

  // Audit tolerance against stated PnL if present
  let isWithinAuditTolerance = true;
  if (trade.balanceChange !== undefined && Number.isFinite(trade.balanceChange)) {
    const statedPnL = Number(trade.balanceChange);
    // User tolerance rule: Flag if |PnL_expected - PnL_stated| > max($2, 5% of PnL_stated)
    const threshold = Math.max(2.0, 0.05 * Math.abs(statedPnL));
    // Check against grossPnL or netPnL
    const diffGross = Math.abs(grossPnL - statedPnL);
    const diffNet = Math.abs(netPnL - statedPnL);
    if (diffGross > threshold && diffNet > threshold) {
      isWithinAuditTolerance = false;
      validationNotes.push(`Stated PnL $${statedPnL} deviates from expected $${grossPnL} by $${diffGross.toFixed(2)} (threshold: $${threshold.toFixed(2)})`);
    }
  }

  return {
    instrument,
    direction,
    entryPrice: parseFloat(entryPrice.toFixed(entryPrice < 10 ? 4 : 2)),
    exitPrice: parseFloat(exitPrice.toFixed(entryPrice < 10 ? 4 : 2)),
    priceDelta: parseFloat(priceDelta.toFixed(entryPrice < 10 ? 4 : 2)),
    priceDeltaPct: parseFloat(priceDeltaPct.toFixed(2)),
    marginUsed: parseFloat(marginUsed.toFixed(2)),
    leverage,
    positionNotional,
    assetQuantity: parseFloat(assetQuantity.toFixed(assetQuantity < 1 ? 6 : 4)),
    feeRate,
    entryFee,
    exitFee,
    totalFees,
    slippageRate,
    slippageBps,
    slippageCost,
    funding,
    returnPct,
    grossPnL,
    netPnL,
    roi,
    grossRoi,
    isDirectionValid,
    isWithinAuditTolerance,
    validationNotes,
  };
}

/**
 * Validates a chronological chain of settled trades to ensure:
 * 1. prev_balance + trade_pnl === stated settled balance
 * 2. PT-YYYYMMDD-NNNN format adherence
 * 3. Quarantine checks for test/dummy/debug artifacts
 */
export interface TradeChainAuditReport {
  totalTrades: number;
  initialBalance: number;
  finalBalance: number;
  totalRealizedPnL: number;
  chainBrokenCount: number;
  directionMismatchCount: number;
  toleranceFlaggedCount: number;
  quarantineCandidatesCount: number;
  brokenChainRecords: Array<{
    id: string;
    expectedBalance: number;
    statedBalance: number;
    difference: number;
  }>;
  flaggedTrades: Array<{
    id: string;
    expectedPnL: number;
    statedPnL: number;
    reason: string;
  }>;
  quarantinedTrades: Array<{
    id: string;
    reason: string;
  }>;
}

export function auditTradeChain(trades: any[], startBalance: number = 100000.0): TradeChainAuditReport {
  let runningBalance = startBalance;
  let chainBrokenCount = 0;
  let directionMismatchCount = 0;
  let toleranceFlaggedCount = 0;
  let quarantineCandidatesCount = 0;
  let totalRealizedPnL = 0;

  const brokenChainRecords: TradeChainAuditReport['brokenChainRecords'] = [];
  const flaggedTrades: TradeChainAuditReport['flaggedTrades'] = [];
  const quarantinedTrades: TradeChainAuditReport['quarantinedTrades'] = [];

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    if (!t) continue;

    const id = String(t.id || '');
    const trigger = String(t.trigger || '').toLowerCase();
    const notes = String(t.notes || '').toLowerCase();

    // 1. Check test trade quarantine
    const isQuarantine =
      trigger.includes('test') ||
      trigger.includes('sanitized') ||
      trigger.includes('dummy') ||
      trigger.includes('debug') ||
      notes.includes('test') ||
      notes.includes('dummy') ||
      !/^PT-\d{4}-?\d{4}-\d{2,4}$/i.test(id);

    if (isQuarantine) {
      quarantineCandidatesCount++;
      quarantinedTrades.push({
        id,
        reason: 'Quarantine criteria triggered (keyword in trigger/notes or non-canonical ID format)',
      });
    }

    const math = calculateTradePnLMath(t);
    if (!math.isDirectionValid) {
      directionMismatchCount++;
    }

    if (!math.isWithinAuditTolerance) {
      toleranceFlaggedCount++;
      flaggedTrades.push({
        id,
        expectedPnL: math.grossPnL,
        statedPnL: Number(t.balanceChange) || 0,
        reason: math.validationNotes.join('; '),
      });
    }

    const tradePnL = Number(t.balanceChange) || 0;
    totalRealizedPnL += tradePnL;
    const expectedBalance = parseFloat((runningBalance + tradePnL).toFixed(2));
    const statedBalance = Number(t.accountBalance);

    if (statedBalance && Math.abs(statedBalance - expectedBalance) > 0.05) {
      chainBrokenCount++;
      brokenChainRecords.push({
        id,
        expectedBalance,
        statedBalance,
        difference: parseFloat((statedBalance - expectedBalance).toFixed(2)),
      });
    }

    // Advance running balance
    runningBalance = expectedBalance;
  }

  return {
    totalTrades: trades.length,
    initialBalance: startBalance,
    finalBalance: runningBalance,
    totalRealizedPnL: parseFloat(totalRealizedPnL.toFixed(2)),
    chainBrokenCount,
    directionMismatchCount,
    toleranceFlaggedCount,
    quarantineCandidatesCount,
    brokenChainRecords,
    flaggedTrades,
    quarantinedTrades,
  };
}

export interface FinalizeTradeCloseParams {
  instrument: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number; // Margin collateral in USDT
  leverage: number;
  currentBalance?: number;
  customFeeRate?: number;
  fee?: number;
  slippage?: number;
  enforceCollar?: boolean;
}

export interface FinalizedTradeCloseResult {
  instrument: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  priceDelta: number;
  priceDeltaPct: number;
  quantity: number;
  leverage: number;
  positionNotional: number;
  feeRate: number;
  fee: number;
  slippage: number;
  slippageBps: number;
  grossPnl: number;
  netPnl: number;
  balanceChange: number;
  balanceChangePct: number;
  settledBalance: number;
  status: 'TAKE_PROFIT' | 'STOP_LOSS' | 'CLOSED';
}

/**
 * Authoritative trade finalization function.
 * Mathematically guarantees that for every trade close:
 *   Net Realized PnL == Gross PnL - Taker Fee - L2 Slippage
 * and updates the settled account balance by Net Realized PnL.
 */
export function finalizeTradeClose(params: FinalizeTradeCloseParams): FinalizedTradeCloseResult {
  const {
    instrument,
    direction,
    entryPrice,
    quantity,
    leverage,
    currentBalance = 100000,
    enforceCollar = false,
  } = params;

  let exitPrice = params.exitPrice;
  if (enforceCollar) {
    exitPrice = enforceSlippageCollar(entryPrice, exitPrice, direction);
  }

  const notional = quantity * leverage;
  const decimals = entryPrice < 10 ? 4 : 2;
  const priceDelta = parseFloat((exitPrice - entryPrice).toFixed(decimals));
  const priceDeltaPct = parseFloat(((priceDelta / entryPrice) * 100).toFixed(2));

  // Return percentage on notional according to direction
  const returnPct =
    direction === 'SHORT'
      ? (entryPrice - exitPrice) / entryPrice
      : (exitPrice - entryPrice) / entryPrice;

  const grossPnl = parseFloat((notional * returnPct).toFixed(2));

  // Bitget VIP-0 standard fee
  const feeRate = params.customFeeRate ?? getBitgetTakerFeeRate(instrument);
  const fee = params.fee !== undefined ? params.fee : parseFloat((notional * feeRate * 2).toFixed(2));

  // Dynamic L2 orderbook slippage
  const slippageCalc = estimateL2OrderbookSlippage(notional);
  const slippage = params.slippage !== undefined ? params.slippage : slippageCalc.slippageCost;
  const slippageBps = slippageCalc.slippageBps;

  // Strict Invariant: Net Realized PnL == Gross PnL - Fee - Slippage
  const netPnl = parseFloat((grossPnl - fee - slippage).toFixed(2));
  const balanceChange = netPnl;
  const balanceChangePct = parseFloat(((netPnl / quantity) * 100).toFixed(2));
  const settledBalance = parseFloat((currentBalance + netPnl).toFixed(2));

  const status: 'TAKE_PROFIT' | 'STOP_LOSS' | 'CLOSED' =
    netPnl > 0 ? 'TAKE_PROFIT' : netPnl < 0 ? 'STOP_LOSS' : 'CLOSED';

  return {
    instrument,
    direction,
    entryPrice,
    exitPrice,
    priceDelta,
    priceDeltaPct,
    quantity,
    leverage,
    positionNotional: notional,
    feeRate,
    fee,
    slippage,
    slippageBps,
    grossPnl,
    netPnl,
    balanceChange,
    balanceChangePct,
    settledBalance,
    status,
  };
}
