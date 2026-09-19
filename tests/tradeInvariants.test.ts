import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  finalizeTradeClose,
  calculateTradePnLMath,
  getBitgetTakerFeeRate,
  estimateL2OrderbookSlippage,
} from '../lib/tradeMath';
import {
  normalizeTradeRecord,
  isAnomalousTrade,
  isTestTradeRecord,
  reconcileTradeCollection,
  HISTORICAL_DISCLOSED_ANOMALY_IDS,
  HISTORICAL_DISCLOSED_ANOMALY_SET,
  HISTORICAL_DUPLICATE_GROUPS,
  HISTORICAL_DUPLICATE_ROW_IDS,
} from '../lib/firestoreAudit';
import {
  MAX_SLIPPAGE_PCT,
  enforceSlippageCollar,
  validateSlippageCollar,
} from '../lib/riskVeto';
import {
  calculateAuditMetrics,
  generateCsvExport,
  PaperTradeRecord,
} from '../lib/paperTradingAudit';
import {
  validatePriceTick,
  getRejectedTicksLog,
  clearPriceSanityState,
} from '../lib/priceSanityGuard';

describe('Authoritative PnL Invariant: Net PnL == Gross PnL - Fee - Slippage', () => {
  it('enforces exact deduction of fees and slippage on profitable LONG trade', () => {
    const result = finalizeTradeClose({
      instrument: 'BTC/USDT',
      direction: 'LONG',
      entryPrice: 60000,
      exitPrice: 62000,
      quantity: 10000, // $10,000 margin collateral
      leverage: 3,     // $30,000 notional
      currentBalance: 100000,
    });

    // 1. Gross PnL check: $10,000 * 3 * (2000 / 60000) = $1,000.00
    assert.strictEqual(result.grossPnl, 1000.0);

    // 2. Fee check: 0.06% round-trip on $30,000 notional = $36.00
    assert.strictEqual(result.fee, 36.0);

    // 3. Slippage check: base 2.0 bps + scale = 3.2 bps on $30k = $9.60
    assert.strictEqual(result.slippage, 9.6);

    // 4. CRITICAL INVARIANT: Net PnL == Gross PnL - Fee - Slippage
    const expectedNet = parseFloat((result.grossPnl - result.fee - result.slippage).toFixed(2));
    assert.strictEqual(result.netPnl, expectedNet);
    assert.strictEqual(result.netPnl, 954.4);

    // 5. Settled balance update reflects exact net proceeds
    assert.strictEqual(result.settledBalance, 100954.4);
  });

  it('enforces exact deduction of fees and slippage on losing LONG trade (Stop-Loss)', () => {
    const result = finalizeTradeClose({
      instrument: 'ETH/USDT',
      direction: 'LONG',
      entryPrice: 2500,
      exitPrice: 2425, // -3% price drop
      quantity: 5000,
      leverage: 2,     // $10,000 notional
      currentBalance: 50000,
    });

    // Gross loss: 5000 * 2 * (-75 / 2500) = -$300.00
    assert.strictEqual(result.grossPnl, -300.0);

    // Fees: 0.06% round-trip on $10,000 = $12.00
    assert.strictEqual(result.fee, 12.0);

    // Slippage: ~2.4 bps on $10,000 = $2.40
    assert.strictEqual(result.slippage, 2.4);

    // Net loss must be strictly worse than gross loss due to fees and slippage
    const expectedNet = parseFloat((result.grossPnl - result.fee - result.slippage).toFixed(2));
    assert.strictEqual(result.netPnl, expectedNet);
    assert.strictEqual(result.netPnl, -314.4);
    assert.strictEqual(result.settledBalance, 49685.6);
  });

  it('enforces higher 0.10% fee rate on tokenized equity rTokens (TSLAon/USDT, NVDAon/USDT)', () => {
    const cryptoFee = getBitgetTakerFeeRate('BTC/USDT');
    const rTokenFee = getBitgetTakerFeeRate('TSLAon/USDT');

    assert.strictEqual(cryptoFee, 0.0006);
    assert.strictEqual(rTokenFee, 0.001);

    const rTokenResult = finalizeTradeClose({
      instrument: 'TSLAon/USDT',
      direction: 'LONG',
      entryPrice: 250,
      exitPrice: 260,
      quantity: 5000,
      leverage: 2, // $10,000 notional
      currentBalance: 100000,
    });

    // Round-trip fee: 10,000 * 0.0010 * 2 = $20.00
    assert.strictEqual(rTokenResult.fee, 20.0);
    assert.strictEqual(rTokenResult.feeRate, 0.001);
    assert.strictEqual(rTokenResult.netPnl, parseFloat((rTokenResult.grossPnl - rTokenResult.fee - rTokenResult.slippage).toFixed(2)));
  });

  it('preserves immutable historical batch (PT-4438 through PT-4477) while enforcing invariant on all other trades in normalizeTradeRecord', () => {
    // 1. Historical trade in affected batch: must NOT be rewritten or backfilled
    const historicalBatchTrade = {
      id: 'PT-20260919-4450',
      timestamp: '2026-09-19T06:35:10.000Z',
      instrument: 'NVDAon/USDT',
      direction: 'LONG',
      price: 130.0,
      entryPrice: 130.0,
      exitPrice: 134.0,
      quantity: 10000,
      leverage: 2,
      grossPnl: 615.38,
      fee: 40.0,
      slippage: 6.0,
      netPnl: 615.38, // Original anomalous un-subtracted value
      balanceChange: 615.38,
      accountBalance: 1600000.0,
      status: 'TAKE_PROFIT',
    };

    const normalizedHistorical = normalizeTradeRecord(historicalBatchTrade, historicalBatchTrade.id);
    // Verified: Historical row is preserved immutable
    assert.strictEqual(normalizedHistorical.netPnl, 615.38);
    assert.strictEqual(normalizedHistorical.grossPnl, 615.38);

    // 2. Future / modern trade: MUST enforce Net = Gross - Fee - Slippage
    const modernTrade = {
      id: 'PT-20260919-6000',
      timestamp: '2026-09-19T13:00:00.000Z',
      instrument: 'NVDAon/USDT',
      direction: 'LONG',
      price: 130.0,
      entryPrice: 130.0,
      exitPrice: 134.0,
      quantity: 10000,
      leverage: 2,
      grossPnl: 615.38,
      fee: 40.0,
      slippage: 6.0,
      status: 'TAKE_PROFIT',
    };

    const normalizedModern = normalizeTradeRecord(modernTrade, modernTrade.id);
    assert.strictEqual(normalizedModern.netPnl, parseFloat((615.38 - 40.0 - 6.0).toFixed(2)));
    assert.strictEqual(normalizedModern.netPnl, 569.38);
  });

  it('correctly normalizes ADJUSTMENT records and applies negative delta', () => {
    const adjTrade = {
      id: 'PT-20260919-5930',
      timestamp: '2026-09-19T12:15:00.000Z',
      instrument: 'ADJUSTMENT/USD',
      direction: 'LONG',
      price: 1.0,
      quantity: 2997.96,
      leverage: 1,
      grossPnl: 0,
      fee: 0,
      slippage: 0,
      netPnl: -2997.96,
      balanceChange: -2997.96,
      balanceChangePct: -100,
      accountBalance: 2176466.82,
      status: 'ADJUSTMENT',
      sourceHandler: 'ADJUSTMENT',
      trigger: 'Audit Adjustment for batch PT-4438 through PT-4477',
      notes: 'Audit Adjustment for batch PT-4438 through PT-4477',
    };

    const normalized = normalizeTradeRecord(adjTrade, adjTrade.id);
    assert.strictEqual(normalized.status, 'ADJUSTMENT');
    assert.strictEqual(normalized.netPnl, -2997.96);
    assert.strictEqual(normalized.balanceChange, -2997.96);
    assert.strictEqual(isAnomalousTrade(normalized), false);
    assert.strictEqual(isTestTradeRecord(normalized), false);
  });
});

describe('Price Sanity Guard: Rolling Median & Anomaly Detection', () => {
  it('accepts initial valid ticks and rejects extreme outlier ticks (>15% deviation)', () => {
    clearPriceSanityState();

    // Healthy ticks around $60,000 BTC
    assert.strictEqual(validatePriceTick('BTC/USDT', 60000, 'TEST_FEED').valid, true);
    assert.strictEqual(validatePriceTick('BTC/USDT', 60100, 'TEST_FEED').valid, true);
    assert.strictEqual(validatePriceTick('BTC/USDT', 59950, 'TEST_FEED').valid, true);
    assert.strictEqual(validatePriceTick('BTC/USDT', 60200, 'TEST_FEED').valid, true);

    // Anomalous flash spike: $157,000 (+161% jump) -> must be rejected
    const spikeCheck = validatePriceTick('BTC/USDT', 157000, 'TEST_FEED');
    assert.strictEqual(spikeCheck.valid, false);
    assert.strictEqual(spikeCheck.rejected, true);
    assert(spikeCheck.reason?.includes('deviated'));

    // Anomalous flash crash: $10,000 (-83% drop) -> must be rejected
    const crashCheck = validatePriceTick('BTC/USDT', 10000, 'TEST_FEED');
    assert.strictEqual(crashCheck.valid, false);
    assert.strictEqual(crashCheck.rejected, true);

    // Normal movement (+1.5% to $60,900) -> must be accepted
    const normalCheck = validatePriceTick('BTC/USDT', 60900, 'TEST_FEED');
    assert.strictEqual(normalCheck.valid, true);
    assert.strictEqual(normalCheck.rejected, false);

    // Rejection telemetry logged
    const logs = getRejectedTicksLog();
    assert(logs.length >= 2);
    assert.strictEqual(logs[logs.length - 1].action, 'REJECTED');
  });

  it('rejects non-positive and non-finite price ticks', () => {
    assert.strictEqual(validatePriceTick('ETH/USDT', 0, 'TEST_FEED').valid, false);
    assert.strictEqual(validatePriceTick('ETH/USDT', -2500, 'TEST_FEED').valid, false);
    assert.strictEqual(validatePriceTick('ETH/USDT', NaN, 'TEST_FEED').valid, false);
    assert.strictEqual(validatePriceTick('ETH/USDT', Infinity, 'TEST_FEED').valid, false);
  });
});

describe('Invariant 1 — 0.5% Slippage Collar Enforced', () => {
  it('validates prices within 0.5% collar and flags deviations beyond collar', () => {
    assert.strictEqual(MAX_SLIPPAGE_PCT, 0.005);

    // Within 0.5% collar (e.g. 0.3% move)
    const validLong = validateSlippageCollar(100, 100.3);
    assert.strictEqual(validLong, true);

    // Far beyond 0.5% collar (e.g. 6.1% move like historical PT-20260917-0300)
    const invalidLong = validateSlippageCollar(175.19, 164.48);
    assert.strictEqual(invalidLong, false);
  });

  it('enforces slippage collar by clamping exitPrice to within 0.5% max deviation', () => {
    // LONG trade attempting 6.1% drop: clamped conservatively to within 0.5%
    const clampedExit = enforceSlippageCollar(175.19, 164.48, 'LONG');
    const deviation = Math.abs(clampedExit - 175.19) / 175.19;
    assert.strictEqual(deviation <= 0.005001, true);

    // SHORT trade attempting 40% jump: clamped to within 0.5%
    const clampedShort = enforceSlippageCollar(219.53, 300.0, 'SHORT');
    const devShort = Math.abs(clampedShort - 219.53) / 219.53;
    assert.strictEqual(devShort <= 0.005001, true);
  });

  it('clamps exitPrice in finalizeTradeClose when enforceCollar is enabled', () => {
    const result = finalizeTradeClose({
      instrument: 'COIN/USDT',
      direction: 'LONG',
      entryPrice: 175.19,
      exitPrice: 164.48, // -6.1% deviation
      quantity: 5000,
      leverage: 3,
      currentBalance: 100000,
      enforceCollar: true,
    });

    const deviation = Math.abs(result.exitPrice - 175.19) / 175.19;
    assert.strictEqual(deviation <= 0.005001, true);
    assert.strictEqual(validateSlippageCollar(175.19, result.exitPrice), true);
  });

  it('enforces slippage collar in normalizeTradeRecord for all new trades while preserving 45 disclosed historical rows', () => {
    // Historical disclosed anomaly PT-20260917-0300 preserved unedited
    const historicalTrade = {
      id: 'PT-20260917-0300',
      timestamp: '2026-09-17T03:00:00.000Z',
      instrument: 'COIN/USDT',
      direction: 'LONG' as const,
      entryPrice: 175.19,
      exitPrice: 164.48,
      quantity: 5000,
      leverage: 3,
      balanceChange: -305.5,
      balanceChangePct: -6.11,
      accountBalance: 100000,
    };
    const normHist = normalizeTradeRecord(historicalTrade, historicalTrade.id);
    assert.strictEqual(normHist.exitPrice, 164.48);

    // New modern trade: exit price clamped
    const modernTrade = {
      id: 'PT-20260920-0001',
      timestamp: '2026-09-20T03:00:00.000Z',
      instrument: 'COIN/USDT',
      direction: 'LONG' as const,
      entryPrice: 175.19,
      exitPrice: 164.48,
      quantity: 5000,
      leverage: 3,
      accountBalance: 100000,
    };
    const normModern = normalizeTradeRecord(modernTrade, modernTrade.id);
    const modernDev = Math.abs(normModern.exitPrice - 175.19) / 175.19;
    assert.strictEqual(modernDev <= 0.005001, true);
  });
});

describe('Invariant 2 — Net PnL Math Integrity (Net == Gross - Fee - Slippage)', () => {
  it('strictly verifies Net Realized PnL == Gross PnL - Fee - Slippage across random order sizes', () => {
    const testCases = [
      { notional: 15000, entry: 100, exit: 100.4, dir: 'LONG' as const, feeRate: 0.0006 },
      { notional: 25000, entry: 250, exit: 249.2, dir: 'SHORT' as const, feeRate: 0.0010 },
      { notional: 50000, entry: 60000, exit: 60250, dir: 'LONG' as const, feeRate: 0.0006 },
    ];

    for (const tc of testCases) {
      const math = calculateTradePnLMath({
        instrument: tc.feeRate === 0.0010 ? 'TSLAon/USDT' : 'BTC/USDT',
        direction: tc.dir,
        entryPrice: tc.entry,
        exitPrice: tc.exit,
        quantity: tc.notional / 2,
        leverage: 2,
      });

      // Core invariant: Net Realized PnL == Gross PnL - Total Fees - Slippage Cost
      const expectedNet = parseFloat((math.grossPnL - math.totalFees - math.slippageCost).toFixed(2));
      assert.strictEqual(math.netPnL, expectedNet);
      assert.strictEqual(typeof math.netPnL, 'number');
      assert.strictEqual(math.totalFees > 0, true);
      assert.strictEqual(math.slippageCost > 0, true);
    }
  });
});

describe('Invariant 3 — balanceChangePct is (netPnL / margin) * 100', () => {
  it('computes balanceChangePct directly from netPnL and margin collateral without arbitrary clamping', () => {
    const margin = 10000;
    const netPnl = 845.25;
    const expectedPct = parseFloat(((netPnl / margin) * 100).toFixed(2));
    assert.strictEqual(expectedPct, 8.45);

    const modernTrade = {
      id: 'PT-20260920-0002',
      timestamp: '2026-09-20T04:00:00.000Z',
      instrument: 'BTC/USDT',
      direction: 'LONG' as const,
      entryPrice: 60000,
      exitPrice: 60300,
      quantity: margin,
      leverage: 3,
      balanceChange: netPnl,
      accountBalance: 100845.25,
    };

    const norm = normalizeTradeRecord(modernTrade, modernTrade.id);
    assert.strictEqual(norm.balanceChangePct, expectedPct);
  });

  it('does not clamp large valid returns to arbitrary legacy values like 6.5% or -3.2%', () => {
    const tradeData = {
      id: 'PT-20260920-0003',
      timestamp: '2026-09-20T05:00:00.000Z',
      instrument: 'ETH/USDT',
      direction: 'LONG' as const,
      entryPrice: 2500,
      exitPrice: 2512.5,
      quantity: 5000,
      leverage: 3,
      balanceChange: 750, // 15% return on margin
      accountBalance: 100750,
    };

    const norm = normalizeTradeRecord(tradeData, tradeData.id);
    assert.strictEqual(norm.balanceChangePct, 15.0);
    assert.notStrictEqual(norm.balanceChangePct, 6.5);
  });
});

describe('Invariant 4 — Duplicate Trade Submission Prevention & Historical Immutability', () => {
  it('identifies exactly 23 duplicate groups (47 rows) in historical disclosure records', () => {
    assert.strictEqual(HISTORICAL_DUPLICATE_GROUPS.length, 23);
    assert.strictEqual(HISTORICAL_DUPLICATE_ROW_IDS.length, 47);
  });

  it('preserves historical duplicates unedited while rejecting duplicate submissions for new trades', () => {
    // 2 historical trades in duplicate group (e.g. TSLA/USDT)
    const hist1: PaperTradeRecord = {
      id: 'PT-20260914-0016',
      auditSeq: 16,
      timestamp: '2026-09-14T01:00:00.000Z',
      instrument: 'TSLA/USDT',
      direction: 'SHORT',
      price: 248,
      entryPrice: 248,
      exitPrice: 246.18,
      quantity: 5000,
      leverage: 2,
      balanceChange: -220,
      balanceChangePct: -4.4,
      accountBalance: 99780,
      status: 'STOP_LOSS',
      trigger: 'Council Quorum',
    };
    const hist2: PaperTradeRecord = {
      id: 'PT-20260914-0058',
      auditSeq: 58,
      timestamp: '2026-09-14T02:00:00.000Z',
      instrument: 'TSLA/USDT',
      direction: 'SHORT',
      price: 248,
      entryPrice: 248,
      exitPrice: 246.18,
      quantity: 5000,
      leverage: 2,
      balanceChange: -220,
      balanceChangePct: -4.4,
      accountBalance: 99560,
      status: 'STOP_LOSS',
      trigger: 'Council Quorum',
    };

    // Both historical duplicate rows MUST be preserved
    const reconciledHist = reconcileTradeCollection([hist1, hist2]);
    assert.strictEqual(reconciledHist.length, 2);

    // Now submit a new trade beyond the historical ledger with an identical execution signature
    const newDuplicateTrade: PaperTradeRecord = {
      id: 'PT-20260920-9999',
      timestamp: '2026-09-20T12:00:00.000Z',
      instrument: 'TSLA/USDT',
      direction: 'SHORT',
      price: 248,
      entryPrice: 248,
      exitPrice: 246.18,
      quantity: 5000,
      leverage: 2,
      balanceChange: -220,
      balanceChangePct: -4.4,
      accountBalance: 99340,
      status: 'STOP_LOSS',
      trigger: 'Council Quorum',
    };

    const reconciledWithNew = reconcileTradeCollection([hist1, hist2, newDuplicateTrade]);
    // The new duplicate must be rejected: length remains 2!
    assert.strictEqual(reconciledWithNew.length, 2);
    assert.strictEqual(reconciledWithNew.some(t => t.id === 'PT-20260920-9999'), false);
  });
});

describe('Invariant 5 — Manual Balance Adjustment Excluded from Trade Stats', () => {
  it('excludes rows with status === ADJUSTMENT from trade metrics (totalTrades, winRate, profitFactor)', () => {
    const mockLedger: PaperTradeRecord[] = [
      {
        id: 'PT-20260919-5001',
        timestamp: '2026-09-19T10:00:00.000Z',
        instrument: 'BTC/USDT',
        direction: 'LONG',
        price: 60000,
        entryPrice: 60000,
        exitPrice: 60300,
        quantity: 5000,
        leverage: 3,
        balanceChange: 350,
        balanceChangePct: 7.0,
        accountBalance: 100350,
        status: 'TAKE_PROFIT',
        trigger: 'Council Quorum',
      },
      {
        id: 'PT-20260919-5002',
        timestamp: '2026-09-19T11:00:00.000Z',
        instrument: 'ETH/USDT',
        direction: 'LONG',
        price: 2500,
        entryPrice: 2500,
        exitPrice: 2488,
        quantity: 5000,
        leverage: 3,
        balanceChange: -150,
        balanceChangePct: -3.0,
        accountBalance: 100200,
        status: 'STOP_LOSS',
        trigger: 'Council Quorum',
      },
      {
        id: 'PT-20260919-5959',
        timestamp: '2026-09-19T12:00:00.000Z',
        instrument: 'ADJUSTMENT/USD',
        direction: 'LONG',
        price: 1.0,
        entryPrice: 1.0,
        exitPrice: 1.0,
        quantity: 2997.96,
        leverage: 1,
        balanceChange: -2997.96,
        balanceChangePct: -100,
        accountBalance: 97202.04,
        status: 'ADJUSTMENT',
        sourceHandler: 'ADJUSTMENT',
        trigger: 'Audit Adjustment: Historical Fee/Slippage Reconciliation',
      },
    ];

    const metrics = calculateAuditMetrics(mockLedger);
    // Only the 2 actual trades should count toward trade statistics!
    assert.strictEqual(metrics.totalTrades, 2);
    assert.strictEqual(metrics.winningTrades, 1);
    assert.strictEqual(metrics.losingTrades, 1);
    assert.strictEqual(metrics.winRatePct, 50.0);
    // Account balance accurately incorporates all balance changes including the adjustment
    assert.strictEqual(metrics.currentBalance, 97202.04);
  });

  it('includes disclosure note and excludes adjustments from trade count in generateCsvExport', () => {
    const mockTrades: PaperTradeRecord[] = [
      {
        id: 'PT-20260919-5001',
        timestamp: '2026-09-19T10:00:00.000Z',
        instrument: 'BTC/USDT',
        direction: 'LONG',
        price: 60000,
        quantity: 5000,
        leverage: 1,
        balanceChange: 100,
        balanceChangePct: 2,
        accountBalance: 100100,
        status: 'TAKE_PROFIT',
        trigger: 'Council Quorum',
      },
      {
        id: 'PT-20260919-5959',
        timestamp: '2026-09-19T12:00:00.000Z',
        instrument: 'ADJUSTMENT/USD',
        direction: 'LONG',
        price: 1,
        quantity: 100,
        leverage: 1,
        balanceChange: -100,
        balanceChangePct: -100,
        accountBalance: 100000,
        status: 'ADJUSTMENT',
        sourceHandler: 'ADJUSTMENT',
        trigger: 'Fee Reconciliation',
      },
    ];

    const csv = generateCsvExport(mockTrades);
    assert(csv.includes('# Total Executed Paper Trades: 1'));
    assert(csv.includes('# AUDIT DISCLOSURE NOTE:'));
    assert(csv.includes('PT-20260919-5959 is a manual fee/slippage reconciliation adjustment'));
  });
});
