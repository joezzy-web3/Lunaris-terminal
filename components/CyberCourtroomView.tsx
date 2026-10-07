// components/CyberCourtroomView.tsx
// LUNARIS TERMINAL — High Court of Trading Alpha
// Realistic Multi-Agent Courtroom Presentation Layer
// Driven dynamically by Quorum Matrix arguments & Deterministic Risk Veto Engine

import React, { useState } from 'react';
import {
  Gavel,
  ChevronRight,
  Zap,
  FileText,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { ConsensusVerdict, AgentPersonaId } from '@/lib/councilDebateEngine';
import { TradeProposal } from '@/lib/riskVeto';
import {
  playCyberClick,
  playTradeApprovedChime,
  playRiskVetoTone,
} from '@/lib/soundSynth';
import { CourtStage } from './court/CourtStage';
import { CourtControls } from './court/CourtControls';
import { ReHuddlePanel } from './ReHuddlePanel';
import { useCourtTimeline } from './court/useCourtTimeline';

interface CyberCourtroomViewProps {
  verdict: ConsensusVerdict | null;
  ticker: string;
  isDebating: boolean;
  syncedVisibleTurnsCount?: number;
  isTypingNextTurn?: boolean;
  typingSpeaker?: AgentPersonaId;
  onConveneNewTrial: (ticker: string) => void;
  onSendToAutopilot: (trade: TradeProposal) => void;
  onReturnToMatrix: () => void;
  soundActive: boolean;
  onToggleSound: () => void;
  onApplyAmendedVerdict?: (updatedVerdict: ConsensusVerdict) => void;
}

export const CyberCourtroomView: React.FC<CyberCourtroomViewProps> = ({
  verdict,
  ticker,
  isDebating,
  syncedVisibleTurnsCount = 0,
  isTypingNextTurn = false,
  typingSpeaker,
  onConveneNewTrial,
  onSendToAutopilot,
  onReturnToMatrix,
  soundActive,
  onToggleSound,
  onApplyAmendedVerdict,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // High-performance timeline hook controlling camera, characters, bubbles, and gavel in lockstep
  const timeline = useCourtTimeline({
    verdict,
    ticker,
    isDebating,
    syncedVisibleTurnsCount,
    isTypingNextTurn,
    typingSpeaker,
    soundActive,
    speed,
    isPlaying,
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0c10] border border-white/10 px-4 py-3 rounded-xl font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-magenta-400 animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider">
            LUNARIS HIGH COURT OF TRADING ALPHA
          </span>
          <span className="text-zinc-500">//</span>
          <span className="text-cyan-400 font-semibold">{ticker}</span>
          <span className="text-zinc-500">//</span>
          <span className="text-zinc-400 font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {timeline.currentPhaseName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playCyberClick();
              timeline.restartTimeline();
              onConveneNewTrial(ticker);
            }}
            disabled={isDebating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Re-Convene Trial</span>
          </button>

          <button
            onClick={onReturnToMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Return to Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Animated Courtroom Stage */}
      <CourtStage
        ticker={ticker}
        currentPrice={verdict?.currentPrice}
        targetEntryPrice={verdict?.targetEntryPrice || verdict?.currentPrice}
        targetExitPrice={verdict?.targetPrice}
        stopLossPrice={verdict?.stopLossPrice}
        takeProfitPct={verdict?.takeProfitPct}
        stopLossPct={verdict?.stopLossPct}
        tradeAction={verdict?.action || 'BUY'}
        sizePct={verdict?.optimalSizePct || 12}
        executionType={verdict?.executionType}
        leverageText={`requested: 5x leverage (${verdict?.optimalSizePct || 12}% NAV)`}
        caption={timeline.caption}
        customEyeStates={timeline.eyeStates}
        headOffsets={timeline.headOffsets}
        rootOffsets={timeline.rootOffsets}
        cameraZoom={timeline.cameraZoom}
        cameraFocus={timeline.cameraFocus}
        cameraShake={timeline.cameraShake}
        gavelAngle={timeline.gavelAngle}
        gavelRingOpacity={timeline.gavelRingOpacity}
        gavelRingScale={timeline.gavelRingScale}
        caseFileStamp={timeline.caseFileStamp}
        caseFileStampScale={timeline.caseFileStampScale}
        caseFileStampOpacity={timeline.caseFileStampOpacity}
        activeBubbles={timeline.activeBubbles}
        voteBadges={timeline.voteBadges}
        isScreenDisputed={timeline.isScreenDisputed}
        flashColor={timeline.flashColor}
        flashOpacity={timeline.flashOpacity}
        showDebugPanel={false}
      />

      {/* Playback & Phase Control Bar */}
      <CourtControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onReplay={() => {
          playCyberClick();
          timeline.restartTimeline();
        }}
        onSkipToVerdict={() => {
          playCyberClick();
          timeline.skipToVerdict();
        }}
        speed={speed}
        onToggleSpeed={() => setSpeed((s) => (s === 1 ? 2 : 1))}
        isTranscriptOpen={isTranscriptOpen}
        onToggleTranscript={() => setIsTranscriptOpen((v) => !v)}
        soundActive={soundActive}
        onToggleSound={onToggleSound}
        currentPhaseName={timeline.currentPhaseName}
        isDebating={isDebating}
      />

      {/* Full Transcript Drawer (Expandable) */}
      {isTranscriptOpen && verdict && (
        <div className="bg-[#0b0d14] border border-white/15 rounded-xl p-5 space-y-4 font-mono animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                Courtroom Certified Transcript — Case #{ticker}-3570
              </h3>
            </div>
            <button
              onClick={() => setIsTranscriptOpen(false)}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-white/5"
            >
              Close Drawer [✕]
            </button>
          </div>

          {/* Turns Log */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {verdict.turns.map((turn, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-black/40 border border-white/8 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{turn.speakerId}</span>
                  <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {turn.stanceLabel}
                  </span>
                </div>
                <p className="text-zinc-300 font-sans leading-relaxed text-sm">{turn.speech}</p>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 pt-1">
                  <span>Timestamp: {turn.timestamp}</span>
                  <span>Stance: {turn.stanceType}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Gemini Synthesis */}
          <div className="p-3.5 rounded-lg bg-white/5 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Gemini High Arbiter Synthesis & Rationale
            </div>
            <p className="text-zinc-300 text-xs font-sans leading-relaxed">
              {verdict.synthesizedReasoning}
            </p>
          </div>
        </div>
      )}

      {/* Standby Card when in RECESS */}
      {timeline.currentPhaseName === 'RECESS' && !isDebating && (
        <div className="bg-[#08090d] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span className="text-zinc-400">
              HIGH COURT IN RECESS // The council is at rest. Convene trial to deliberate on <strong className="text-white">{ticker}</strong>.
            </span>
          </div>
          <button
            onClick={() => {
              playCyberClick();
              timeline.restartTimeline();
              onConveneNewTrial(ticker);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-zinc-200 transition-colors cursor-pointer text-xs"
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Open High Court Trial</span>
          </button>
        </div>
      )}

      {/* Live Deliberation Pulse Banner while In-Session */}
      {isDebating && (
        <div className="bg-[#08090d] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 font-mono text-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-zinc-300">
              HIGH COURT IN SESSION // Mirroring Quorum Matrix arguments & risk verification in lockstep...
            </span>
          </div>
          <span className="text-[11px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded font-bold">
            PHASE: {timeline.currentPhaseName}
          </span>
        </div>
      )}

      {/* Active Verdict Decree & Re-Huddle Chamber (displayed once verdict is ratified) */}
      {verdict && !isDebating && timeline.currentPhaseName === 'VERDICT' && (
        <div className="bg-[#08090d] border border-white/10 rounded-xl p-4 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
                TRIBUNAL FINAL RULING
              </span>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span
                  className={`text-lg font-black ${
                    verdict.action === 'BUY'
                      ? 'text-emerald-400'
                      : verdict.action === 'SELL'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {verdict.action} {verdict.ticker}
                </span>

                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-500/30">
                  Target Entry: ${(verdict.targetEntryPrice || verdict.currentPrice).toLocaleString()} {verdict.executionType === 'LIMIT_PULLBACK' ? '[Limit Retest]' : '[Market]'}
                </span>

                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                  Target Exit (TP): ${verdict.targetPrice.toLocaleString()} (+{verdict.takeProfitPct}%)
                </span>

                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-rose-950/50 text-rose-300 border border-rose-500/30">
                  Stop-Loss (SL): ${verdict.stopLossPrice.toLocaleString()} (-{verdict.stopLossPct}%)
                </span>

                <span className="text-zinc-400 text-xs font-normal">
                  (Confidence: {verdict.confidence}%, Consensus: {verdict.consensusAlignmentPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Council Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Target Entry</span>
              <span className="text-amber-300 font-bold font-mono">${(verdict.targetEntryPrice || verdict.currentPrice).toLocaleString()}</span>
              <span className="text-[9px] text-zinc-400 block">{verdict.executionType === 'LIMIT_PULLBACK' ? 'Limit Retest' : 'Market Order'}</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Target Exit (TP)</span>
              <span className="text-emerald-400 font-bold font-mono">+{verdict.takeProfitPct}%</span>
              <span className="text-[9px] text-emerald-300/80 font-mono block">${verdict.targetPrice.toLocaleString()}</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Stop Loss (SL)</span>
              <span className="text-rose-400 font-bold font-mono">-{verdict.stopLossPct}%</span>
              <span className="text-[9px] text-rose-300/80 font-mono block">${verdict.stopLossPrice.toLocaleString()}</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Risk / Reward</span>
              <span className="text-white font-bold">{verdict.riskRewardRatio} : 1</span>
              <span className="text-[9px] text-zinc-500 block">Asymmetric Ratio</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Agreed Sizing</span>
              <span className="text-white font-bold">{verdict.optimalSizePct}% NAV</span>
              <span className="text-[9px] text-zinc-500 block">Safe Risk Cap</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Win Probability</span>
              <span className="text-cyan-400 font-bold">{verdict.winRatePct}%</span>
              <span className="text-[9px] text-zinc-500 block">Monte Carlo Target</span>
            </div>
          </div>

          {/* Re-Huddle Cross Examination Panel */}
          {onApplyAmendedVerdict && (
            <ReHuddlePanel
              verdict={verdict}
              onApplyAmendedVerdict={onApplyAmendedVerdict}
            />
          )}

          {/* Execution Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                playCyberClick();
                onReturnToMatrix();
              }}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Inspect Raw Quorum Matrix Data</span>
            </button>

            <button
              onClick={() => {
                playCyberClick();
                if (verdict.action !== 'HOLD') {
                  playTradeApprovedChime();
                } else {
                  playRiskVetoTone();
                }
                onSendToAutopilot(verdict.tradeProposal);
              }}
              className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-extrabold px-4 py-2 rounded-lg text-xs shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>DISPATCH DECREE TO AUTOPILOT</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
