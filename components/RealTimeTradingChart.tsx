// components/RealTimeTradingChart.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AssetQuote, INITIAL_ASSET_QUOTES } from '@/lib/livePrices';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Maximize2,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { TradeProposal } from '@/lib/riskVeto';
import { playCyberClick } from '@/lib/soundSynth';

interface RealTimeTradingChartProps {
  selectedTicker?: string;
  onSelectTicker?: (ticker: string) => void;
  onExecuteTrade?: (proposal: TradeProposal) => void;
}

interface PriceCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  direction: 'UP' | 'DOWN';
}

export const RealTimeTradingChart: React.FC<RealTimeTradingChartProps> = ({
  selectedTicker = 'BTC',
  onSelectTicker,
  onExecuteTrade,
}) => {
  const [ticker, setTicker] = useState<string>(selectedTicker);
  const [timeframe, setTimeframe] = useState<'1s' | '1m' | '5m' | '15m'>('1s');
  const [chartType, setChartType] = useState<'AREA' | 'CANDLES'>('AREA');
  const [orderAmount, setOrderAmount] = useState<number>(1000);
  const [candles, setCandles] = useState<PriceCandle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(INITIAL_ASSET_QUOTES[selectedTicker]?.price || 88420);
  const [lastDirection, setLastDirection] = useState<'UP' | 'DOWN'>('UP');
  const [spikeIntensity, setSpikeIntensity] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<PriceCandle | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync when prop changes
  useEffect(() => {
    if (selectedTicker && selectedTicker !== ticker) {
      setTicker(selectedTicker);
    }
  }, [selectedTicker]);

  // Seed baseline historical candles on ticker change
  useEffect(() => {
    const baseQuote = INITIAL_ASSET_QUOTES[ticker] || INITIAL_ASSET_QUOTES.BTC;
    const basePrice = baseQuote.price;
    setCurrentPrice(basePrice);

    const now = Date.now();
    const intervalMs = timeframe === '1s' ? 1000 : timeframe === '1m' ? 60000 : 300000;
    const count = 50;

    const initialCandles: PriceCandle[] = [];
    let p = basePrice * 0.985;

    for (let i = count; i >= 0; i--) {
      const delta = (Math.random() - 0.48) * (basePrice * 0.004);
      const open = p;
      p = Math.max(basePrice * 0.8, p + delta);
      const high = Math.max(open, p) + Math.random() * (basePrice * 0.002);
      const low = Math.min(open, p) - Math.random() * (basePrice * 0.002);
      const close = p;
      const dir = close >= open ? 'UP' : 'DOWN';

      initialCandles.push({
        timestamp: now - i * intervalMs,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 500) + 100,
        direction: dir,
      });
    }

    setCandles(initialCandles);
  }, [ticker, timeframe]);

  // Real-Time High Frequency Tick Engine
  useEffect(() => {
    const tickSpeed = timeframe === '1s' ? 800 : 2200;
    const interval = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];

        // Random price impulse with slight momentum
        const volatility = ticker === 'BTC' || ticker === 'ETH' ? 0.0025 : 0.004;
        const isSpikeTick = Math.random() > 0.82;
        const deltaPct = (Math.random() * 2 - 0.98) * volatility * (isSpikeTick ? 2.5 : 1);
        const nextPrice = Number((last.close * (1 + deltaPct)).toFixed(last.close > 1000 ? 1 : 2));

        const dir: 'UP' | 'DOWN' = nextPrice >= last.close ? 'UP' : 'DOWN';
        setLastDirection(dir);
        setCurrentPrice(nextPrice);

        if (isSpikeTick) {
          setSpikeIntensity(dir === 'UP' ? 1 : -1);
          setTimeout(() => setSpikeIntensity(0), 1000);
        }

        const updatedLast: PriceCandle = {
          ...last,
          high: Math.max(last.high, nextPrice),
          low: Math.min(last.low, nextPrice),
          close: nextPrice,
          volume: last.volume + Math.floor(Math.random() * 20),
          direction: dir,
        };

        // Every 6 ticks, push a new candle
        if (Math.random() > 0.6) {
          const newCandle: PriceCandle = {
            timestamp: Date.now(),
            open: nextPrice,
            high: nextPrice,
            low: nextPrice,
            close: nextPrice,
            volume: Math.floor(Math.random() * 50) + 10,
            direction: dir,
          };
          return [...prev.slice(-60), newCandle];
        }

        return [...prev.slice(0, -1), updatedLast];
      });
    }, tickSpeed);

    return () => clearInterval(interval);
  }, [ticker, timeframe]);

  // Canvas Drawing for High-Performance Cinematic Aesthetics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const width = canvas.parentElement?.clientWidth || 800;
    const height = 340;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Padding & dimensions
    const padTop = 30;
    const padBottom = 55;
    const padRight = 75;
    const chartW = width - padRight;
    const chartH = height - padTop - padBottom;

    // Calculate Price Bounds
    const prices = candles.map((c) => c.close);
    const minP = Math.min(...candles.map((c) => c.low)) * 0.999;
    const maxP = Math.max(...candles.map((c) => c.high)) * 1.001;
    const rangeP = maxP - minP || 1;

    const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;

    const getX = (idx: number) => (idx / (candles.length - 1)) * chartW;
    const getY = (val: number) => padTop + chartH - ((val - minP) / rangeP) * chartH;

    // 1. Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      // Right axis labels
      const pVal = maxP - (rangeP / 4) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(`$${pVal.toFixed(pVal > 1000 ? 1 : 2)}`, chartW + 8, y + 3);
    }

    // 2. Volume Histogram at bottom
    const volHeight = 40;
    candles.forEach((c, idx) => {
      const x = getX(idx);
      const barW = Math.max(2, chartW / candles.length - 2);
      const vH = (c.volume / maxVol) * volHeight;
      const y = padTop + chartH - vH;

      ctx.fillStyle =
        c.direction === 'UP'
          ? 'rgba(34, 197, 94, 0.25)' // Green volume
          : 'rgba(239, 68, 68, 0.25)'; // Red volume
      ctx.fillRect(x - barW / 2, y, barW, vH);
    });

    const isCurrentlySpikingUp = lastDirection === 'UP';

    // 3. Render Area Path or Candlesticks
    if (chartType === 'AREA') {
      // Background Gradient Fill
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
      if (isCurrentlySpikingUp) {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.35)'); // Glowing emerald spike
        grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.1)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else {
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.35)'); // Red dip
        grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.1)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      }

      ctx.beginPath();
      ctx.moveTo(getX(0), getY(candles[0].close));
      for (let i = 1; i < candles.length; i++) {
        ctx.lineTo(getX(i), getY(candles[i].close));
      }
      ctx.lineTo(getX(candles.length - 1), padTop + chartH);
      ctx.lineTo(getX(0), padTop + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Sharp glowing stroke
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(candles[0].close));
      for (let i = 1; i < candles.length; i++) {
        ctx.lineTo(getX(i), getY(candles[i].close));
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isCurrentlySpikingUp ? '#10b981' : '#ef4444';
      ctx.shadowColor = isCurrentlySpikingUp ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.shadowBlur = spikeIntensity !== 0 ? 15 : 6;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    } else {
      // Candlestick rendering
      const barW = Math.max(3, chartW / candles.length - 3);
      candles.forEach((c, idx) => {
        const x = getX(idx);
        const yOpen = getY(c.open);
        const yClose = getY(c.close);
        const yHigh = getY(c.high);
        const yLow = getY(c.low);
        const isUp = c.close >= c.open;

        ctx.strokeStyle = isUp ? '#10b981' : '#ef4444';
        ctx.fillStyle = isUp ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Body
        const top = Math.min(yOpen, yClose);
        const bH = Math.max(2, Math.abs(yClose - yOpen));
        ctx.fillRect(x - barW / 2, top, barW, bH);
      });
    }

    // 4. Current Price Cursor and Horizontal Guideline
    const lastIdx = candles.length - 1;
    const lastX = getX(lastIdx);
    const lastY = getY(currentPrice);

    // Dashed horizontal price line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isCurrentlySpikingUp ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(chartW, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live Pulsing Dot on Current Price
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isCurrentlySpikingUp ? '#10b981' : '#ef4444';
    ctx.shadowColor = isCurrentlySpikingUp ? '#10b981' : '#ef4444';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Floating Badge on Right Axis
    ctx.fillStyle = isCurrentlySpikingUp ? '#065f46' : '#991b1b';
    ctx.fillRect(chartW + 2, lastY - 10, padRight - 6, 20);
    ctx.strokeStyle = isCurrentlySpikingUp ? '#10b981' : '#ef4444';
    ctx.strokeRect(chartW + 2, lastY - 10, padRight - 6, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`$${currentPrice.toFixed(currentPrice > 1000 ? 1 : 2)}`, chartW + 6, lastY + 3.5);
  }, [candles, currentPrice, chartType, lastDirection, spikeIntensity]);

  const activeQuote = INITIAL_ASSET_QUOTES[ticker] || INITIAL_ASSET_QUOTES.BTC;
  const isUp = lastDirection === 'UP';

  // Handle Quick Trade Handoff
  const handleQuickOrder = (action: 'BUY' | 'SELL') => {
    playCyberClick();
    if (!onExecuteTrade) return;

    const proposal: TradeProposal = {
      asset: ticker,
      action,
      size_pct: Math.min(20, Math.max(5, (orderAmount / 10000) * 100)),
      confidence: 88,
      reasoning: `Direct order placed from Real-Time Chart at $${currentPrice.toFixed(2)} based on technical momentum.`,
    };

    onExecuteTrade(proposal);
  };

  const assetKeys = Object.keys(INITIAL_ASSET_QUOTES);

  return (
    <div className="bg-[#0a0a0e] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header & Ticker Switcher */}
      <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0d0d12]">
        {/* Left: Asset Selectors */}
        <div className="flex flex-wrap items-center gap-1.5">
          {assetKeys.map((key) => {
            const item = INITIAL_ASSET_QUOTES[key];
            const isSelected = ticker === key;
            return (
              <button
                key={key}
                onClick={() => {
                  playCyberClick();
                  setTicker(key);
                  if (onSelectTicker) onSelectTicker(key);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span
                  className={`text-[9px] px-1 py-0.2 rounded ${
                    item.class === 'CX' ? 'bg-cyan-900/60 text-cyan-300' : 'bg-purple-900/60 text-purple-300'
                  }`}
                >
                  {item.class}
                </span>
                <span>{key}</span>
              </button>
            );
          })}
        </div>

        {/* Center/Right: Live Price Display with Spike Green / Dip Red Highlight */}
        <div className="flex items-center gap-4">
          <div
            className={`px-3 py-1 rounded-lg border flex items-center gap-2 transition-all duration-300 ${
              isUp
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-red-950/60 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            }`}
          >
            <span className="text-xs font-bold text-gray-400 uppercase">Live:</span>
            <span className="text-base font-black font-mono tracking-wide">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: currentPrice > 1000 ? 1 : 2 })}
            </span>
            <span className="flex items-center gap-0.5 text-xs font-bold font-mono">
              {isUp ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
              {isUp ? '+SPIKE' : '-DIP'}
            </span>
          </div>

          {/* Timeframe Toggles */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-xs">
            {(['1s', '1m', '5m', '15m'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  playCyberClick();
                  setTimeframe(tf);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  timeframe === tf
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Area vs Candle toggle */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => {
                playCyberClick();
                setChartType('AREA');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                chartType === 'AREA' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => {
                playCyberClick();
                setChartType('CANDLES');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                chartType === 'CANDLES' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Candles
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative p-2 w-full">
        {/* Subtle Watermark */}
        <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2 text-white/10 font-black text-3xl font-mono select-none">
          <span>{ticker}</span>
          <span className="text-sm border border-white/10 px-1 rounded">BITGET LUNARIS FEED</span>
        </div>

        <canvas ref={canvasRef} className="w-full block" />
      </div>

      {/* Quick Trade Execution Bar */}
      <div className="p-3 border-t border-white/10 bg-[#0c0c11] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400 flex items-center gap-1 font-bold">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Quick Autopilot Router:
          </span>

          <div className="flex items-center gap-1">
            {[500, 1000, 2500, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  playCyberClick();
                  setOrderAmount(amt);
                }}
                className={`px-2 py-1 rounded text-xs font-mono font-bold cursor-pointer border ${
                  orderAmount === amt
                    ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50'
                    : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleQuickOrder('BUY')}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-4 py-1.5 rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer uppercase tracking-wider"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            <span>Market Buy ({ticker})</span>
          </button>

          <button
            onClick={() => handleQuickOrder('SELL')}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer uppercase tracking-wider"
          >
            <ArrowDownRight className="w-4 h-4 stroke-[3]" />
            <span>Market Short ({ticker})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
