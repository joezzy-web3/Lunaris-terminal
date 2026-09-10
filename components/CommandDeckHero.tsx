// components/CommandDeckHero.tsx
// Cybernetic Hero & Institutional Command Deck inspired by Moonberg reference video

import React, { useState, useEffect } from 'react';
import { WireframeSphere } from './WireframeSphere';
import { Terminal, Zap, Shield, TrendingUp, Cpu, ArrowRight, Play, ExternalLink, Sparkles } from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface CommandDeckHeroProps {
  onLaunchTerminal: () => void;
  onOpenAlgoBuilder?: () => void;
}

const ROTATING_TARGETS = [
  'Cross-Asset Traders_',
  'QuantFi_',
  'Autonomous Agents_',
  'Bitget Execution_',
  'Multi-Asset Quorum_',
];

export function CommandDeckHero({ onLaunchTerminal, onOpenAlgoBuilder }: CommandDeckHeroProps) {
  const [targetIndex, setTargetIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter effect matching Moonberg hero: "We build AI-Native Infrastructure for A_"
  useEffect(() => {
    const currentTarget = ROTATING_TARGETS[targetIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayText === currentTarget) {
      timeout = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setTargetIndex((prev) => (prev + 1) % ROTATING_TARGETS.length);
    } else {
      const nextLength = isDeleting ? displayText.length - 1 : displayText.length + 1;
      const speed = isDeleting ? 45 : 90;
      timeout = setTimeout(() => {
        setDisplayText(currentTarget.substring(0, nextLength));
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, targetIndex]);

  return (
    <div className="relative w-full pt-2 pb-6 px-4 font-mono select-none overflow-hidden">
      {/* Background Cybernetic Ambient Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-1/4 w-[350px] h-[250px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top telemetry ticker tags */}
      <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] text-gray-500 mb-3 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>SERIES: 852 // EPT: -0.00</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-gray-400 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>BITGET SIMULATED LIQUIDITY POOL ONLINE</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-gray-400">LATENCY: <b className="text-emerald-400">4ms</b></span>
          <span className="text-gray-700">|</span>
          <span className="text-emerald-400">FPS: 60</span>
        </div>
      </div>

      {/* Center 3D Wireframe Spheres (Moonberg signature visual) */}
      <div className="max-w-3xl mx-auto relative z-10 py-1">
        <WireframeSphere onInteract={onLaunchTerminal} />
      </div>

      {/* Hero Headline & Typewriter */}
      <div className="max-w-4xl mx-auto text-center relative z-20 mt-2">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-none font-sans-taste">
          We build AI-Native
          <br />
          Infrastructure for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-yellow-300 to-amber-400 underline decoration-yellow-400 decoration-4 underline-offset-8">
            {displayText}
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-[65ch] mx-auto font-sans-taste font-normal tracking-normal leading-relaxed">
          Build, test, and deploy quantitative cross-asset agentic strategies without code.
          Integrated with <span className="text-cyan-300 font-mono-taste font-medium">Bitget simulated paper liquidity</span> and deterministic risk circuit breakers.
        </p>

        {/* Action Buttons (Pill shape matching reference video) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              playCyberClick();
              onLaunchTerminal();
            }}
            className="group relative inline-flex items-center gap-2.5 px-7 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 shadow-[0_0_25px_rgba(250,204,21,0.5)] transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Terminal className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
            <span>Launch Trading Terminal</span>
            <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => {
              playCyberClick();
              if (onOpenAlgoBuilder) onOpenAlgoBuilder();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all cursor-pointer shadow-sm"
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Explore Architecture</span>
          </button>
        </div>

        {/* Institutional As Seen On Bar (as in video) */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-gray-500 uppercase tracking-wider">
          <span className="text-[10px] text-gray-600 font-bold tracking-widest">AS SEEN ON:</span>
          <span className="hover:text-cyan-400 transition-colors font-bold text-gray-400">BITGET AI</span>
          <span className="hover:text-white transition-colors">DECRYPT</span>
          <span className="hover:text-yellow-400 transition-colors">YAHOO! FINANCE</span>
          <span className="hover:text-amber-400 transition-colors">BINANCE SQUARE</span>
          <span className="hover:text-blue-400 transition-colors">FINANCIAL TIMES</span>
        </div>
      </div>
    </div>
  );
}
