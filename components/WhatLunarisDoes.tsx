// components/WhatLunarisDoes.tsx
// Institutional Manifesto & Feature Showcase matching Moonberg reference video

import React from 'react';
import { Sparkles, Cpu, ShieldCheck, Layers, Terminal, ArrowUpRight } from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface WhatLunarisDoesProps {
  onLaunchTerminal: () => void;
}

export function WhatLunarisDoes({ onLaunchTerminal }: WhatLunarisDoesProps) {
  return (
    <div className="relative bg-[#0b0b0f] border border-[var(--lunaris-panel-border)] rounded-xl p-6 sm:p-8 font-mono shadow-2xl overflow-hidden">
      {/* Tactical Corner Tick Markers */}
      <div className="absolute top-2 left-2 text-[10px] text-cyan-400/40 select-none">[+]</div>
      <div className="absolute top-2 right-2 text-[10px] text-yellow-400/40 select-none">03 // CORE_THESIS</div>
      <div className="absolute bottom-2 left-2 text-[10px] text-gray-700 select-none">BITGET:READY</div>
      <div className="absolute bottom-2 right-2 text-[10px] text-cyan-400/40 select-none">[+]</div>

      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold mb-4 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Institutional Paradigm Shift</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
          What <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">LUNARIS</span> does
        </h2>

        <p className="mt-4 text-base sm:text-lg text-gray-300 leading-relaxed font-sans font-light">
          Human-only trading is already the exception in equities, not the rule. Crypto is following the exact same trajectory. AI won&apos;t just assist traders — it will become the <b>operating system</b> for how cross-asset markets function.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#070709] border border-white/10">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
              <Cpu className="w-4 h-4" />
              <span>AI-READY INFRASTRUCTURE</span>
            </div>
            <p className="text-gray-400 font-sans text-[11px] leading-relaxed">
              Infrastructure engineered for autonomous multi-agent trading quorums, real-time price feeds, and zero-latency order routing.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#070709] border border-white/10">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>DETERMINISTIC VETO</span>
            </div>
            <p className="text-gray-400 font-sans text-[11px] leading-relaxed">
              Hard mathematical guardrails: Hard 25% single-position ceiling and automated -10% drawdown stop-loss circuit breakers.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => {
              playCyberClick();
              onLaunchTerminal();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider text-black bg-yellow-400 hover:bg-yellow-300 transition-all cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.4)]"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Open Execution Cockpit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
