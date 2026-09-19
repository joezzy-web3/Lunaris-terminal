// components/HackathonCreditsModal.tsx
import React from 'react';
import { X, ExternalLink, Award, Code2, ShieldCheck, Zap, BookOpen, User, Cpu } from 'lucide-react';

export function HackathonCreditsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="relative w-full max-w-2xl bg-[var(--lunaris-panel-bg)] border border-[var(--lunaris-panel-border)] rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">
                BITGET AI HACKATHON — ARCHITECTURE SPECIFICATION
              </h2>
              <p className="text-[11px] text-cyan-400 font-medium">LUNARIS — "See the chain in the dark."</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-300">
          {/* Track & Developer Card */}
          <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Competition Track:</span>
              <span className="text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                Agentic Trading
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-gray-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" /> Lead Developer Credit:
              </span>
              <span className="font-bold text-white text-sm">Joezzy (Joezzy Web3)</span>
            </div>
          </div>

          {/* Overview */}
          <div>
            <h3 className="text-xs uppercase font-bold text-gray-200 tracking-wider mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> System Architecture & Highlights
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              LUNARIS is an institutional-grade cross-asset AI terminal bridging traditional equities and crypto assets.
              Powered by a multi-agent orchestration setup, LUNARIS executes autonomous paper trades, performs social pulse monitoring,
              and convenes an AI debate council to formulate risk-vetted investment strategies with hard deterministic circuit breakers.
            </p>
          </div>

          {/* Tier 1 Modules */}
          <div className="space-y-2">
            <h4 className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Completed Tier 1 Modules:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                <div className="font-bold text-cyan-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AUTOPILOT (Core Agentic Loop)
                </div>
                <p className="text-gray-400 text-[10px]">
                  Autonomous execution loop with real-time tick integration, Qwen reasoning, and deterministic risk veto filtering.
                </p>
              </div>

              <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                <div className="font-bold text-blue-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> PULSE (Sentiment Velocity)
                </div>
                <p className="text-gray-400 text-[10px]">
                  Cross-asset social mention velocity and sentiment heatmaps covering both crypto (CX) and tokenized equities (EQ).
                </p>
              </div>

              <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                <div className="font-bold text-purple-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> COUNCIL (Multi-Agent Debate)
                </div>
                <p className="text-gray-400 text-[10px]">
                  4-Pillar Council consensus engine (Quant-Omega, Guardian-01, NEXUS-RED, Atlas-Macro) with direct signal handoff into the Autopilot pipeline.
                </p>
              </div>

              <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> DEMO MODE & RISK VETO
                </div>
                <p className="text-gray-400 text-[10px]">
                  Deterministic 25% max position ceiling, -10% stop-loss circuit breaker, and 15% delta deviation safeguard.
                </p>
              </div>
            </div>
          </div>

          {/* External Resource Links */}
          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <h4 className="text-[11px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Hackathon Resources & Verifications
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <a
                href="https://bitget.com/en/activity-hub/hackathon"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-black/40 border border-white/10 hover:border-cyan-500/40 text-cyan-400 flex items-center justify-between group transition-colors"
              >
                <span>Bitget Activity Hub</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a
                href="https://bitget-ai.gitbook.io/bitgetai_hackathons2"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-black/40 border border-white/10 hover:border-cyan-500/40 text-cyan-400 flex items-center justify-between group transition-colors"
              >
                <span>Hackathon Handbook</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a
                href="https://github.com/joezzy-web3/Lunaris-terminal"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-black/40 border border-white/10 hover:border-purple-500/40 text-purple-400 flex items-center justify-between group transition-colors"
              >
                <span>GitHub Repository</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a
                href="https://x.com/Bitget_AI"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded bg-black/40 border border-white/10 hover:border-blue-500/40 text-blue-400 flex items-center justify-between group transition-colors"
              >
                <span>Bitget AI on X (@Bitget_AI)</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-black/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            RETURN TO TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
}
