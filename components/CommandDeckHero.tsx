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
  'Agents_',
  'QuantFi_',
  'Traders_',
  'Execution_',
  'Consensus_',
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
      {/* Background Subtle Vignette */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Top telemetry ticker tags */}
      <div className="max-w-5xl mx-auto flex items-center justify-center text-[10px] text-zinc-400 mb-3 border-b border-white/8 pb-2.5">
        <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>BITGET SIMULATED LIQUIDITY POOL ONLINE</span>
        </div>
      </div>

      {/* Center 3D Wireframe Spheres (Moonberg signature visual) */}
      <div className="max-w-3xl mx-auto relative z-10 py-1">
        <WireframeSphere onInteract={onLaunchTerminal} />
      </div>

      {/* Hero Headline & Typewriter */}
      <div className="max-w-4xl mx-auto text-center relative z-20 mt-2">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-none font-sans-taste">
          We build AI-Native
          <br />
          Infrastructure for{' '}
          <span className="text-white">Autonomous</span>
          <br className="sm:hidden" />{' '}
          <span className="text-yellow-400 border-b-4 border-yellow-400 pb-1">
            {displayText || 'Agents_'}
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-zinc-300 max-w-[65ch] mx-auto font-sans-taste font-normal tracking-normal leading-relaxed">
          Build, test, and deploy quantitative cross-asset agentic strategies without code.
          Integrated with <span className="text-[#00F0FF] font-mono-taste font-bold">Bitget simulated paper liquidity</span> and deterministic risk circuit breakers.
        </p>

        {/* Action Buttons (Clean high-contrast monochrome pills) */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              playCyberClick();
              onLaunchTerminal();
            }}
            className="group relative inline-flex items-center gap-2.5 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest text-black bg-white hover:bg-zinc-200 transition-all cursor-pointer transform hover:-translate-y-0.5 shadow-sm"
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
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-xs uppercase tracking-wider text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span>Explore Architecture</span>
          </button>
        </div>

        {/* Institutional As Seen On Bar */}
        <div className="mt-12 pt-6 border-t border-white/8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-zinc-500 uppercase tracking-wider">
          <span className="text-[10px] text-zinc-600 font-bold tracking-widest">AS SEEN ON:</span>
          <span className="hover:text-zinc-300 transition-colors font-bold text-zinc-400">BITGET AI</span>
          <span className="hover:text-white transition-colors">DECRYPT</span>
          <span className="hover:text-zinc-300 transition-colors">YAHOO! FINANCE</span>
          <span className="hover:text-zinc-300 transition-colors">BINANCE SQUARE</span>
          <span className="hover:text-zinc-300 transition-colors">FINANCIAL TIMES</span>
        </div>
      </div>
    </div>
  );
}
