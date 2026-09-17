// components/CyberCourtroomView.tsx
// High-Octane "Cyber-Tribunal: Bitget High Court of Trading Alpha"
// Live Animated Multi-Agent Courtroom Cross-Examination & Gavel Slam
// Calm, eye-resting dark aesthetic matching the official Council theme

import React, { useState, useEffect, useRef } from 'react';
import {
  Gavel,
  ShieldAlert,
  Flame,
  Globe2,
  Skull,
  Shield,
  AlertTriangle,
  Volume2,
  VolumeX,
  ChevronRight,
  FileText,
  Layers,
  Scale,
  Zap,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  ConsensusVerdict,
  DebateTurn,
  COUNCIL_PERSONAS,
  AgentPersonaId,
} from '@/lib/councilDebateEngine';
import { ReHuddlePanel } from './ReHuddlePanel';
import { TradeProposal } from '@/lib/riskVeto';
import {
  playCyberClick,
  playCourtObjectionSting,
  playGavelImpactSound,
  playGavelRiserSound,
  playTradeApprovedChime,
  playRiskVetoTone,
} from '@/lib/soundSynth';

interface CyberCourtroomViewProps {
  verdict: ConsensusVerdict | null;
  ticker: string;
  isDebating: boolean;
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
  onConveneNewTrial,
  onSendToAutopilot,
  onReturnToMatrix,
  soundActive,
  onToggleSound,
  onApplyAmendedVerdict,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlayingTrial, setIsPlayingTrial] = useState<boolean>(true);
  const [objectingSpeakerId, setObjectingSpeakerId] = useState<AgentPersonaId | null>(null);
  const [isGavelStriking, setIsGavelStriking] = useState<boolean>(false);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [showVerdictStamp, setShowVerdictStamp] = useState<boolean>(false);
  const [showSparks, setShowSparks] = useState<boolean>(false);
  const [selectedExhibit, setSelectedExhibit] = useState<'NONE' | 'ORDERBOOK' | 'FUNDING'>('NONE');
  const [autoPlaySpeed] = useState<number>(2600);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger Objection specifically on the speaking agent card
  const triggerObjection = (speaker: AgentPersonaId) => {
    setObjectingSpeakerId(speaker);
    if (soundActive) {
      playCourtObjectionSting();
    }
    setTimeout(() => {
      setObjectingSpeakerId(null);
    }, 2200);
  };

  // Slam the Gavel with shockwave, sound, and screen shake
  const slamGavel = () => {
    setIsGavelStriking(true);
    if (soundActive) {
      playGavelRiserSound();
    }

    setTimeout(() => {
      setIsScreenShaking(true);
      setShowSparks(true);
      setShowVerdictStamp(true);
      if (soundActive) {
        playGavelImpactSound();
      }

      setTimeout(() => {
        setIsGavelStriking(false);
        setIsScreenShaking(false);
        setShowSparks(false);
      }, 500);
    }, 190);
  };

  // Reset trial state when new verdict arrives
  useEffect(() => {
    if (verdict) {
      setCurrentStepIndex(0);
      setShowVerdictStamp(false);
      setIsPlayingTrial(true);
    }
  }, [verdict?.ticker, verdict?.timestamp]);

  // Step player progression
  useEffect(() => {
    if (!verdict || !isPlayingTrial) return;

    if (currentStepIndex < verdict.turns.length) {
      timerRef.current = setTimeout(() => {
        const nextIdx = currentStepIndex + 1;
        setCurrentStepIndex(nextIdx);

        // If turn is Guardian, NEXUS-RED or any persona with skeptic/veto stance, trigger targeted objection
        const currentTurn = verdict.turns[currentStepIndex];
        if (
          currentTurn &&
          (currentTurn.speakerId === 'GUARDIAN' ||
            currentTurn.speakerId === 'NEXUS_RED' ||
            currentTurn.stanceType === 'SKEPTIC' ||
            currentTurn.stanceType === 'VETO')
        ) {
          triggerObjection(currentTurn.speakerId);
        }

        // If reached final turn, slam the gavel
        if (nextIdx >= verdict.turns.length) {
          setTimeout(() => {
            slamGavel();
          }, 600);
        }
      }, autoPlaySpeed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStepIndex, isPlayingTrial, verdict, autoPlaySpeed, soundActive]);

  const activeTurn: DebateTurn | null =
    verdict && verdict.turns[Math.min(currentStepIndex, verdict.turns.length - 1)]
      ? verdict.turns[Math.min(currentStepIndex, verdict.turns.length - 1)]
      : null;

  const activeSpeakerId: AgentPersonaId = activeTurn ? activeTurn.speakerId : 'QUANT';
  const isTrialFinished = verdict && currentStepIndex >= verdict.turns.length;

  return (
    <div
      id="cyber-courtroom-root"
      className={`relative w-full rounded-xl border border-white/10 bg-[#08090d] p-4 sm:p-5 select-none font-mono text-zinc-200 transition-all ${
        isScreenShaking ? 'animate-court-shake ring-1 ring-amber-400/40' : ''
      }`}
    >
      {/* TOP COURTROOM NAVIGATION & COMMAND DECK */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold text-white tracking-wider font-mono">
              THE CYBER-TRIBUNAL
            </span>
          </div>
          <span className="text-[10px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded border border-white/10 font-mono">
            Council High Court of Trading Alpha
          </span>
          <span className="hidden sm:inline text-[10px] bg-white/5 text-[#00F0FF] border border-[#00F0FF]/30 px-2 py-0.5 rounded font-mono">
            CASE #{ticker}-2026-Q3
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              playCyberClick();
              onToggleSound();
            }}
            title={soundActive ? 'Court Audio: Active' : 'Court Audio: Muted'}
            className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              soundActive
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{soundActive ? 'Audio ON' : 'Muted'}</span>
          </button>

          {/* Replay Trial */}
          {isTrialFinished && (
            <button
              onClick={() => {
                playCyberClick();
                setCurrentStepIndex(0);
                setShowVerdictStamp(false);
                setIsPlayingTrial(true);
              }}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs border border-white/10 transition-colors cursor-pointer"
              title="Replay trial cross-examination"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px]">Replay</span>
            </button>
          )}

          {/* Manual Gavel Slam Trigger */}
          <button
            onClick={() => {
              playCyberClick();
              slamGavel();
            }}
            className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
            title="Slam the Magistrate Gavel to deliver immediate verdict"
          >
            <Gavel className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px]">SLAM GAVEL</span>
          </button>

          {/* Return to Matrix Mode */}
          <button
            onClick={() => {
              playCyberClick();
              onReturnToMatrix();
            }}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg text-xs border border-white/10 transition-colors cursor-pointer"
            title="Return to the classic Quorum Matrix table"
          >
            <Layers className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span className="text-[10px]">Quorum Matrix</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. THE HIGH BENCH: GUARDIAN-01 (CHIEF RISK ARBITER)       */}
      {/* ========================================================= */}
      <div
        className={`relative bg-[#0c0e14] border rounded-xl p-4 mb-4 text-center flex flex-col items-center justify-center transition-all duration-300 ${
          objectingSpeakerId === 'GUARDIAN'
            ? 'border-rose-500/80 ring-2 ring-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.25)]'
            : 'border-white/10'
        }`}
      >
        {/* Localized Objection Callout right on top of Guardian-01 */}
        {objectingSpeakerId === 'GUARDIAN' && (
          <div className="absolute -top-3.5 z-40 animate-objection-slam flex items-center gap-1.5 bg-rose-600 text-white font-extrabold text-[11px] sm:text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-lg border border-white/80 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
            <span>OBJECTION, MY LORD! // {COUNCIL_PERSONAS.GUARDIAN.name} INTERVENES</span>
          </div>
        )}

        {/* Bench Header */}
        <div className="flex items-center gap-2 mb-1 text-zinc-300">
          <Shield className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] font-bold tracking-wider uppercase font-mono text-zinc-200">
            CHIEF RISK MAGISTRATE BENCH // {COUNCIL_PERSONAS.GUARDIAN.name}
          </span>
          <Scale className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mb-2">
          {COUNCIL_PERSONAS.GUARDIAN.role} • Presiding over $100,000.00 USD Capital Pool
        </p>

        {/* Sleek, Realistic Titanium & Obsidian Magistrate Gavel */}
        <div className="relative w-44 h-24 flex items-center justify-center my-0.5">
          {/* Shockwave Particle Ring */}
          {showSparks && (
            <div className="absolute w-24 h-24 rounded-full border border-amber-400/80 animate-shockwave-ring pointer-events-none" />
          )}

          {/* Precision Matte Sound Block Pedestal */}
          <div className="absolute bottom-2 w-32 h-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-700/60 rounded-md shadow-md flex items-center justify-center">
            <div className="w-24 h-0.5 bg-amber-400/30 rounded-full" />
          </div>

          {/* Elegant Precision-Engineered Gavel */}
          <div
            onClick={slamGavel}
            className={`cursor-pointer transition-transform duration-150 relative ${
              isGavelStriking ? 'animate-gavel-strike' : 'hover:scale-105'
            }`}
            title="Click to strike the Magistrate Gavel!"
          >
            <svg
              className="w-24 h-24 filter drop-shadow-md"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="gavelWood" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2c2d35" />
                  <stop offset="50%" stopColor="#1a1b22" />
                  <stop offset="100%" stopColor="#0e0f14" />
                </linearGradient>
                <linearGradient id="gavelMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d4d4d8" />
                  <stop offset="50%" stopColor="#a1a1aa" />
                  <stop offset="100%" stopColor="#52525b" />
                </linearGradient>
                <linearGradient id="gavelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#a16207" />
                </linearGradient>
              </defs>

              {/* Slender Handle */}
              <rect
                x="45"
                y="22"
                width="6"
                height="54"
                rx="3"
                transform="rotate(38 45 22)"
                fill="url(#gavelWood)"
                stroke="#3f3f46"
                strokeWidth="1.2"
              />
              {/* Handle Grip Inlay */}
              <rect
                x="43.5"
                y="52"
                width="7"
                height="18"
                rx="2"
                transform="rotate(38 45 22)"
                fill="url(#gavelMetal)"
                opacity="0.85"
              />

              {/* Gavel Head Body */}
              <rect
                x="18"
                y="18"
                width="38"
                height="16"
                rx="3"
                transform="rotate(38 18 18)"
                fill="url(#gavelWood)"
                stroke="#52525b"
                strokeWidth="1.5"
              />

              {/* Dual Titanium Rings */}
              <rect
                x="22"
                y="17"
                width="3.5"
                height="18"
                rx="1"
                transform="rotate(38 18 18)"
                fill="url(#gavelGold)"
              />
              <rect
                x="46"
                y="17"
                width="3.5"
                height="18"
                rx="1"
                transform="rotate(38 18 18)"
                fill="url(#gavelGold)"
              />

              {/* Striking Faces */}
              <rect
                x="16"
                y="19"
                width="3"
                height="14"
                rx="1"
                transform="rotate(38 18 18)"
                fill="url(#gavelMetal)"
              />
              <rect
                x="55"
                y="19"
                width="3"
                height="14"
                rx="1"
                transform="rotate(38 18 18)"
                fill="url(#gavelMetal)"
              />
            </svg>
          </div>
        </div>

        {/* Chief Magistrate Speech & Rationale */}
        <p className="text-xs text-zinc-300 font-sans italic max-w-lg mt-1">
          "{isTrialFinished
            ? 'Deliberation concluded. Consensus sealed under council oath. Transmitting execution decree to Autopilot.'
            : 'Order in the court. The 4 Council personas will present telemetry under oath. No capital leaves this pool unhedged.'}"
        </p>
      </div>

      {/* ========================================================= */}
      {/* 2. THE 3 PODIUMS: QUANT-OMEGA, NEXUS-RED & ATLAS-MACRO    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* PODIUM 1: THE PROSECUTION (Quant-Omega) */}
        <div
          className={`relative rounded-xl p-3.5 border transition-all duration-300 flex flex-col justify-between ${
            objectingSpeakerId === 'QUANT'
              ? 'bg-[#180f12] border-rose-500/80 ring-2 ring-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
              : activeSpeakerId === 'QUANT'
              ? 'bg-[#0f141d] border-[#00F0FF]/40 ring-1 ring-[#00F0FF]/30'
              : 'bg-[#0b0c12] border-white/10 opacity-75'
          }`}
        >
          {/* Localized Objection Callout right on top of Quant-Omega */}
          {objectingSpeakerId === 'QUANT' && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 animate-objection-slam flex items-center gap-1.5 bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg border border-white/80 whitespace-nowrap font-mono">
              <AlertTriangle className="w-3 h-3 text-yellow-300 animate-bounce" />
              <span>OBJECTION! // {COUNCIL_PERSONAS.QUANT.name}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white/5 border border-white/15 flex items-center justify-center text-white">
                  <Flame className="w-3 h-3 text-zinc-200 fill-zinc-200" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block leading-tight">
                    {COUNCIL_PERSONAS.QUANT.name}
                  </span>
                  <span className="text-[9px] text-zinc-500">The Prosecution // Momentum Lead</span>
                </div>
              </div>
              {activeSpeakerId === 'QUANT' && (
                <span className="text-[9px] bg-white text-black font-bold px-1.5 py-0.2 rounded font-mono">
                  SPEAKING
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 text-zinc-300 leading-relaxed font-sans">
                <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase mb-1">
                  &gt; Trade Indictment &amp; Momentum Case:
                </p>
                "{verdict ? verdict.turns[0]?.speech || 'Technical momentum breakout identified. Moving to allocate capital.' : 'Reviewing orderflow momentum...'}"
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/10 mt-2.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-500">Proposed Action:</span>
            <span className="text-emerald-400 font-bold">
              {verdict ? `${verdict.action} ${verdict.ticker}` : 'PENDING'}
            </span>
          </div>
        </div>

        {/* PODIUM 2: THE INQUISITOR & CROSS-EXAMINER (NEXUS-RED) */}
        <div
          className={`relative rounded-xl p-3.5 border transition-all duration-300 flex flex-col justify-between ${
            objectingSpeakerId === 'NEXUS_RED'
              ? 'bg-[#180f12] border-rose-500/90 ring-2 ring-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
              : activeSpeakerId === 'NEXUS_RED'
              ? 'bg-[#180f12] border-rose-500/40 ring-1 ring-rose-500/30'
              : 'bg-[#0b0c12] border-white/10 opacity-75'
          }`}
        >
          {/* Localized Objection Callout right on top of NEXUS-RED */}
          {objectingSpeakerId === 'NEXUS_RED' && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 animate-objection-slam flex items-center gap-1.5 bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg border border-white/80 whitespace-nowrap font-mono">
              <AlertTriangle className="w-3 h-3 text-yellow-300 animate-bounce" />
              <span>OBJECTION, MY LORD! // {COUNCIL_PERSONAS.NEXUS_RED.name}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Skull className="w-3 h-3 text-rose-400" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-rose-300 block leading-tight">
                    {COUNCIL_PERSONAS.NEXUS_RED.name}
                  </span>
                  <span className="text-[9px] text-zinc-500">Red Team Inquisitor // Chaos Arbiter</span>
                </div>
              </div>
              {activeSpeakerId === 'NEXUS_RED' && (
                <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded font-mono">
                  OBJECTING
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="bg-black/40 border border-rose-500/20 rounded-lg p-2.5 text-zinc-300 leading-relaxed font-sans">
                <p className="font-mono text-[9px] text-rose-400 font-bold uppercase mb-1">
                  &gt; Adversarial Cross-Examination:
                </p>
                "{verdict && verdict.turns[1] ? verdict.turns[1].speech : 'OBJECTION, MY LORD! Orderbook displays spoofing liquidity and tail risk threatening our capital.'}"
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/10 mt-2.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-500">Defense Stance:</span>
            <span className="text-rose-400 font-bold">
              {verdict && verdict.turns[1] ? verdict.turns[1].stanceLabel : 'VETO ARMED'}
            </span>
          </div>
        </div>

        {/* PODIUM 3: FORENSIC WITNESS (Atlas-Macro) */}
        <div
          className={`relative rounded-xl p-3.5 border transition-all duration-300 flex flex-col justify-between ${
            objectingSpeakerId === 'MACRO'
              ? 'bg-[#180f12] border-rose-500/80 ring-2 ring-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
              : activeSpeakerId === 'MACRO'
              ? 'bg-[#141416] border-zinc-500/40 ring-1 ring-white/20'
              : 'bg-[#0b0c12] border-white/10 opacity-75'
          }`}
        >
          {/* Localized Objection Callout right on top of Atlas-Macro */}
          {objectingSpeakerId === 'MACRO' && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 animate-objection-slam flex items-center gap-1.5 bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg border border-white/80 whitespace-nowrap font-mono">
              <AlertTriangle className="w-3 h-3 text-yellow-300 animate-bounce" />
              <span>OBJECTION! // {COUNCIL_PERSONAS.MACRO.name}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white/5 border border-white/15 flex items-center justify-center text-white">
                  <Globe2 className="w-3 h-3 text-zinc-300" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block leading-tight">
                    {COUNCIL_PERSONAS.MACRO.name}
                  </span>
                  <span className="text-[9px] text-zinc-500">Forensic Witness // Macro Lead</span>
                </div>
              </div>
              {activeSpeakerId === 'MACRO' && (
                <span className="text-[9px] bg-zinc-300 text-black font-bold px-1.5 py-0.2 rounded font-mono">
                  TESTIFYING
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 text-zinc-300 leading-relaxed font-sans">
                <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase mb-1">
                  &gt; Macroeconomic &amp; Funding Telemetry:
                </p>
                "{verdict && verdict.turns[2] ? verdict.turns[2].speech : 'Reviewing global liquidity context and Bitget funding rates.'}"
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/10 mt-2.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-500">Evidence Record:</span>
            <span className="text-zinc-300 font-bold">Exhibit Sworn</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. EVIDENCE DOCKET: ORDERBOOK & FUNDING EXHIBITS          */}
      {/* ========================================================= */}
      <div className="bg-[#0b0c12] border border-white/10 rounded-xl p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              EVIDENCE DOCKET // TELEMETRY EXHIBITS
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedExhibit(selectedExhibit === 'ORDERBOOK' ? 'NONE' : 'ORDERBOOK')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                selectedExhibit === 'ORDERBOOK'
                  ? 'bg-white/10 border-white text-white'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              Exhibit A: L2 Depth
            </button>
            <button
              onClick={() => setSelectedExhibit(selectedExhibit === 'FUNDING' ? 'NONE' : 'FUNDING')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                selectedExhibit === 'FUNDING'
                  ? 'bg-white/10 border-white text-white'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              Exhibit B: Funding &amp; OI
            </button>
          </div>
        </div>

        {/* Expanded Exhibit Preview */}
        {selectedExhibit === 'ORDERBOOK' && (
          <div className="bg-black/50 border border-white/10 rounded-lg p-2.5 text-xs space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-bold block uppercase">
              Exhibit A // Bitget Live Orderbook Depth:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-zinc-500 block text-[9px]">Supporting Bid Shelf:</span>
                <span className="text-emerald-400 font-bold">$14.2M (Absorption Active)</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-zinc-500 block text-[9px]">Resistance Ask Wall:</span>
                <span className="text-rose-400 font-bold">$8.6M (Suspected Trap)</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              NEXUS-RED entered this exhibit to establish that aggressive market buying into this wall risks immediate adverse slippage.
            </p>
          </div>
        )}

        {selectedExhibit === 'FUNDING' && (
          <div className="bg-black/50 border border-white/10 rounded-lg p-2.5 text-xs space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-bold block uppercase">
              Exhibit B // Bitget Perpetual Funding &amp; Open Interest:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-zinc-500 block text-[9px]">8h Funding Rate:</span>
                <span className="text-zinc-200 font-bold">+0.0042% (Normal)</span>
              </div>
              <div className="bg-white/5 p-2 rounded border border-white/5">
                <span className="text-zinc-500 block text-[9px]">Open Interest Delta:</span>
                <span className="text-emerald-400 font-bold">+$45M (Institutional Inflows)</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Atlas-Macro testified that funding spreads remain healthy, supporting a disciplined position rather than an over-leveraged breakout.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. FINAL VERDICT DECREE SEAL & AUTOPILOT DISPATCH         */}
      {/* ========================================================= */}
      {showVerdictStamp && verdict && (
        <div className="bg-[#0c0e14] border border-white/15 rounded-xl p-4 space-y-3.5">
          {/* Holographic Verdict Stamp */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <Gavel className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest font-mono">
                  RATIFIED COUNCIL DECREE
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  verdict.executionType === 'LIMIT_PULLBACK'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                    : verdict.executionType === 'BREAKOUT_STOP'
                    ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                }`}>
                  {verdict.executionType === 'LIMIT_PULLBACK'
                    ? `Limit Retest @ $${(verdict.targetEntryPrice || verdict.currentPrice).toLocaleString()}`
                    : verdict.executionType === 'BREAKOUT_STOP'
                    ? `Breakout Stop @ $${(verdict.targetEntryPrice || verdict.currentPrice).toLocaleString()}`
                    : `Market Fill @ Current: $${verdict.currentPrice.toLocaleString()}`}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {verdict.action === 'BUY'
                  ? `EXECUTION APPROVED: LONG ${verdict.ticker}`
                  : verdict.action === 'SELL'
                  ? `EXECUTION APPROVED: SHORT ${verdict.ticker}`
                  : `ORDER DISMISSED: HOLD CASH`}
              </h3>
              <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-3">
                <span>Current Market: <strong className="text-emerald-400">${verdict.currentPrice.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Execution Target: <strong className="text-white">${(verdict.targetEntryPrice || verdict.currentPrice).toLocaleString()}</strong></span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                {verdict.synthesizedReasoning ||
                  `The Chief Magistrate has synthesized the objection of NEXUS-RED with the breakout claim of Quant-Omega. Execution authorized under strict conditional risk sizing.`}
              </p>
            </div>

            {/* Official Stamp */}
            <div className="animate-stamp-impact shrink-0 border-2 border-zinc-300 bg-white/5 text-zinc-200 font-bold px-3 py-1.5 rounded-lg text-center uppercase tracking-widest text-[10px] rotate-[-2deg] font-mono">
              <span className="block text-zinc-400 text-[9px]">COUNCIL SEAL</span>
              <span className="text-white font-extrabold text-xs">
                {verdict.action !== 'HOLD' ? 'CONDITIONAL PASSED' : 'VETO SUSTAINED'}
              </span>
            </div>
          </div>

          {/* Settled Trade Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Council Sizing</span>
              <span className="text-white font-bold">{verdict.optimalSizePct}% of NAV</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Stop Loss</span>
              <span className="text-rose-400 font-bold">-${verdict.stopLossPct}%</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Take Profit</span>
              <span className="text-emerald-400 font-bold">+${verdict.takeProfitPct}%</span>
            </div>
            <div className="bg-black/50 border border-white/5 p-2 rounded-lg">
              <span className="text-zinc-500 block text-[9px] uppercase">Win Rate</span>
              <span className="text-[#00F0FF] font-bold">{verdict.winRatePct}%</span>
            </div>
          </div>

          {/* Council Re-Huddle & Cross-Examination Chamber */}
          <ReHuddlePanel
            verdict={verdict}
            onApplyAmendedVerdict={onApplyAmendedVerdict}
          />

          {/* Action Execution Footer: DISPATCH TO AUTOPILOT */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              onClick={() => {
                playCyberClick();
                onReturnToMatrix();
              }}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
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
                onSendToAutopilot({
                  id: `TRIBUNAL_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  symbol: verdict.ticker,
                  action: verdict.action,
                  quantity: 1,
                  confidence: verdict.confidence,
                  source: 'STRAT_MOMENTUM',
                  reasoning: `Council Courtroom Decree: ${verdict.action} ${verdict.ticker} ratified after multi-agent cross-examination.`,
                  status: 'PENDING_APPROVAL',
                  riskScore: 3,
                });
              }}
              className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-extrabold px-4 py-2 rounded-lg text-xs shadow-sm transition-all cursor-pointer font-mono"
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
