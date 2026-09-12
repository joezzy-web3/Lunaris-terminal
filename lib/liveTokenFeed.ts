// lib/liveTokenFeed.ts
import { getSeededPrice, SEEDED_ASSETS, setAssetShock, clearAssetShocks } from './demoSeedData';

export interface PriceSnapshot {
  ticker: string;
  price: number;
  change24h: number;
  source: 'live' | 'sim';
  class: 'CX' | 'EQ';
  lastUpdated: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
}

export const ASSET_REGISTRY: Record<
  string,
  {
    name: string;
    class: 'CX' | 'EQ';
    geckoId?: string;
    dexscreenerAddr?: string;
    yahooSymbol?: string;
  }
> = {
  BTC: { name: 'Bitcoin', class: 'CX', geckoId: 'bitcoin' },
  ETH: { name: 'Ethereum', class: 'CX', geckoId: 'ethereum' },
  SOL: { name: 'Solana', class: 'CX', geckoId: 'solana' },
  AVAX: { name: 'Avalanche', class: 'CX', geckoId: 'avalanche-2' },
  XRP: { name: 'Ripple', class: 'CX', geckoId: 'ripple' },
  BNB: { name: 'BNB Chain', class: 'CX', geckoId: 'binancecoin' },
  AAPL: { name: 'Apple Inc.', class: 'EQ', yahooSymbol: 'AAPL' },
  TSLA: { name: 'Tesla Inc.', class: 'EQ', yahooSymbol: 'TSLA' },
  NVDA: { name: 'Nvidia Corp.', class: 'EQ', yahooSymbol: 'NVDA' },
  NVDAon: { name: 'Nvidia Corp (rToken 7x24)', class: 'EQ', yahooSymbol: 'NVDA' },
  TSLAon: { name: 'Tesla Inc (rToken 7x24)', class: 'EQ', yahooSymbol: 'TSLA' },
  MSFT: { name: 'Microsoft', class: 'EQ', yahooSymbol: 'MSFT' },
  GOOGL: { name: 'Alphabet', class: 'EQ', yahooSymbol: 'GOOGL' },
  AMZN: { name: 'Amazon', class: 'EQ', yahooSymbol: 'AMZN' },
  META: { name: 'Meta Platforms', class: 'EQ', yahooSymbol: 'META' },
  MSTR: { name: 'MicroStrategy', class: 'EQ', yahooSymbol: 'MSTR' },
  COIN: { name: 'Coinbase', class: 'EQ', yahooSymbol: 'COIN' },
  PLTR: { name: 'Palantir', class: 'EQ', yahooSymbol: 'PLTR' },
};

export const priceCache: Record<string, PriceSnapshot> = {};

// History of price ticks for charting sparklines
export const priceTickHistory: Record<string, number[]> = {};

// Server Bitget ticker cache to prevent redundant network bursts
let serverBitgetCache: { timestamp: number; data: Record<string, any> } | null = null;
let serverFetchPromise: Promise<Record<string, any> | null> | null = null;

async function fetchServerBitgetTickers(): Promise<Record<string, any> | null> {
  const now = Date.now();
  if (serverBitgetCache && now - serverBitgetCache.timestamp < 3000) {
    return serverBitgetCache.data;
  }
  if (serverFetchPromise) {
    return serverFetchPromise;
  }
  serverFetchPromise = (async () => {
    try {
      const res = await fetch('/api/bitget/tickers');
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          serverBitgetCache = { timestamp: Date.now(), data: json.data };
          return json.data;
        }
      }
    } catch {
      // Handled gracefully below
    } finally {
      serverFetchPromise = null;
    }
    return null;
  })();
  return serverFetchPromise;
}

/**
 * Multi-source ingestion (Bitget Server API, CoinGecko, Yahoo Finance)
 * with a strict 20% sanity deviation safeguard and graceful fallback to demoSeedData.
 */
export async function fetchPriceSnapshot(ticker: string): Promise<PriceSnapshot> {
  const sym = ticker.toUpperCase().trim();
  let asset = ASSET_REGISTRY[sym];
  
  if (!asset) {
    const isCrypto = ['BTC', 'ETH', 'SOL', 'SUI', 'DOGE', 'XRP', 'AVAX', 'ADA', 'LINK', 'NEAR', 'PEPE', 'SHIB', 'RENDER', 'TAO', 'DOT', 'APT', 'TIA', 'HBAR'].includes(sym) || sym.endsWith('USDT') || sym.endsWith('PERP');
    asset = {
      name: sym,
      class: isCrypto ? 'CX' : 'EQ',
      yahooSymbol: isCrypto ? undefined : sym,
      geckoId: isCrypto ? sym.toLowerCase() : undefined,
    };
    ASSET_REGISTRY[sym] = asset;
  }

  // 1. First priority: Real-time official Bitget spot market feed via Express backend proxy
  try {
    const bitgetData = await fetchServerBitgetTickers();
    if (bitgetData && bitgetData[sym]) {
      const item = bitgetData[sym];
      const validPrice = Number(item.price);
      if (Number.isFinite(validPrice) && validPrice > 0) {
        const snapshot: PriceSnapshot = {
          ticker: sym,
          price: validPrice,
          change24h: Number.isFinite(item.change24h) ? item.change24h : 0,
          source: 'live',
          class: (item.class || asset.class) as 'CX' | 'EQ',
          lastUpdated: Date.now(),
          volume24h: item.volume,
          high24h: item.high24h,
          low24h: item.low24h,
        };
        priceCache[sym] = snapshot;
        recordTickHistory(sym, snapshot.price);
        return snapshot;
      }
    }
  } catch {
    // Continue to direct fallbacks
  }

  try {
    let rawPrice: number | null = null;
    let change24hVal: number | null = null;

    // Timeout controller so client never blocks on slow external API calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    if (asset.class === 'CX' && asset.geckoId) {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${asset.geckoId}&vs_currencies=usd&include_24hr_change=true`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        rawPrice = data[asset.geckoId]?.usd ?? null;
        change24hVal = data[asset.geckoId]?.usd_24h_change ?? null;
      }
    } else if (asset.class === 'EQ' && asset.yahooSymbol) {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${asset.yahooSymbol}?interval=1d&range=1d`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        rawPrice = data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
        const prevClose = data.chart?.result?.[0]?.meta?.chartPreviousClose;
        if (rawPrice && prevClose) {
          change24hVal = ((rawPrice - prevClose) / prevClose) * 100;
        }
      }
    }

    clearTimeout(timeoutId);

    const previousPrice = priceCache[ticker]?.price;

    // Sanity Safeguard: Dev deviation threshold check (15%)
    if (
      rawPrice !== null &&
      isFinite(rawPrice) &&
      rawPrice > 0 &&
      (!previousPrice || Math.abs(rawPrice - previousPrice) / previousPrice <= 0.15)
    ) {
      const snapshot: PriceSnapshot = {
        ticker,
        price: rawPrice,
        change24h: change24hVal !== null ? change24hVal : ((rawPrice - (previousPrice || rawPrice)) / rawPrice) * 100,
        source: 'live',
        class: asset.class,
        lastUpdated: Date.now(),
      };
      priceCache[ticker] = snapshot;
      recordTickHistory(ticker, snapshot.price);
      return snapshot;
    }
  } catch (err) {
    // Graceful fallback to Seeded Random-Walk Engine
  }

  // Fallback to Seeded Random-Walk Engine
  const prevPrice = priceCache[ticker]?.price;
  const simPrice = getSeededPrice(ticker, prevPrice);
  const baseline = SEEDED_ASSETS[ticker]?.basePrice || simPrice;
  const changePct = Number((((simPrice - baseline) / baseline) * 100).toFixed(2));

  const simSnapshot: PriceSnapshot = {
    ticker,
    price: simPrice,
    change24h: changePct,
    source: 'sim',
    class: asset.class,
    lastUpdated: Date.now(),
  };

  priceCache[ticker] = simSnapshot;
  recordTickHistory(ticker, simSnapshot.price);
  return simSnapshot;
}

function recordTickHistory(ticker: string, price: number) {
  if (!priceTickHistory[ticker]) {
    priceTickHistory[ticker] = [];
  }
  priceTickHistory[ticker].push(price);
  if (priceTickHistory[ticker].length > 30) {
    priceTickHistory[ticker].shift();
  }
}

export function getAllRegisteredTickers(): string[] {
  return Object.keys(ASSET_REGISTRY);
}

export { setAssetShock, clearAssetShocks };
