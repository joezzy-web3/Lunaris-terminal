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
} from '../lib/firestoreAudit';
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
