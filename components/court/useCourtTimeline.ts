// components/court/useCourtTimeline.ts
// Mathematical motion and timeline state machine for the Lunaris Courtroom
// Frame-perfect lockstep mirror of Quorum Matrix deliberation with Option A compact dialogue bubbles

import { useState, useEffect, useRef, useMemo } from 'react';
import { ConsensusVerdict, AgentPersonaId } from '@/lib/councilDebateEngine';
import { evaluateTradeRisk } from '@/lib/riskVeto';
import { CastCharacterId, COURT_THEME } from './courtTheme';
import {
  playWoodenGavelKnock,
  playGavelImpactSound,
  playCourtObjectionSting,
  playHeartbeatSound,
  playTradeApprovedChime,
  playRiskVetoTone,
} from '@/lib/soundSynth';

// Mathematical easing helpers
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

const tween = (
  t: number,
  a: number,
  b: number,
  from: number,
  to: number,
  e = ease.outCubic
) => from + (to - from) * e(clamp((t - a) / (b - a)));

function spring(t: number, { stiffness, damping }: { stiffness: number; damping: number }) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness);
  const z = damping / (2 * Math.sqrt(stiffness));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// Gavel quick tap helper
const tap = (d: number) => (d < 0 ? 0 : d < 0.1 ? Math.pow(d / 0.1, 2) : d < 0.3 ? 1 - (d - 0.1) / 0.2 : 0);

// Option A: Extract punchy first sentence of the agent's real speech (max ~65 chars)
function extractPunchline(text: string, maxLen = 65): string {
  if (!text) return '';
  const clean = text.trim();
  const match = clean.match(/^([^.!?]+[.!?])/);
  let firstSentence = match ? match[1].trim() : clean;
  if (firstSentence.length > maxLen) {
    const cut = firstSentence.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    firstSentence = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '...';
  }
  return firstSentence;
}

export interface UseCourtTimelineOptions {
  verdict: ConsensusVerdict | null;
  ticker: string;
  isDebating: boolean;
  syncedVisibleTurnsCount?: number;
  isTypingNextTurn?: boolean;
  typingSpeaker?: AgentPersonaId;
  soundActive: boolean;
  speed: 1 | 2;
  isPlaying: boolean;
}

export type CourtPhase = 'RECESS' | 'CONVENING' | 'ARGUMENTS' | 'RISK_CHECK' | 'VOTING' | 'VERDICT';

export function useCourtTimeline({
  verdict,
  ticker,
  isDebating,
  syncedVisibleTurnsCount = 0,
  isTypingNextTurn = false,
  typingSpeaker,
  soundActive,
  speed,
  isPlaying,
}: UseCourtTimelineOptions) {
  // Session tracking: court starts at RECESS until user convenes council
  const [hasStartedSession, setHasStartedSession] = useState<boolean>(false);
  const [conveningTimer, setConveningTimer] = useState<number>(0);
  const [strikeTimer, setStrikeTimer] = useState<number>(-1);
  const [isManualReplay, setIsManualReplay] = useState<boolean>(false);
  const [replayTurnIndex, setReplayTurnIndex] = useState<number>(0);

  const prevDebatingRef = useRef<boolean>(isDebating);
  const playedSoundsRef = useRef<Record<string, boolean>>({});

  // 1. Risk engine validation
  const riskResult = useMemo(() => {
    if (!verdict) return { approved: true, reason: 'APPROVED — RISK VERIFIED' };
    return evaluateTradeRisk(verdict.tradeProposal, 100000);
  }, [verdict]);

  const isVetoed = !riskResult.approved;

  // 2. Detect transition into active deliberation when user clicks "Convene Council"
  useEffect(() => {
    if (!prevDebatingRef.current && isDebating) {
      setHasStartedSession(true);
      setConveningTimer(0);
      setStrikeTimer(-1);
      setIsManualReplay(false);
      playedSoundsRef.current = {};
    }
    prevDebatingRef.current = isDebating;
  }, [isDebating]);

  // 3. Increment convening timer while preparing/querying API
  useEffect(() => {
    if (!isDebating || syncedVisibleTurnsCount > 0) return;
    const interval = setInterval(() => {
      setConveningTimer((t) => t + 0.1 * speed);
    }, 100);
    return () => clearInterval(interval);
  }, [isDebating, syncedVisibleTurnsCount, speed]);

  // 4. Trigger final verdict strike when Quorum Matrix finishes all turns
  const isDebateComplete = Boolean(
    verdict &&
      syncedVisibleTurnsCount >= (verdict.turns?.length || 4) &&
      !isDebating
  );

  useEffect(() => {
    if (isDebateComplete && hasStartedSession && strikeTimer < 0) {
      setStrikeTimer(0);
    }
  }, [isDebateComplete, hasStartedSession, strikeTimer]);

  // 5. Advance strike timer once verdict is reached
  useEffect(() => {
    if (strikeTimer < 0) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (isPlaying) {
        setStrikeTimer((prev) => (prev >= 6.0 ? 6.0 : prev + dt * speed));
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [strikeTimer, isPlaying, speed]);

  // 6. Audio synchronization
  useEffect(() => {
    if (!soundActive || !hasStartedSession) return;

    // Gavel taps during Convening preparation
    if (isDebating && syncedVisibleTurnsCount === 0) {
      if (conveningTimer >= 0.2 && !playedSoundsRef.current['convening_tap1']) {
        playedSoundsRef.current['convening_tap1'] = true;
        playWoodenGavelKnock(false);
      }
      if (conveningTimer >= 0.6 && !playedSoundsRef.current['convening_tap2']) {
        playedSoundsRef.current['convening_tap2'] = true;
        playWoodenGavelKnock(false);
      }
    }

    // Objection sting when Nexus-Red speaks
    const isNexusActive =
      (isTypingNextTurn && typingSpeaker === 'NEXUS_RED') ||
      (!isTypingNextTurn && syncedVisibleTurnsCount === 3);

    if (isNexusActive && !playedSoundsRef.current['objection_played']) {
      playedSoundsRef.current['objection_played'] = true;
      playCourtObjectionSting();
    }

    // Heartbeat during Guardian risk turn
    const isGuardianActive =
      (isTypingNextTurn && typingSpeaker === 'GUARDIAN') ||
      (!isTypingNextTurn && syncedVisibleTurnsCount === 2);

    if (isGuardianActive && !playedSoundsRef.current['heartbeat_played']) {
      playedSoundsRef.current['heartbeat_played'] = true;
      playHeartbeatSound();
    }

    // Final verdict gavel strike
    if (strikeTimer >= 0.1 && !playedSoundsRef.current['final_strike']) {
      playedSoundsRef.current['final_strike'] = true;
      playGavelImpactSound();
      if (isVetoed) {
        setTimeout(playRiskVetoTone, 220);
      } else {
        setTimeout(playTradeApprovedChime, 220);
      }
    }
  }, [
    soundActive,
    hasStartedSession,
    isDebating,
    syncedVisibleTurnsCount,
    conveningTimer,
    isTypingNextTurn,
    typingSpeaker,
    strikeTimer,
    isVetoed,
  ]);

  // 7. Determine active court phase
  const currentPhase: CourtPhase = useMemo(() => {
    if (!hasStartedSession) return 'RECESS';
    if (isDebating && syncedVisibleTurnsCount === 0) return 'CONVENING';
    if (strikeTimer >= 0) return 'VERDICT';
    if (isDebating && syncedVisibleTurnsCount > 0) {
      const activeIdx = isTypingNextTurn
        ? typingSpeaker === 'QUANT'
          ? 1
          : typingSpeaker === 'GUARDIAN'
          ? 2
          : typingSpeaker === 'NEXUS_RED'
          ? 3
          : 4
        : syncedVisibleTurnsCount;

      if (activeIdx === 2) return 'RISK_CHECK';
      if (activeIdx >= 4) return 'VOTING';
      return 'ARGUMENTS';
    }
    return 'RECESS';
  }, [hasStartedSession, isDebating, syncedVisibleTurnsCount, strikeTimer, isTypingNextTurn, typingSpeaker]);

  // 8. Determine active speaker and speech bubble (Option A)
  const activeBubble = useMemo(() => {
    if (!hasStartedSession) return null;

    // A. Preparing / Convening phase: Gemini calls court to order
    if (isDebating && syncedVisibleTurnsCount === 0) {
      return {
        who: 'gemini' as CastCharacterId,
        speakerLabel: 'GEMINI // HIGH ARBITER',
        text: `Order! Order in the High Court! Convening Council on ${ticker}...`,
        x: 960,
        y: 640,
        tail: 0,
        size: 18,
        opacity: 1,
        scale: 1,
      };
    }

    // B. Deliberating turns: exact mirror of Quorum Matrix turns
    if (isDebating && syncedVisibleTurnsCount > 0 && verdict?.turns) {
      const turns = verdict.turns;
      let targetSpeakerId: AgentPersonaId = 'QUANT';

      if (isTypingNextTurn && typingSpeaker) {
        targetSpeakerId = typingSpeaker;
      } else {
        const turnIdx = Math.min(syncedVisibleTurnsCount - 1, turns.length - 1);
        targetSpeakerId = turns[turnIdx]?.speakerId || 'QUANT';
      }

      const activeTurn = turns.find((t) => t.speakerId === targetSpeakerId) || turns[0];

      if (targetSpeakerId === 'QUANT') {
        const punchline = extractPunchline(
          activeTurn?.speech || `Breakout momentum confirmed on ${ticker}. Propose Long.`
        );
        return {
          who: 'quant' as CastCharacterId,
          speakerLabel: `QUANT-OMEGA // ${activeTurn?.stanceLabel || 'BULLISH'}`,
          text: punchline,
          x: 390,
          y: 560,
          tail: -40,
          size: 18,
          opacity: 1,
          scale: 1,
        };
      }

      if (targetSpeakerId === 'GUARDIAN') {
        const punchline = extractPunchline(
          activeTurn?.speech || `Risk profile verified. Stop-loss required at ${verdict.stopLossPrice}.`
        );
        return {
          who: 'guardian' as CastCharacterId,
          speakerLabel: `GUARDIAN-01 // ${activeTurn?.stanceLabel || 'RISK ARBITER'}`,
          text: punchline,
          x: 960,
          y: 190,
          tail: 0,
          size: 18,
          opacity: 1,
          scale: 1,
        };
      }

      if (targetSpeakerId === 'NEXUS_RED') {
        const rawPunchline = extractPunchline(
          activeTurn?.speech || 'Trap check: limit IOC execution parameters enforced.'
        );
        const punchline = rawPunchline.toLowerCase().startsWith('objection')
          ? rawPunchline
          : `Objection! ${rawPunchline}`;

        return {
          who: 'nexus' as CastCharacterId,
          speakerLabel: `NEXUS-RED // ${activeTurn?.stanceLabel || 'ADVERSARIAL'}`,
          text: punchline,
          x: 1510,
          y: 560,
          tail: 40,
          size: 18,
          opacity: 1,
          scale: 1,
        };
      }

      if (targetSpeakerId === 'MACRO') {
        const punchline = extractPunchline(
          activeTurn?.speech || `Macro convergence confirmed. Ratifying strategy for ${ticker}.`
        );
        return {
          who: 'atlas' as CastCharacterId,
          speakerLabel: `ATLAS-MACRO // ${activeTurn?.stanceLabel || 'SUPERMAJORITY'}`,
          text: punchline,
          x: 460,
          y: 190,
          tail: -20,
          size: 18,
          opacity: 1,
          scale: 1,
        };
      }
    }

    return null;
  }, [
    hasStartedSession,
    isDebating,
    syncedVisibleTurnsCount,
    isTypingNextTurn,
    typingSpeaker,
    verdict,
    ticker,
  ]);

  const activeBubbles = activeBubble ? [activeBubble] : [];

  // 9. Camera framing & shake
  let zoom = 1;
  let focusX = 960;
  let focusY = 560;
  let shakeX = 0;
  let shakeY = 0;

  if (currentPhase === 'CONVENING') {
    focusX = 960;
    focusY = 600;
    zoom = 1.05;
  } else if (currentPhase === 'ARGUMENTS' || currentPhase === 'RISK_CHECK') {
    if (activeBubble?.who === 'quant') {
      focusX = 420;
      focusY = 640;
      zoom = 1.1;
    } else if (activeBubble?.who === 'guardian') {
      focusX = 960;
      focusY = 340;
      zoom = 1.18;
    } else if (activeBubble?.who === 'nexus') {
      focusX = 1500;
      focusY = 640;
      zoom = 1.12;
    } else if (activeBubble?.who === 'atlas') {
      focusX = 480;
      focusY = 340;
      zoom = 1.12;
    }
  } else if (currentPhase === 'VERDICT') {
    focusX = 960;
    focusY = 560;
    zoom = 1.0;
    if (strikeTimer >= 0 && strikeTimer < 0.8) {
      const k = strikeTimer;
      const amp = 24 * Math.exp(-k * 7.5);
      shakeX = amp * Math.sin(k * 72);
      shakeY = amp * Math.cos(k * 87);
    }
  }

  // 10. Gavel Angle
  let gavelAngle = COURT_THEME.gavel.restAngle;
  if (currentPhase === 'CONVENING') {
    gavelAngle = 24 + 55 * (tap(conveningTimer - 0.2) + tap(conveningTimer - 0.6));
  } else if (currentPhase === 'RISK_CHECK') {
    gavelAngle = 42;
  } else if (currentPhase === 'VERDICT') {
    const k = strikeTimer;
    if (k < 0.15) {
      gavelAngle = 24 + 64 * (k / 0.15); // Striking down fast!
    } else {
      gavelAngle = 88 - 14 * Math.exp(-(k - 0.15) * 8) * Math.abs(Math.sin((k - 0.15) * 20));
    }
  }

  // 11. Gavel Shockwave Ring & Case File Stamp
  const isPostStrike = strikeTimer >= 0.15;
  const k = Math.max(0, strikeTimer - 0.15);
  const ringScale = isPostStrike ? 0.2 + 5 * tween(k, 0, 0.7, 0, 1, ease.outExpo) : 0.2;
  const ringOpacity = isPostStrike ? 0.85 * (1 - tween(k, 0, 0.7, 0, 1, ease.outExpo)) : 0;

  const SP = COURT_THEME.spring;
  const stampP = spring(k, SP.snap);
  const stampScale = isPostStrike ? 2.2 - 1.2 * stampP : 1;
  const stampOpacity = isPostStrike ? clamp(k / 0.08) : 0;
  const stampType = isPostStrike ? (isVetoed ? 'VETO' : 'APPROVED') : 'NONE';

  // 12. Flash Overlay
  let flashColor = '#ffffff';
  let flashOpacity = 0;
  if (isPostStrike && k < 0.8) {
    flashColor = k < 0.07 ? '#ffffff' : isVetoed ? COURT_THEME.color.magenta : COURT_THEME.color.cyan;
    flashOpacity = k < 0.07 ? 0.6 : 0.25 * Math.exp(-(k - 0.07) * 7.5);
  }

  // 13. Dynamic Caption Ribbon (Option A + No Cropping)
  let caption = 'High Court in recess. Convene Council to deliberate on trade proposal.';
  if (currentPhase === 'CONVENING') {
    caption = `COUNCIL CONVENED // Gemini High Arbiter calling order for ${ticker}...`;
  } else if (currentPhase === 'ARGUMENTS') {
    if (activeBubble?.who === 'quant') {
      caption = `ARGUMENTS // Quant-Omega: Momentum signals & orderflow submitted for ${ticker}.`;
    } else if (activeBubble?.who === 'nexus') {
      caption = `ADVERSARIAL CHALLENGE // Nexus-Red: Stress-testing orderbook depth & spoofing traps.`;
    } else if (activeBubble?.who === 'atlas') {
      caption = `MACRO CONVERGENCE // Atlas-Macro: Cross-asset basis and funding correlation.`;
    }
  } else if (currentPhase === 'RISK_CHECK') {
    caption = `RISK DELIBERATION // Guardian-01: Verifying VaR & stop-loss bounds.`;
  } else if (currentPhase === 'VOTING') {
    caption = `QUORUM VOTE SUBMITTED // Council majority reached. Awaiting High Court decree.`;
  } else if (currentPhase === 'VERDICT') {
    caption = isVetoed
      ? `TRIBUNAL VETO ENGAGED: Proposal terminated by Risk Arbiter.`
      : `RULING RATIFIED: ${verdict?.action || 'BUY'} ${ticker} (Confidence: ${verdict?.confidence || 75}%)`;
  }

  // 14. Vote Badges
  const voteBadges = {
    quant: { visible: currentPhase === 'VOTING' || currentPhase === 'VERDICT', approved: true },
    atlas: { visible: currentPhase === 'VOTING' || currentPhase === 'VERDICT', approved: true },
    nexus: { visible: currentPhase === 'VOTING' || currentPhase === 'VERDICT', approved: !isVetoed },
  };

  // 15. Character Anatomy (Blinking, eye directions, head bobs)
  const nowSec = performance.now() / 1000;
  const BLINK = { guardian: 0.4, gemini: 2.3, quant: 0.2, atlas: 1.6, nexus: 0.9 };
  const cast = COURT_THEME.cast;

  const eyeStates: Record<CastCharacterId, any> = {} as any;
  const headOffsets: Record<CastCharacterId, any> = {} as any;
  const rootOffsets: Record<CastCharacterId, any> = {} as any;

  (Object.keys(cast) as CastCharacterId[]).forEach((id) => {
    const c = cast[id];
    const isSpeaking = activeBubble?.who === id;
    const blink = (nowSec + BLINK[id]) % 3.4 < 0.13 ? 1 : 0;

    rootOffsets[id] = { y: 0 };

    const side = c.x < 960 ? 1 : c.x > 960 ? -1 : 0;
    headOffsets[id] = {
      rot: isSpeaking ? side * 6 + Math.sin(nowSec * 18) * 2 : Math.sin(nowSec * 1.5 + c.x) * 1.5,
      y: isSpeaking ? -5 * Math.abs(Math.sin(nowSec * 16)) : Math.sin(nowSec * 1.8 + c.x) * 2.5,
    };

    let look: [number, number] = [0, 0];
    let pupilScale = 1;
    let lid = c.rest.lid ?? 0;
    let lidTilt = c.rest.lidTilt ?? 0;

    if (currentPhase === 'RECESS') {
      look = [0, 0];
    } else if (currentPhase === 'VERDICT') {
      look = [0, 0.8]; // Look down at Case File on desk
    } else if (activeBubble) {
      if (isSpeaking) {
        look = [side * 0.7, -0.1];
        pupilScale = 1.1;
      } else {
        const targetX = cast[activeBubble.who].x;
        const targetY = cast[activeBubble.who].y;
        const dx = targetX - c.x;
        const dy = targetY - c.y;
        const dist = Math.hypot(dx, dy) || 1;
        look = [dx / dist, dy / dist];
      }
    }

    if (blink) {
      lid = 1;
    }

    eyeStates[id] = { look, lid, lidTilt, pupilScale };
  });

  return {
    cameraZoom: zoom,
    cameraFocus: { x: focusX, y: focusY },
    cameraShake: { x: shakeX, y: shakeY },
    eyeStates,
    headOffsets,
    rootOffsets,
    gavelAngle,
    gavelRingOpacity: ringOpacity,
    gavelRingScale: ringScale,
    caseFileStamp: stampType as 'NONE' | 'VETO' | 'APPROVED',
    caseFileStampScale: stampScale,
    caseFileStampOpacity: stampOpacity,
    flashColor,
    flashOpacity,
    activeBubbles,
    voteBadges,
    caption,
    isScreenDisputed: currentPhase === 'ARGUMENTS' && activeBubble?.who === 'nexus',
    currentPhaseName: currentPhase,
    restartTimeline: () => {
      setHasStartedSession(true);
      setConveningTimer(0);
      setStrikeTimer(-1);
      playedSoundsRef.current = {};
    },
    skipToVerdict: () => {
      setHasStartedSession(true);
      setStrikeTimer(0.15);
      playedSoundsRef.current['final_strike'] = true;
    },
  };
}
