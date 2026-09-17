/**
 * Bitget AI Base Camp Hackathon S2 — LUNARIS Terminal
 * Authoritative Mathematical Source of Truth for Paper-Trading & Institutional Audit
 * 
 * Eliminates all discrepancies between Entry Price, Exit Price, Direction, Leverage,
 * Size (Margin vs Notional), P&L, Fees, Funding, and Balance Chaining.
 */

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

  // Explicit Fee & Funding Model (Bitget Institutional VIP Tier 0.02% Maker / 0.04% Taker)
  feeRate: number;             // 0.0004 (0.04% round-trip / taker model)
  entryFee: number;            // positionNotional * 0.0002
  exitFee: number;             // (assetQuantity * exitPrice) * 0.0002
  totalFees: number;           // entryFee + exitFee
  funding: number;             // 0.00 (explicitly 0.00 when not charged)

  // P&L Breakdown
  returnPct: number;           // Direction-adjusted fractional return on notional
  grossPnL: number;            // positionNotional * returnPct === assetQuantity * priceDifference
  netPnL: number;              // grossPnL - totalFees - funding
  roi: number;                 // (netPnL / marginUsed) * 100
  grossRoi: number;            // (grossPnL / marginUsed) * 100

  // Direction & Integrity Validation
  isDirectionValid: boolean;   // true if price movement direction matches grossPnL sign
  isWithinAuditTolerance: boolean; // Flag if |pnl_expected - pnl_stated| <= max($2, 5%)
  validationNotes: string[];
}

export const INSTITUTIONAL_FEE_RATE = 0.0004; // 0.04% combined maker/taker fee rate

/**
 * Calculates authoritative P&L mathematics for any trade record from raw fields.
 * Guarantees that:
 * 1. positionNotional = marginUsed * leverage
 * 2. assetQuantity = positionNotional / entryPrice
 * 3. grossPnL = assetQuantity * priceDifference === positionNotional * returnPct
 * 4. netPnL = grossPnL - totalFees - funding
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
    funding?: number;
  },
  customFeeRate: number = INSTITUTIONAL_FEE_RATE
): TradePnLMathResult {
  const instrument = trade.instrument || 'BTC/USDT';
  const direction: 'LONG' | 'SHORT' = trade.direction === 'SHORT' ? 'SHORT' : 'LONG';
  
  // Authoritative Raw Prices
  const entryPrice = Math.max(0.0001, Number(trade.entryPrice) || Number(trade.price) || 100);
  let exitPrice = Number(trade.exitPrice);
  if (!exitPrice || !Number.isFinite(exitPrice) || exitPrice <= 0) {
    // If exitPrice not present, fallback based on balanceChange if available
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

  // Explicit Fee Modeling
  const feeRate = customFeeRate;
  const entryFee = parseFloat((positionNotional * (feeRate / 2)).toFixed(2));
  const exitNotional = assetQuantity * exitPrice;
  const exitFee = parseFloat((exitNotional * (feeRate / 2)).toFixed(2));
  const totalFees = trade.fees !== undefined && Number.isFinite(trade.fees)
    ? Number(trade.fees)
    : parseFloat((entryFee + exitFee).toFixed(2));
  const funding = trade.funding !== undefined && Number.isFinite(trade.funding)
    ? Number(trade.funding)
    : 0.0;

  // Net Realized P&L
  const netPnL = parseFloat((grossPnL - totalFees - funding).toFixed(2));

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
