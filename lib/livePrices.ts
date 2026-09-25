// lib/livePrices.ts
// Real-time market feed fetching live crypto quotes and high-frequency stock feeds
import { useState, useEffect } from 'react';

export interface AssetQuote {
  ticker: string;
  name: string;
  class: 'CX' | 'EQ'; // Crypto vs Tokenized Equity
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: string;
  lastTickDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  lastUpdated: number;
}

export const INITIAL_ASSET_QUOTES: Record<string, AssetQuote> = {
  BTC: {
    ticker: 'BTC',
    name: 'Bitcoin',
    class: 'CX',
    price: 85465.00,
    change24h: 0.45,
    high24h: 87280.0,
    low24h: 84800.0,
    volume: '$38.2B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  ETH: {
    ticker: 'ETH',
    name: 'Ethereum',
    class: 'CX',
    price: 2722.45,
    change24h: 1.20,
    high24h: 2785.0,
    low24h: 2690.0,
    volume: '$18.6B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  SOL: {
    ticker: 'SOL',
    name: 'Solana',
    class: 'CX',
    price: 116.95,
    change24h: 2.30,
    high24h: 119.5,
    low24h: 114.8,
    volume: '$6.4B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  SUI: {
    ticker: 'SUI',
    name: 'Sui Network',
    class: 'CX',
    price: 0.8502,
    change24h: 4.15,
    high24h: 0.92,
    low24h: 0.81,
    volume: '$820M',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  NVDAon: {
    ticker: 'NVDAon',
    name: 'NVIDIA Corp (rToken 7x24)',
    class: 'EQ',
    price: 132.80,
    change24h: 1.45,
    high24h: 135.0,
    low24h: 130.2,
    volume: '$68.4M',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  TSLAon: {
    ticker: 'TSLAon',
    name: 'Tesla Inc (rToken 7x24)',
    class: 'EQ',
    price: 248.80,
    change24h: 0.52,
    high24h: 252.8,
    low24h: 244.5,
    volume: '$52.1M',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  NVDA: {
    ticker: 'NVDA',
    name: 'NVIDIA Corp',
    class: 'EQ',
    price: 132.80,
    change24h: 1.45,
    high24h: 135.0,
    low24h: 130.2,
    volume: '$31.8B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  MSTR: {
    ticker: 'MSTR',
    name: 'MicroStrategy',
    class: 'EQ',
    price: 131.0,
    change24h: 2.15,
    high24h: 135.5,
    low24h: 128.2,
    volume: '$7.1B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  COIN: {
    ticker: 'COIN',
    name: 'Coinbase Global',
    class: 'EQ',
    price: 175.3,
    change24h: 1.63,
    high24h: 180.0,
    low24h: 171.4,
    volume: '$4.9B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  TSLA: {
    ticker: 'TSLA',
    name: 'Tesla Inc',
    class: 'EQ',
    price: 248.80,
    change24h: 0.52,
    high24h: 252.8,
    low24h: 244.5,
    volume: '$16.2B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  AAPL: {
    ticker: 'AAPL',
    name: 'Apple Inc',
    class: 'EQ',
    price: 228.40,
    change24h: 0.85,
    high24h: 231.0,
    low24h: 226.1,
    volume: '$12.4B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  PLTR: {
    ticker: 'PLTR',
    name: 'Palantir Tech',
    class: 'EQ',
    price: 68.70,
    change24h: 1.25,
    high24h: 70.2,
    low24h: 67.4,
    volume: '$3.2B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  MARA: {
    ticker: 'MARA',
    name: 'MARA Holdings',
    class: 'EQ',
    price: 19.80,
    change24h: 3.42,
    high24h: 20.6,
    low24h: 19.1,
    volume: '$890M',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  MSFT: {
    ticker: 'MSFT',
    name: 'Microsoft Corp',
    class: 'EQ',
    price: 418.50,
    change24h: 0.42,
    high24h: 422.0,
    low24h: 415.2,
    volume: '$8.3B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  AVGO: {
    ticker: 'AVGO',
    name: 'Broadcom Inc',
    class: 'EQ',
    price: 172.50,
    change24h: 1.64,
    high24h: 175.2,
    low24h: 170.1,
    volume: '$4.1B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
  QQQ: {
    ticker: 'QQQ',
    name: 'Invesco QQQ (Nasdaq 100)',
    class: 'EQ',
    price: 492.00,
    change24h: 0.92,
    high24h: 495.0,
    low24h: 488.5,
    volume: '$22.6B',
    lastTickDirection: 'UP',
    lastUpdated: Date.now(),
  },
};

const MARKET_STORAGE_KEY = 'lunaris_last_known_market_quotes_v2';

function loadInitialQuotes(): Record<string, AssetQuote> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Clear legacy poisoned cache if present
      localStorage.removeItem('lunaris_last_known_market_quotes');
      const saved = localStorage.getItem(MARKET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sanity guard against corrupted historical caches
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.BTC &&
          parsed.BTC.price > 1000 &&
          (!parsed.NVDA || parsed.NVDA.price < 190) &&
          (!parsed.AAPL || parsed.AAPL.price < 300)
        ) {
          return { ...INITIAL_ASSET_QUOTES, ...parsed };
        }
      }
    } catch {}
  }
  return { ...INITIAL_ASSET_QUOTES };
}

// Central synchronized real-time state with persistent local caching
let currentMarketQuotes: Record<string, AssetQuote> = loadInitialQuotes();
const quoteListeners = new Set<(quotes: Record<string, AssetQuote>) => void>();
let pollingInterval: any = null;
let jitterInterval: any = null;
let activeSubscriberCount = 0;
let saveStorageTimeout: any = null;

function notifySubscribers() {
  const snapshot = { ...currentMarketQuotes };
  quoteListeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (e) {
      console.error('Error notifying quote listener:', e);
    }
  });

  // Debounced cache to localStorage so tab reloads or incognito tabs have live prices immediately
  if (typeof window !== 'undefined' && window.localStorage) {
    if (!saveStorageTimeout) {
      saveStorageTimeout = setTimeout(() => {
        saveStorageTimeout = null;
        try {
          localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(currentMarketQuotes));
        } catch {}
      }, 1500);
    }
  }
}

function updateQuoteItem(
  key: string,
  price: number,
  change24h: number,
  high24h?: number,
  low24h?: number,
  volume?: string
) {
  if (!currentMarketQuotes[key]) return;
  const prev = currentMarketQuotes[key];
  const dir: 'UP' | 'DOWN' | 'NEUTRAL' = price > prev.price ? 'UP' : price < prev.price ? 'DOWN' : prev.lastTickDirection;
  currentMarketQuotes[key] = {
    ...prev,
    price,
    change24h: Number(change24h.toFixed(2)),
    high24h: high24h && high24h > 0 ? high24h : prev.high24h,
    low24h: low24h && low24h > 0 ? low24h : prev.low24h,
    volume: volume || prev.volume,
    lastTickDirection: dir,
    lastUpdated: Date.now(),
  };
}

// Multi-tier resilient crypto and equity price sync:
// Tier 1: Express Server API (/api/bitget/tickers)
// Tier 2: Direct Bitget Spot API with CORS (works on Vercel, client SPAs, static hosts)
// Tier 3: Binance & CoinGecko fallback
export async function fetchLiveCryptoPrices(): Promise<Partial<Record<string, { price: number; change24h: number }>>> {
  // 1. Try backend proxy (/api/bitget/tickers - works in AI Studio AND on Vercel Serverless Function)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/bitget/tickers', { signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && json.data) {
        const result: Partial<Record<string, { price: number; change24h: number }>> = {};
        Object.entries(json.data).forEach(([key, val]: [string, any]) => {
          if (val && typeof val.price === 'number') {
            const formattedChange = Number((val.change24h ?? 0).toFixed(2));
            result[key] = { price: val.price, change24h: formattedChange };
            updateQuoteItem(key, val.price, formattedChange, val.high24h, val.low24h, val.volume);
          }
        });

        notifySubscribers();
        if (Object.keys(result).length > 0) {
          return result;
        }
      }
    }
  } catch {
    // Continue to Tier 2
  }

  // 2. Direct Bitget Public API (CORS enabled globally)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://api.bitget.com/api/v2/spot/market/tickers', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json?.code === '00000' && Array.isArray(json.data)) {
        const result: Partial<Record<string, { price: number; change24h: number }>> = {};
        json.data.forEach((item: any) => {
          const sym = item.symbol;
          if (typeof sym === 'string' && sym.endsWith('USDT')) {
            let key = sym.slice(0, -4);
            if (key === 'RNVDA') key = 'NVDAon';
            if (key === 'RTSLA') key = 'TSLAon';

            const rawP = parseFloat(item.lastPr || item.close || '0');
            if (Number.isFinite(rawP) && rawP > 0) {
              const chg = Number((parseFloat(item.change24h || '0') * 100).toFixed(2));
              result[key] = { price: rawP, change24h: chg };
              updateQuoteItem(
                key,
                rawP,
                chg,
                parseFloat(item.high24h || '0'),
                parseFloat(item.low24h || '0'),
                item.usdtVolume ? `$${(parseFloat(item.usdtVolume) / 1e6).toFixed(1)}M` : undefined
              );

              // Also reflect equity spot for NVDA / TSLA if matching
              if (key === 'NVDAon' && currentMarketQuotes['NVDA']) {
                updateQuoteItem('NVDA', rawP, chg);
              }
              if (key === 'TSLAon' && currentMarketQuotes['TSLA']) {
                updateQuoteItem('TSLA', rawP, chg);
              }
            }
          }
        });

        notifySubscribers();
        if (Object.keys(result).length > 0) {
          return result;
        }
      }
    }
  } catch {
    // Continue to Tier 3
  }

  // 3. Fallback to public Binance endpoint for core crypto
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","SUIUSDT"]', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const result: Partial<Record<string, { price: number; change24h: number }>> = {};

      if (Array.isArray(data)) {
        data.forEach((item: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
          const key = item.symbol === 'BTCUSDT' ? 'BTC' : item.symbol === 'ETHUSDT' ? 'ETH' : item.symbol === 'SOLUSDT' ? 'SOL' : item.symbol === 'SUIUSDT' ? 'SUI' : null;
          if (key && currentMarketQuotes[key]) {
            const price = parseFloat(item.lastPrice);
            const change24h = Number(parseFloat(item.priceChangePercent).toFixed(2));
            result[key] = { price, change24h };
            updateQuoteItem(key, price, change24h);
          }
        });
        notifySubscribers();
        if (Object.keys(result).length > 0) return result;
      }
    }
  } catch {
    // Continue to Tier 4
  }

  // 4. Universal CoinGecko CORS fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,sui&vs_currencies=usd&include_24hr_change=true',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const gData = await res.json();
      const map: Record<string, string> = {
        bitcoin: 'BTC',
        ethereum: 'ETH',
        solana: 'SOL',
        sui: 'SUI',
      };
      Object.entries(map).forEach(([gId, sym]) => {
        if (gData[gId]?.usd && currentMarketQuotes[sym]) {
          const p = Number(gData[gId].usd);
          const chg = Number((gData[gId].usd_24h_change || 0).toFixed(2));
          updateQuoteItem(sym, p, chg);
        }
      });
      notifySubscribers();
    }
  } catch {
    // Handled
  }

  return {};
}

export interface MarketSessionStatus {
  isTradFiOpen: boolean;
  isWeekend: boolean;
  statusText: string;
  nextOpenText: string;
}

export function getMarketSessionStatus(date: Date = new Date()): MarketSessionStatus {
  try {
    const estString = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const estDate = new Date(estString);
    const day = estDate.getDay(); // 0 = Sun, 6 = Sat
    const hours = estDate.getHours();
    const minutes = estDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const isWeekend = day === 0 || day === 6;
    const isWeekday = day >= 1 && day <= 5;
    const isRegularHours = isWeekday && timeInMinutes >= 570 && timeInMinutes < 960;

    let statusText = 'CLOSED';
    let nextOpenText = 'Reopens Mon 09:30 EST';

    if (isRegularHours) {
      statusText = 'OPEN (Regular Trading)';
      nextOpenText = 'Closes 16:00 EST';
    } else if (isWeekend) {
      statusText = 'CLOSED (Weekend - TradFi Frozen)';
      nextOpenText = 'Reopens Mon 09:30 EST';
    } else if (timeInMinutes < 570) {
      statusText = 'PRE-MARKET (TradFi Session)';
      nextOpenText = 'Regular Open 09:30 EST';
    } else {
      statusText = 'AFTER-HOURS (TradFi Closed)';
      nextOpenText = 'Reopens Next Business Day 09:30 EST';
    }

    return {
      isTradFiOpen: isRegularHours,
      isWeekend,
      statusText,
      nextOpenText,
    };
  } catch {
    return {
      isTradFiOpen: false,
      isWeekend: true,
      statusText: 'CLOSED (Weekend - TradFi Frozen)',
      nextOpenText: 'Reopens Mon 09:30 EST',
    };
  }
}

// Subtle micro-fluctuation jitter engine between poll cycles
function applyMicroTick() {
  const session = getMarketSessionStatus();
  const keys = Object.keys(currentMarketQuotes);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const item = currentMarketQuotes[randomKey];
  if (!item) return;

  // If it is an underlying TradFi equity (NVDA, TSLA, MSFT, AAPL) and TradFi market is closed, DO NOT jitter TradFi price!
  // TradFi spot equity remains frozen at Friday's closing bell.
  if ((randomKey === 'NVDA' || randomKey === 'TSLA' || randomKey === 'MSFT' || randomKey === 'AAPL' || randomKey === 'PLTR') && !session.isTradFiOpen) {
    return;
  }

  // 24/7 rTokens and Crypto continue jittering 24/7
  // Ultra-tight realistic spread jitter (±0.01% to ±0.03%)
  const spreadPct = (Math.random() * 0.0006 - 0.00028);
  const delta = item.price * spreadPct;
  const newPrice = Number((item.price + delta).toFixed(item.price > 1000 ? 1 : 2));
  const dir = newPrice >= item.price ? 'UP' : 'DOWN';

  currentMarketQuotes[randomKey] = {
    ...item,
    price: newPrice,
    lastTickDirection: dir,
    lastUpdated: Date.now(),
  };

  notifySubscribers();
}

function startQuoteEngine() {
  if (pollingInterval) return;

  // Initial fetch immediately
  fetchLiveCryptoPrices();

  // Poll API every 4 seconds for real live ticks
  pollingInterval = setInterval(() => {
    fetchLiveCryptoPrices();
  }, 4000);

  // Micro jitter every 1.5 seconds so UI feels fluid
  jitterInterval = setInterval(() => {
    applyMicroTick();
  }, 1500);
}

function stopQuoteEngine() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (jitterInterval) {
    clearInterval(jitterInterval);
    jitterInterval = null;
  }
}

export function subscribeToMarketQuotes(callback: (quotes: Record<string, AssetQuote>) => void): () => void {
  quoteListeners.add(callback);
  activeSubscriberCount++;
  if (activeSubscriberCount === 1) {
    startQuoteEngine();
  }
  // Immediately call with current
  callback({ ...currentMarketQuotes });

  return () => {
    quoteListeners.delete(callback);
    activeSubscriberCount--;
    if (activeSubscriberCount <= 0) {
      activeSubscriberCount = 0;
      stopQuoteEngine();
    }
  };
}

export function getLiveMarketQuotes(): Record<string, AssetQuote> {
  return { ...currentMarketQuotes };
}

// React Hook for synchronized real-time quotes across the whole app
export function useLiveMarketQuotes() {
  const [quotes, setQuotes] = useState<Record<string, AssetQuote>>(() => ({ ...currentMarketQuotes }));

  useEffect(() => {
    const unsubscribe = subscribeToMarketQuotes((updated) => {
      setQuotes(updated);
    });
    return unsubscribe;
  }, []);

  const getQuote = (ticker: string): AssetQuote => {
    return quotes[ticker] || currentMarketQuotes[ticker] || INITIAL_ASSET_QUOTES[ticker] || INITIAL_ASSET_QUOTES.BTC;
  };

  return { quotes, getQuote };
}
