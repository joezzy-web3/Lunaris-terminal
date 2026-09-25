// components/ReHuddlePanel.tsx
// Council Cross-Examination & Re-Huddle Chamber
// Allows users to ask follow-up questions or introduce new arguments after a verdict is rendered.
// The 4 agents deliberate whether to AMEND THE DECREE or SUSTAIN THE ORIGINAL RULING.

import React, { useState } from 'react';
import {
  MessageSquare,
  HelpCircle,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Flame,
  Shield,
  Skull,
  Globe2,
  ChevronDown,
  ChevronUp,
  Scale,
  Send,
} from 'lucide-react';
import { ConsensusVerdict, DebateTurn } from '@/lib/councilDebateEngine';
import { playCyberClick, playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';
import { evaluateClientReHuddle } from '@/lib/rehuddleEngine';

export interface ReHuddleResult {
  huddleOutcome: 'AMEND_DECREE' | 'SUSTAIN_RULING';
  outcomeTitle: string;
  amendedAction: 'BUY' | 'SELL' | 'HOLD';
  executionType: 'MARKET_ORDER' | 'LIMIT_PULLBACK' | 'BREAKOUT_STOP';
  targetEntryPrice: number;
  revisedSizePct: number;
  revisedStopLossPct: number;
  reHuddleSummary: string;
  turns: Array<{
    speakerId: 'QUANT' | 'GUARDIAN' | 'NEXUS_RED' | 'MACRO';
    speakerName: string;
    stance: string;
    argument: string;
  }>;
}

interface ReHuddlePanelProps {
  verdict: ConsensusVerdict;
  onApplyAmendedVerdict?: (updatedVerdict: ConsensusVerdict) => void;
}

export const ReHuddlePanel: React.FC<ReHuddlePanelProps> = ({
  verdict,
  onApplyAmendedVerdict,
}) => {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rehuddleResult, setRehuddleResult] = useState<ReHuddleResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const quickPrompts = [
    `Wait for a 2% pullback limit order before buying ${verdict.ticker}`,
    `Scale position size down by half due to upcoming CPI print`,
    `What if Bitcoin drops below 85,000 before this executes?`,
    `Can we tighten the stop-loss to -2.5% to preserve capital?`,
  ];

  const handleAskFollowUp = async (promptText?: string) => {
    const textToSubmit = (promptText || question).trim();
    if (!textToSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    playCyberClick();

    try {
      let result: ReHuddleResult | null = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch('/api/gemini/rehuddle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            ticker: verdict.ticker,
            userQuestion: textToSubmit,
            previousVerdict: verdict,
            clientPrice: verdict.currentPrice,
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const rawText = await response.text();
          if (rawText && rawText.trim().length > 0) {
            try {
              const resData = JSON.parse(rawText);
              if (resData && resData.success && resData.data) {
                result = resData.data;
              }
            } catch {
              // Gracefully continue to local client-side deliberator
            }
          }
        }
      } catch (networkErr) {
        console.warn('Rehuddle server fetch skipped/errored, falling back to local council:', networkErr);
      }

      // If server was unreachable, offline, or timed out, evaluate via robust local multi-persona engine
      if (!result) {
        result = evaluateClientReHuddle(textToSubmit, verdict);
      }

      setRehuddleResult(result);
      setIsOpen(true);

      if (result.huddleOutcome === 'AMEND_DECREE') {
        playTradeApprovedChime();
        if (onApplyAmendedVerdict) {
          // Construct updated ConsensusVerdict
          const updated: ConsensusVerdict = {
            ...verdict,
            action: result.amendedAction,
            executionType: result.executionType,
            targetEntryPrice: result.targetEntryPrice,
            optimalSizePct: result.revisedSizePct,
            stopLossPct: result.revisedStopLossPct,
            stopLossPrice: Number((verdict.currentPrice * (1 - result.revisedStopLossPct / 100)).toFixed(2)),
            synthesizedReasoning: `[RE-HUDDLE AMENDMENT] ${result.reHuddleSummary}`,
            tradeProposal: {
              ...verdict.tradeProposal,
              action: result.amendedAction,
              size_pct: result.revisedSizePct,
              reasoning: result.reHuddleSummary,
            },
          };
          onApplyAmendedVerdict(updated);
        }
      } else {
        playRiskVetoTone();
      }
    } catch (err: any) {
      console.error('Rehuddle error:', err);
      // Even in the worst failure case, provide a client-side generated outcome
      const fallbackResult = evaluateClientReHuddle(textToSubmit, verdict);
      setRehuddleResult(fallbackResult);
      setIsOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSpeakerMeta = (speakerId: string) => {
    switch (speakerId) {
      case 'QUANT':
        return {
          name: 'Quant-Omega',
          role: 'Momentum & Technicals',
          icon: <Flame className="w-3.5 h-3.5 text-[#FF5722] shrink-0" />,
          color: 'text-[#FF5722] border-[#FF5722]/30 bg-[#FF5722]/10',
        };
      case 'GUARDIAN':
        return {
          name: 'Guardian-01',
          role: 'Capital Preservation & Risk',
          icon: <Shield className="w-3.5 h-3.5 text-[#8B5A2B] shrink-0" />,
          color: 'text-[#C48C58] border-[#8B5A2B]/40 bg-[#8B5A2B]/10',
        };
      case 'NEXUS_RED':
        return {
          name: 'NEXUS-RED',
          role: 'Adversarial Chaos Arbiter',
          icon: <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
          color: 'text-rose-400 border-rose-500/40 bg-rose-950/20',
        };
      case 'MACRO':
      default:
        return {
          name: 'Atlas-Macro',
          role: 'Strategic Quorum Lead',
          icon: <Globe2 className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />,
          color: 'text-sky-400 border-sky-500/40 bg-sky-950/20',
        };
    }
  };

  return (
    <div className="bg-[#0b0d13] border border-white/15 rounded-xl p-4 space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Council Cross-Examination &amp; Re-Huddle</span>
              <span className="text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded font-mono">
                INTERACTIVE
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              Cross-examine the verdict or challenge the agents with a new thesis. The Council will re-huddle and decide to adapt or sustain.
            </p>
          </div>
        </div>

        {rehuddleResult && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 transition-colors"
          >
            <span>{isOpen ? 'Collapse Debate' : 'View Re-Huddle Turns'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex flex-wrap gap-1.5">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuestion(p);
              handleAskFollowUp(p);
            }}
            disabled={isSubmitting}
            className="text-[10px] text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 rounded-full px-3 py-1 font-mono transition-all text-left truncate max-w-xs cursor-pointer disabled:opacity-50"
          >
            "{p}"
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleAskFollowUp()}
            placeholder="Ask a follow-up or propose an amendment (e.g. 'Wait for limit pullback', 'Should we cut size?')..."
            className="w-full bg-black/60 border border-white/15 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-white focus:ring-1 focus:ring-white outline-none transition-all"
          />
        </div>

        <button
          onClick={() => handleAskFollowUp()}
          disabled={isSubmitting || !question.trim()}
          className="bg-white hover:bg-zinc-200 text-black font-extrabold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer shrink-0 font-mono shadow-sm"
        >
          {isSubmitting ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>COUNCIL RE-HUDDLING...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>CROSS-EXAMINE COUNCIL</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* RE-HUDDLE VERDICT SUMMARY CARD */}
      {rehuddleResult && (
        <div
          className={`p-3.5 rounded-lg border space-y-3 transition-all animate-fadeIn ${
            rehuddleResult.huddleOutcome === 'AMEND_DECREE'
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
              : 'bg-zinc-900/60 border-white/15 text-zinc-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {rehuddleResult.huddleOutcome === 'AMEND_DECREE' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              )}
              <span className="font-mono text-xs font-extrabold tracking-wide uppercase">
                {rehuddleResult.outcomeTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span
                className={`px-2 py-0.5 rounded border ${
                  rehuddleResult.huddleOutcome === 'AMEND_DECREE'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                {rehuddleResult.huddleOutcome === 'AMEND_DECREE' ? 'DECREE AMENDED' : 'RULING SUSTAINED'}
              </span>

              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                Entry: {rehuddleResult.executionType} (${rehuddleResult.targetEntryPrice?.toLocaleString()})
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-200 leading-relaxed font-sans">
            {rehuddleResult.reHuddleSummary}
          </p>

          {/* Sizing & Parameter adjustments if amended */}
          {rehuddleResult.huddleOutcome === 'AMEND_DECREE' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
              <div className="bg-black/50 p-2 rounded border border-white/10">
                <span className="text-zinc-500 block text-[9px] uppercase">Revised Sizing</span>
                <span className="text-white font-bold">{rehuddleResult.revisedSizePct}% of NAV</span>
              </div>
              <div className="bg-black/50 p-2 rounded border border-white/10">
                <span className="text-zinc-500 block text-[9px] uppercase">Execution Type</span>
                <span className="text-emerald-400 font-bold">{rehuddleResult.executionType}</span>
              </div>
              <div className="bg-black/50 p-2 rounded border border-white/10">
                <span className="text-zinc-500 block text-[9px] uppercase">Target Execution Price</span>
                <span className="text-white font-bold">${rehuddleResult.targetEntryPrice?.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Collapsible Turns from 4 Council Personas */}
          {isOpen && rehuddleResult.turns && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">
                Council Re-Deliberation Transcript:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {rehuddleResult.turns.map((turn, idx) => {
                  const meta = getSpeakerMeta(turn.speakerId);
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 ${meta.color}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold font-mono text-[11px]">
                          {meta.icon}
                          <span>{meta.name}</span>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                          {turn.stance}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-200 leading-relaxed font-sans">
                        "{turn.argument}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
