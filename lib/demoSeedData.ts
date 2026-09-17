/**
 * LUNARIS Terminal - Seeded Random-Walk Engine & Fallback Market Data
 * Provides reliable, realistic multi-asset pricing with random-walk drift,
 * volatility modeling, and scenario shock capabilities.
 */

export interface AssetSeedConfig {
  ticker: string;
  name: string;
  basePrice: number;
  volatility: number;
  class: 'CX' | 'EQ';
  unitDecimals: number;
}

export const SEEDED_ASSETS: Record<string, AssetSeedConfig> = {
  BTC: { ticker: 'BTC', name: 'Bitcoin', basePrice: 76500.0, volatility: 0.0035, class: 'CX', unitDecimals: 2 },
  ETH: { ticker: 'ETH', name: 'Ethereum', basePrice: 2435.0, volatility: 0.004, class: 'CX', unitDecimals: 2 },
  SOL: { ticker: 'SOL', name: 'Solana', basePrice: 99.5, volatility: 0.0055, class: 'CX', unitDecimals: 2 },
  SUI: { ticker: 'SUI', name: 'Sui Network', basePrice: 0.72, volatility: 0.006, class: 'CX', unitDecimals: 4 },
  DOGE: { ticker: 'DOGE', name: 'Dogecoin', basePrice: 0.081, volatility: 0.006, class: 'CX', unitDecimals: 5 },
  XRP: { ticker: 'XRP', name: 'Ripple', basePrice: 1.29, volatility: 0.005, class: 'CX', unitDecimals: 4 },
  AVAX: { ticker: 'AVAX', name: 'Avalanche', basePrice: 7.52, volatility: 0.005, class: 'CX', unitDecimals: 2 },
  ADA: { ticker: 'ADA', name: 'Cardano', basePrice: 0.198, volatility: 0.005, class: 'CX', unitDecimals: 4 },
  LINK: { ticker: 'LINK', name: 'Chainlink', basePrice: 11.14, volatility: 0.004, class: 'CX', unitDecimals: 2 },
  NEAR: { ticker: 'NEAR', name: 'Near Protocol', basePrice: 2.79, volatility: 0.006, class: 'CX', unitDecimals: 3 },
  PEPE: { ticker: 'PEPE', name: 'Pepe', basePrice: 0.00000345, volatility: 0.008, class: 'CX', unitDecimals: 8 },
  TAO: { ticker: 'TAO', name: 'Bittensor', basePrice: 226.2, volatility: 0.006, class: 'CX', unitDecimals: 2 },
  APT: { ticker: 'APT', name: 'Aptos', basePrice: 0.575, volatility: 0.006, class: 'CX', unitDecimals: 4 },
  BNB: { ticker: 'BNB', name: 'BNB Chain', basePrice: 592.0, volatility: 0.003, class: 'CX', unitDecimals: 2 },
  AAPL: { ticker: 'AAPL', name: 'Apple Inc.', basePrice: 228.4, volatility: 0.002, class: 'EQ', unitDecimals: 2 },
  TSLA: { ticker: 'TSLA', name: 'Tesla Inc.', basePrice: 248.8, volatility: 0.006, class: 'EQ', unitDecimals: 2 },
  NVDA: { ticker: 'NVDA', name: 'Nvidia Corp.', basePrice: 132.8, volatility: 0.0045, class: 'EQ', unitDecimals: 2 },
  NVDAon: { ticker: 'NVDAon', name: 'Nvidia Corp (rToken 7x24)', basePrice: 132.8, volatility: 0.0045, class: 'EQ', unitDecimals: 2 },
  TSLAon: { ticker: 'TSLAon', name: 'Tesla Inc (rToken 7x24)', basePrice: 248.8, volatility: 0.006, class: 'EQ', unitDecimals: 2 },
  MSFT: { ticker: 'MSFT', name: 'Microsoft Corp.', basePrice: 418.5, volatility: 0.002, class: 'EQ', unitDecimals: 2 },
  GOOGL: { ticker: 'GOOGL', name: 'Alphabet Inc.', basePrice: 172.6, volatility: 0.0025, class: 'EQ', unitDecimals: 2 },
  AMZN: { ticker: 'AMZN', name: 'Amazon.com Inc.', basePrice: 198.3, volatility: 0.003, class: 'EQ', unitDecimals: 2 },
  META: { ticker: 'META', name: 'Meta Platforms', basePrice: 578.0, volatility: 0.0035, class: 'EQ', unitDecimals: 2 },
  MSTR: { ticker: 'MSTR', name: 'MicroStrategy', basePrice: 131.0, volatility: 0.008, class: 'EQ', unitDecimals: 2 },
  COIN: { ticker: 'COIN', name: 'Coinbase Global', basePrice: 175.3, volatility: 0.007, class: 'EQ', unitDecimals: 2 },
  PLTR: { ticker: 'PLTR', name: 'Palantir Tech', basePrice: 68.7, volatility: 0.005, class: 'EQ', unitDecimals: 2 },
  AMD: { ticker: 'AMD', name: 'Advanced Micro Devices', basePrice: 145.2, volatility: 0.005, class: 'EQ', unitDecimals: 2 },
};

// Internal tracked state for random walk continuous motion
const lastGeneratedPrices: Record<string, number> = {};

// Active market shock multiplier for demo tests (e.g. -12% for stop loss verification)
let activeShockMultiplier: Record<string, number> = {};

export function setAssetShock(ticker: string, multiplier: number) {
  activeShockMultiplier[ticker] = multiplier;
}

export function clearAssetShocks() {
  activeShockMultiplier = {};
}

/**
 * Returns seeded price with realistic random walk drift and strict deviation sanity guard.
 */
export function getSeededPrice(ticker: string, currentPrice?: number): number {
  const normTicker = (ticker || 'BTC').toUpperCase().trim();
  const asset = SEEDED_ASSETS[normTicker] || SEEDED_ASSETS[normTicker.replace('/USDT', '')];
  
  const candidate = currentPrice || lastGeneratedPrices[normTicker];
  // If not seeded but candidate is a valid positive price, adopt candidate as targetBase
  const targetBase = asset ? asset.basePrice : (candidate && candidate > 0 ? candidate : 100);
  
  // Strict Sanity Check: If currentPrice or cached price is corrupt or drifted > 20%, snap back to targetBase
  let base = targetBase;
  if (candidate && Number.isFinite(candidate) && candidate > 0) {
    const deviation = Math.abs(candidate - targetBase) / targetBase;
    if (deviation <= 0.20) {
      base = candidate;
    }
  }

  const vol = asset ? asset.volatility : 0.004;

  // Box-Muller normal distribution approximation
  const u1 = Math.max(0.0001, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // Strong mean reversion towards basePrice to avoid runaway drift
  const meanReversion = (targetBase - base) * 0.05;
  const step = base * (vol * z0 + meanReversion);

  let newPrice = Math.max(0.0001, base + step);

  // Apply active scenario shock if configured (e.g. flash crash)
  if (activeShockMultiplier[ticker]) {
    newPrice *= activeShockMultiplier[ticker];
  }

  const decimals = asset ? asset.unitDecimals : 2;
  const rounded = Number(newPrice.toFixed(decimals));
  lastGeneratedPrices[ticker] = rounded;
  return rounded;
}
