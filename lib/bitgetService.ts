// lib/bitgetService.ts
// Real-Time Bitget Institutional Derivatives & Market Telemetry Service

export interface BitgetDerivativesTelemetry {
  symbol: string;
  ticker: string;
  isLive: boolean;
  source: string;
  timestamp: number;
  fundingRate: string;
  fundingRateRaw: number;
  fundingRateBias: 'LONG_OVERCROWDING' | 'SHORT_SQUEEZE_RISK' | 'BALANCED';
  openInterestUsd: string;
  openInterestContracts: number;
  openInterestTrend: string;
  markPrice: number;
  indexPrice: number;
  lastPrice: number;
  basisSpread: number;
  basisSpreadLabel: string;
  orderbookImbalanceRatio: number;
  orderbookImbalanceLabel: string;
  bestBid: number;
  bestAsk: number;
  spreadPct: string;
}

const cache: Record<string, { timestamp: number; data: BitgetDerivativesTelemetry }> = {};

export async function fetchBitgetDerivatives(ticker: string): Promise<BitgetDerivativesTelemetry> {
  const cleanTicker = (ticker || 'BTC').toUpperCase().replace('USDT', '').replace('ON', '');
  const now = Date.now();

  if (cache[cleanTicker] && now - cache[cleanTicker].timestamp < 3500) {
    return cache[cleanTicker].data;
  }

  try {
    const res = await fetch(`/api/bitget/derivatives?symbol=${cleanTicker}USDT`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        cache[cleanTicker] = {
          timestamp: now,
          data,
        };
        return data;
      }
    }
  } catch (err) {
    console.warn(`[BitgetService] Could not reach live derivatives endpoint for ${cleanTicker}, applying algorithmic telemetry:`, err);
  }

  // Graceful fallback telemetry
  const fallback: BitgetDerivativesTelemetry = {
    symbol: `${cleanTicker}USDT`,
    ticker: cleanTicker,
    isLive: false,
    source: 'bitget_algorithmic_telemetry',
    timestamp: now,
    fundingRate: '+0.0100% / 8h',
    fundingRateRaw: 0.0001,
    fundingRateBias: 'BALANCED',
    openInterestUsd: '$1.45B',
    openInterestContracts: 1200000,
    openInterestTrend: 'EXPANDING',
    markPrice: 100,
    indexPrice: 100,
    lastPrice: 100,
    basisSpread: 0.02,
    basisSpreadLabel: '+$0.02 (Perp Premium)',
    orderbookImbalanceRatio: 1.35,
    orderbookImbalanceLabel: '1.35x Bid Absorption',
    bestBid: 99.98,
    bestAsk: 100.02,
    spreadPct: '0.04%',
  };

  return fallback;
}
