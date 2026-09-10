import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBitgetFeed } from '../hooks/useBitgetFeed';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'SUIUSDT'];

export default function LiveTicker() {
  const { tickers, isConnected } = useBitgetFeed(SYMBOLS);
  const navigate = useNavigate();

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 p-3 flex items-center gap-6 overflow-x-auto">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-500'}`} />
        <span className="text-xs text-slate-400 uppercase font-mono">
          Bitget Feed: {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {SYMBOLS.map((symbol) => {
          const data = tickers[symbol] || {};
          const isPositive = (data.change24h || 0) >= 0;

          return (
            <button
              key={symbol}
              onClick={() => navigate(`/chart/${symbol}`)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition text-left"
            >
              <span className="font-bold text-slate-200 text-sm">{symbol.replace('USDT', '')}</span>
              <span className="font-mono text-slate-100 text-sm">
                ${data.price ? data.price.toLocaleString() : '---'}
              </span>
              {data.change24h !== undefined && (
                <span className={`text-xs font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {isPositive ? '+' : ''}{(data.change24h * 100).toFixed(2)}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
