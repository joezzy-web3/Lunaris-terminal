/**
 * LUNARIS Terminal — Price-Feed Sanity & Flash-Crash Anomaly Guard
 *
 * Protects autonomous and paper trading execution from uncorroborated market anomalies,
 * flash-crash wicks, and synthetic adversarial trap ticks (e.g. >15–20% sudden deviation).
 *
 * Algorithm:
 * 1. Maintains a rolling FIFO window of the last N ticks for each instrument.
 * 2. Computes the rolling median price for each instrument.
 * 3. Compares incoming ticks against the rolling median.
 * 4. Rejects or flags any tick that deviates beyond MAX_DEVIATION_PCT (default 15.0%)
 *    unless corroborated by an external reference feed.
 * 5. Logs rejected / flagged ticks separately into an audit record structure rather
 *    than allowing them to silently become entry or exit prices on live (paper) trades.
 */

import fs from 'fs';
import path from 'path';

export interface RejectedTickRecord {
  id: string;
  timestamp: string;
  instrument: string;
  incomingPrice: number;
  rollingMedian: number;
  deviationPct: number;
  thresholdPct: number;
  source: string;
  corroborated: boolean;
  reason: string;
  action: 'REJECTED' | 'FLAGGED';
}

export interface PriceSanityResult {
  valid: boolean;
  sanitizedPrice: number;
  rejected: boolean;
  deviationPct: number;
  rollingMedian: number;
  reason?: string;
  rejectedRecord?: RejectedTickRecord;
}

export interface PriceSanityGuardConfig {
  windowSize?: number; // Number of ticks in rolling buffer (default: 15)
  maxDeviationPct?: number; // Maximum allowed deviation fraction (e.g., 0.15 = 15%)
  minTicksForMedian?: number; // Minimum ticks before enforcing median (default: 3)
  logToDisk?: boolean;
}

const DEFAULT_WINDOW_SIZE = 15;
const DEFAULT_MAX_DEVIATION_PCT = 0.15; // 15% threshold
const DEFAULT_MIN_TICKS = 3;

// In-memory rolling tick buffers per normalized instrument ticker
const tickBuffers: Map<string, number[]> = new Map();

// In-memory ring buffer for rejected ticks log (keeps last 500 records)
const rejectedTicksLog: RejectedTickRecord[] = [];

/**
 * Calculates the statistical median of a numeric array
 */
export function calculateMedian(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Normalizes ticker symbols (e.g. 'NVDAon/USDT' -> 'NVDAON')
 */
export function normalizeTickerKey(ticker: string): string {
  return String(ticker || '')
    .toUpperCase()
    .replace('/USDT', '')
    .replace('/USD', '')
    .replace('-USD', '')
    .trim();
}

/**
 * Validates an incoming price tick against the rolling median buffer.
 *
 * @param ticker Instrument ticker (e.g. 'NVDAon', 'BTC', 'ETH')
 * @param incomingPrice The price tick received from the ingestion feed
 * @param source Feed source (e.g., 'bitget', 'binance', 'yahoo')
 * @param externalCorroborationPrice Optional secondary feed price (e.g., Yahoo quote vs Bitget quote)
 * @param config Custom configuration overrides
 */
export function validatePriceTick(
  ticker: string,
  incomingPrice: number,
  source: string = 'feed',
  externalCorroborationPrice?: number,
  config?: PriceSanityGuardConfig
): PriceSanityResult {
  const normKey = normalizeTickerKey(ticker);
  const windowSize = config?.windowSize ?? DEFAULT_WINDOW_SIZE;
  const maxDeviationPct = config?.maxDeviationPct ?? DEFAULT_MAX_DEVIATION_PCT;
  const minTicks = config?.minTicksForMedian ?? DEFAULT_MIN_TICKS;
  const shouldLogToDisk = config?.logToDisk ?? true;

  if (!Number.isFinite(incomingPrice) || incomingPrice <= 0) {
    return {
      valid: false,
      sanitizedPrice: 0,
      rejected: true,
      deviationPct: 100,
      rollingMedian: 0,
      reason: `Non-positive or non-finite price: ${incomingPrice}`,
    };
  }

  let buffer = tickBuffers.get(normKey);
  if (!buffer) {
    buffer = [];
    tickBuffers.set(normKey, buffer);
  }

  // If we have fewer than minTicks, initialize the buffer and accept
  if (buffer.length < minTicks) {
    buffer.push(incomingPrice);
    if (buffer.length > windowSize) buffer.shift();
    return {
      valid: true,
      sanitizedPrice: incomingPrice,
      rejected: false,
      deviationPct: 0,
      rollingMedian: incomingPrice,
    };
  }

  const median = calculateMedian(buffer);
  const deviation = Math.abs(incomingPrice - median) / median;
  const deviationPct = parseFloat((deviation * 100).toFixed(2));
  const thresholdPct = parseFloat((maxDeviationPct * 100).toFixed(2));

  // Check if deviation exceeds threshold
  if (deviation > maxDeviationPct) {
    // Check if corroborated by external reference feed within 5% of incomingPrice
    let isCorroborated = false;
    if (
      typeof externalCorroborationPrice === 'number' &&
      Number.isFinite(externalCorroborationPrice) &&
      externalCorroborationPrice > 0
    ) {
      const extDeviation = Math.abs(incomingPrice - externalCorroborationPrice) / externalCorroborationPrice;
      if (extDeviation <= 0.05) {
        isCorroborated = true;
      }
    }

    if (!isCorroborated) {
      // REJECT anomalous tick!
      const rejectedRecord: RejectedTickRecord = {
        id: `REJ-${normKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        instrument: ticker,
        incomingPrice,
        rollingMedian: parseFloat(median.toFixed(incomingPrice < 10 ? 4 : 2)),
        deviationPct,
        thresholdPct,
        source,
        corroborated: false,
        reason: `Price $${incomingPrice} deviated ${deviationPct}% from rolling median $${median.toFixed(2)} (threshold ${thresholdPct}%) without external corroboration`,
        action: 'REJECTED',
      };

      // Append to in-memory audit log
      rejectedTicksLog.unshift(rejectedRecord);
      if (rejectedTicksLog.length > 500) rejectedTicksLog.pop();

      // Persist to data/rejected_ticks.json if running in Node environment
      if (shouldLogToDisk && typeof process !== 'undefined' && process.cwd) {
        try {
          const logDir = path.join(process.cwd(), 'data');
          if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
          const logFile = path.join(logDir, 'rejected_ticks.json');
          let diskLogs: RejectedTickRecord[] = [];
          if (fs.existsSync(logFile)) {
            try {
              diskLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
            } catch {}
          }
          diskLogs.unshift(rejectedRecord);
          fs.writeFileSync(logFile, JSON.stringify(diskLogs.slice(0, 500), null, 2), 'utf8');
        } catch {
          // Non-blocking disk write failure
        }
      }

      // Return sanitized price clamped to rolling median to safeguard downstream execution
      return {
        valid: false,
        sanitizedPrice: median,
        rejected: true,
        deviationPct,
        rollingMedian: median,
        reason: rejectedRecord.reason,
        rejectedRecord,
      };
    }
  }

  // Tick is valid and accepted — push to rolling buffer
  buffer.push(incomingPrice);
  if (buffer.length > windowSize) buffer.shift();

  return {
    valid: true,
    sanitizedPrice: incomingPrice,
    rejected: false,
    deviationPct,
    rollingMedian: median,
  };
}

/**
 * Returns the current rolling median for a ticker
 */
export function getRollingMedian(ticker: string): number | null {
  const normKey = normalizeTickerKey(ticker);
  const buffer = tickBuffers.get(normKey);
  if (!buffer || buffer.length === 0) return null;
  return calculateMedian(buffer);
}

/**
 * Seed or pre-populate the rolling tick buffer for a ticker
 */
export function seedTickBuffer(ticker: string, initialPrices: number[]) {
  const normKey = normalizeTickerKey(ticker);
  tickBuffers.set(normKey, [...initialPrices]);
}

/**
 * Clear all tick history and rejected records (useful for test suites)
 */
export function clearPriceSanityState() {
  tickBuffers.clear();
  rejectedTicksLog.length = 0;
}

/**
 * Returns the rejected ticks log
 */
export function getRejectedTicksLog(): RejectedTickRecord[] {
  return [...rejectedTicksLog];
}
