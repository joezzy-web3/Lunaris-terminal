// api/market/quote.ts
// Vercel Serverless Function: On-demand quote for any single asset

export const config = {
  maxDuration: 10,
};

const FALLBACKS: Record<string, { price: number; change24h: number; class: 'CX' | 'EQ' }> = {
  BTC: { price: 85465.0, change24h: 0.45, class: 'CX' },
  ETH: { price: 2722.0, change24h: 1.20, class: 'CX' },
  SOL: { price: 116.9, change24h: 2.30, class: 'CX' },
  SUI: { price: 0.85, change24h: 4.15, class: 'CX' },
  NVDA: { price: 132.8, change24h: 1.45, class: 'EQ' },
  NVDAON: { price: 132.8, change24h: 1.45, class: 'EQ' },
  TSLA: { price: 248.8, change24h: 0.52, class: 'EQ' },
  TSLAON: { price: 248.8, change24h: 0.52, class: 'EQ' },
  AAPL: { price: 228.4, change24h: 0.85, class: 'EQ' },
  MSTR: { price: 131.0, change24h: 2.15, class: 'EQ' },
  COIN: { price: 175.3, change24h: 1.63, class: 'EQ' },
  PLTR: { price: 68.7, change24h: 1.25, class: 'EQ' },
  AMD: { price: 145.2, change24h: -0.45, class: 'EQ' },
  MSFT: { price: 418.5, change24h: 0.42, class: 'EQ' },
  GOOGL: { price: 172.6, change24h: 0.65, class: 'EQ' },
  AMZN: { price: 198.3, change24h: 0.78, class: 'EQ' },
  META: { price: 578.0, change24h: 1.12, class: 'EQ' },
  MARA: { price: 19.8, change24h: 3.42, class: 'EQ' },
  AVGO: { price: 172.5, change24h: 1.64, class: 'EQ' },
  QQQ: { price: 492.0, change24h: 0.92, class: 'EQ' },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const raw = String(req.query?.ticker || 'BTC').trim().toUpperCase();
  const sym = raw.replace('/USDT', '').replace('-USD', '');
  const clean = sym.replace('ON', '');

  const isCrypto = !['NVDA', 'TSLA', 'AAPL', 'MSTR', 'COIN', 'PLTR', 'AMD', 'MSFT', 'GOOGL', 'AMZN', 'META', 'MARA', 'AVGO', 'QQQ'].includes(clean);

  if (isCrypto) {
    try {
      const bitgetRes = await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${clean}USDT`, {
        signal: AbortSignal.timeout(2500),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (bitgetRes.ok) {
        const payload: any = await bitgetRes.json();
        const item = payload?.data?.[0];
        if (item && item.lastPr) {
          const p = parseFloat(item.lastPr);
          const chg = Number((parseFloat(item.change24h || '0') * 100).toFixed(2));
          return res.status(200).json({
            success: true,
            source: 'bitget_direct',
            quote: {
              ticker: clean,
              price: p,
              change24h: chg,
              high24h: parseFloat(item.high24h || `${p * 1.02}`),
              low24h: parseFloat(item.low24h || `${p * 0.98}`),
              volume: `$${(parseFloat(item.usdtVolume || '0') / 1e6).toFixed(1)}M`,
              class: 'CX',
            },
          });
        }
      }
    } catch {
      // Continue to fallback
    }
  } else {
    try {
      const stockRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${clean}?interval=1d&range=1d`, {
        signal: AbortSignal.timeout(2500),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });
      if (stockRes.ok) {
        const stockData: any = await stockRes.json();
        const meta = stockData.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          const price = parseFloat(meta.regularMarketPrice.toFixed(2));
          const prev = meta.chartPreviousClose || price;
          const chg = Number((((price - prev) / prev) * 100).toFixed(2));
          return res.status(200).json({
            success: true,
            source: 'yahoo_direct',
            quote: {
              ticker: clean,
              price,
              change24h: chg,
              high24h: parseFloat((meta.regularMarketDayHigh || price * 1.015).toFixed(2)),
              low24h: parseFloat((meta.regularMarketDayLow || price * 0.985).toFixed(2)),
              volume: `$${(((meta.regularMarketVolume || 1000000) * price) / 1e6).toFixed(1)}M`,
              class: 'EQ',
            },
          });
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  const fb = FALLBACKS[sym] || FALLBACKS[clean] || { price: isCrypto ? 1.0 : 100.0, change24h: 1.0, class: isCrypto ? 'CX' : 'EQ' };
  return res.status(200).json({
    success: true,
    source: 'baseline_quote',
    quote: {
      ticker: clean,
      price: fb.price,
      change24h: fb.change24h,
      high24h: fb.price * 1.02,
      low24h: fb.price * 0.98,
      volume: '$120M',
      class: fb.class,
    },
  });
}
