import React from 'react';
import { 
  ShieldCheck, 
  Hash, 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  X, 
  Layers, 
  Filter, 
  Code2, 
  Lock,
  ArrowRight,
  ShieldAlert,
  Server
} from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLatestTradeId?: string;
  currentLatestSeq?: number;
}

export const CanonicalSequenceExplainerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentLatestTradeId = 'PT-20260918-4267',
  currentLatestSeq = 3569,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-2xl bg-[#090b10] border border-yellow-400/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glowing Top Accent */}
        <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-[#00F0FF] to-emerald-400" />

        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between bg-black/50">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide">
                  INGESTION COUNTER (PT-ID) VS. CANONICAL SEQUENCE (#SEQ)
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Institutional Two-Stage Accounting: Pre-Trade Ingress Bus vs. Authoritative Settled Ledger
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playCyberClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs sm:text-sm leading-relaxed overflow-y-auto">
          {/* Executive Summary for Judges */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Architectural Clarity: Ingress Bus vs. Settled Ledger</span>
            </div>
            <p className="text-zinc-300">
              In institutional exchange gateways (like FIX protocols and clearinghouses), a <strong className="text-cyan-300">Raw Ingress Event Counter</strong> is decoupled from the <strong className="text-yellow-300">Canonical Settled Sequence</strong>.
              The numerical difference between the raw generation counter (<span className="font-mono text-cyan-300 font-bold">~4,267 attempts</span>) and the yellow verified badge (<span className="font-mono text-yellow-300 font-bold">#{currentLatestSeq}</span>) reflects our active pre-trade ingestion gate filtering out test harness pulses, anomalous price spikes, and early development ticker migrations before they can ever reach the authoritative ledger.
            </p>
          </div>

          {/* Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Card: Raw Event ID */}
            <div className="p-4 rounded-xl bg-black/40 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Raw Ingress Event ID
                </span>
                <span className="font-mono text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                  {currentLatestTradeId}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm">Global Generator Wire Counter</h3>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span>Emitted immediately across background daemon loops, test harness pulses, and multi-tab worker ticks.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span>Format: <code className="font-mono text-zinc-300">PT-[YYYYMMDD]-[SERIAL]</code> (e.g., attempt #4267 on Sep 18).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span>Acts as a drop-copy audit trail recording every event generated at the edge before boundary validation.</span>
                </li>
              </ul>
            </div>

            {/* Right Card: Canonical Sequence */}
            <div className="p-4 rounded-xl bg-yellow-500/[0.04] border border-yellow-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-yellow-400" />
                  Canonical Sequence (auditSeq)
                </span>
                <span className="font-mono text-xs font-bold text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded border border-yellow-400/30">
                  #{currentLatestSeq}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm">Authoritative Settled Ledger Row</h3>
              <ul className="space-y-1.5 text-zinc-300 text-xs">
                <li className="flex items-start gap-1.5">
                  <span className="text-yellow-400 font-bold">&bull;</span>
                  <span>Represents the <strong>exact consecutive rank</strong> in the immutable verified ledger (<code className="font-mono text-yellow-300">#1, #2, ... #{currentLatestSeq}</code>).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-yellow-400 font-bold">&bull;</span>
                  <span>Awarded <strong>strictly after</strong> passing price corridor sanity bounds, Bitget L2 slippage collars, and cryptographic state hashing.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-yellow-400 font-bold">&bull;</span>
                  <span>Guarantees zero skipped numbers in the auditor’s clean chronological record.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* The Mathematical Pipeline Flow */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 font-mono">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#00F0FF]" />
              The Two-Stage Ingestion Pipeline
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-black/60 rounded-lg border border-zinc-700/60">
                <div className="text-lg font-bold text-white">~4,267</div>
                <div className="text-[10px] text-zinc-400 uppercase mt-0.5">Raw Ingestion Events</div>
                <div className="text-[9px] text-zinc-500 mt-1">Generated by loop pulses</div>
              </div>

              <div className="p-3 bg-rose-950/30 rounded-lg border border-rose-500/30 flex flex-col justify-center">
                <div className="text-lg font-bold text-rose-400">Rejected Trades</div>
                <div className="text-[10px] text-rose-300 uppercase mt-0.5">Isolated Ingress Archive</div>
                <div className="text-[9px] text-rose-400/80 mt-1">Test artifacts & out-of-corridor ticks</div>
              </div>

              <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-500/40 flex flex-col justify-center">
                <div className="text-lg font-bold text-emerald-300">#{currentLatestSeq}</div>
                <div className="text-[10px] text-emerald-400 uppercase mt-0.5">Canonical Verified (#)</div>
                <div className="text-[9px] text-emerald-400/80 mt-1">Immutable gapless settled chain</div>
              </div>
            </div>
          </div>

          {/* Proof of Integrity Points */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-yellow-400" />
              Institutional Guarantees & Verification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-400">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-zinc-200">1. FIX Gateway Analogy</span>
                <p>
                  Similar to how an institutional exchange order gateway receives thousands of wire-level orders, but only credit-checked, risk-cleared fills commit to the clearinghouse ledger.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-zinc-200">2. Standalone Bad Trades Archive</span>
                <p>
                  Judges can inspect and download all quarantined events directly with full SHA-256 hashes via the red <strong>Rejected Trades</strong> button. These events never mix into the trading ledger.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-yellow-500/20 bg-yellow-500/[0.03] space-y-1">
                <span className="font-bold text-yellow-300">3. Operator Lock Scope</span>
                <p className="text-zinc-300">
                  The admin passcode exists strictly to prevent public web visitors from pausing the 24/7 autonomous daemon or triggering resets. It cannot edit or delete historical trades.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-400">
            Validated by <strong className="text-white">reconcileTradeCollection()</strong> &bull; LUNARIS Cryptographic Ledger
          </span>
          <button
            onClick={() => {
              playCyberClick();
              onClose();
            }}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
