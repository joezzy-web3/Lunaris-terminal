// components/DebateConsole.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2,
  Shield,
  Flame,
  Globe2,
  MessageSquare,
  AlertCircle,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  TrendingUp,
  Percent,
  Scale,
  Target,
  ShieldAlert,
  Users,
  CheckCheck,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { TradeProposal } from '@/lib/riskVeto';
import { fetchPriceSnapshot, ASSET_REGISTRY } from '@/lib/liveTokenFeed';
import { getSeededPrice } from '@/lib/demoSeedData';
import {
  generateCouncilDebate,
  ConsensusVerdict,
  DebateTurn,
  COUNCIL_PERSONAS,
  AgentPersonaId,
  PulseContext,
} from '@/lib/councilDebateEngine';
import {
  playCyberClick,
  playTradeApprovedChime,
  playRiskVetoTone,
  toggleTerminalSound,
  getTerminalSoundState,
} from '@/lib/soundSynth';

interface DebateConsoleProps {
  onSendToAutopilot: (trade: TradeProposal) => void;
  initialTicker?: string;
  incomingPulseContext?: (PulseContext & { ticker: string }) | null;
  onClearPulseContext?: () => void;
}

export function DebateConsole({
  onSendToAutopilot,
  initialTicker = 'TSLA',
  incomingPulseContext,
  onClearPulseContext,
}: DebateConsoleProps) {
  const [ticker, setTicker] = useState(incomingPulseContext?.ticker || initialTicker);
  const [isDebating, setIsDebating] = useState(false);
  const [verdict, setVerdict] = useState<ConsensusVerdict | null>(null);
  const [activePulseContext, setActivePulseContext] = useState<PulseContext | null>(incomingPulseContext || null);
  const [visibleTurnsCount, setVisibleTurnsCount] = useState<number>(0);
  const [isTypingNextTurn, setIsTypingNextTurn] = useState<boolean>(false);
  const [typingSpeaker, setTypingSpeaker] = useState<AgentPersonaId>('QUANT');
  const [streamSpeed, setStreamSpeed] = useState<'NORMAL' | 'FAST' | 'INSTANT'>('NORMAL');
  const [forceOverAllocation, setForceOverAllocation] = useState<boolean>(false);
  const [handoffSuccess, setHandoffSuccess] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(getTerminalSoundState());
  const [activeViewMode, setActiveViewMode] = useState<'STREAM' | 'MATRIX'>('STREAM');

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const quickTickers = ['BTC', 'SOL', 'NVDA', 'TSLA', 'MSTR', 'COIN', 'ETH', 'AAPL'];

  // Sync initialTicker if passed externally (e.g. from Pulse Radar)
  useEffect(() => {
    if (initialTicker && initialTicker !== ticker && !incomingPulseContext) {
      setTicker(initialTicker.toUpperCase());
    }
  }, [initialTicker, ticker, incomingPulseContext]);

  // When incomingPulseContext arrives from Pulse Radar, auto-convene council with that instruction
  useEffect(() => {
    if (incomingPulseContext && incomingPulseContext.ticker) {
      const sym = incomingPulseContext.ticker.toUpperCase();
      setTicker(sym);
      setActivePulseContext(incomingPulseContext);
      startCouncilDeliberation(sym, incomingPulseContext);

      // Smoothly scroll down to the Council conversation messages container
      setTimeout(() => {
        const councilElem = document.getElementById('council-messages-stream') || document.getElementById('council-debate-panel');
        if (councilElem) {
          councilElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    }
  }, [incomingPulseContext]);

  // Clean up streaming timer on unmount
  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) {
        clearTimeout(streamingTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll chat container as new turns appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleTurnsCount, isTypingNextTurn]);

  const handleToggleSound = () => {
    const nextState = toggleTerminalSound();
    setSoundActive(nextState);
  };

  /**
   * Convenes the Tri-Persona Council and streams their turn-by-turn conversation in strict sequence.
   */
  const startCouncilDeliberation = async (targetTicker?: string, pulseOverride?: PulseContext) => {
    const symbol = (targetTicker || ticker).trim().toUpperCase() || 'BTC';
    setTicker(symbol);

    const pulseToUse = pulseOverride !== undefined ? pulseOverride : activePulseContext;

    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
    }

    setIsDebating(true);
    setVisibleTurnsCount(0);
    setVerdict(null);
    setHandoffSuccess(false);

    // Fetch live asset price
    let currentPrice = 0;
    try {
      const snap = await fetchPriceSnapshot(symbol);
      if (snap && Number.isFinite(snap.price) && snap.price > 0) {
        currentPrice = snap.price;
      }
    } catch {
      currentPrice = getSeededPrice(symbol);
    }

    // Generate the turn-by-turn conversation & optimal consensus incorporating Pulse context
    const generatedVerdict = generateCouncilDebate(symbol, currentPrice, forceOverAllocation, pulseToUse || undefined);
    setVerdict(generatedVerdict);

    // If Instant mode selected, display entire conversation & outcome immediately
    if (streamSpeed === 'INSTANT') {
      setVisibleTurnsCount(generatedVerdict.turns.length);
      setIsDebating(false);
      setIsTypingNextTurn(false);
      if (forceOverAllocation) {
        playRiskVetoTone();
      } else {
        playTradeApprovedChime();
      }
      return;
    }

    // Otherwise, stream turns in sequential order
    const stepDelay = streamSpeed === 'FAST' ? 450 : 1200;
    const typingDuration = streamSpeed === 'FAST' ? 250 : 650;

    let currentTurnIndex = 0;

    const streamNextTurn = () => {
      if (currentTurnIndex < generatedVerdict.turns.length) {
        const nextSpeaker = generatedVerdict.turns[currentTurnIndex].speakerId;
        setTypingSpeaker(nextSpeaker);
        setIsTypingNextTurn(true);

        streamingTimerRef.current = setTimeout(() => {
          setIsTypingNextTurn(false);
          currentTurnIndex++;
          setVisibleTurnsCount(currentTurnIndex);
          playCyberClick();

          if (currentTurnIndex < generatedVerdict.turns.length) {
            streamingTimerRef.current = setTimeout(streamNextTurn, stepDelay);
          } else {
            // Debate complete, consensus ratified
            setIsDebating(false);
            if (forceOverAllocation) {
              playRiskVetoTone();
            } else {
              playTradeApprovedChime();
            }
          }
        }, typingDuration);
      }
    };

    streamNextTurn();
  };

  /**
   * Dispatches the ratified consensus proposal directly to the Autopilot execution loop.
   */
  const handleDispatchToAutopilot = () => {
    if (!verdict) return;
    onSendToAutopilot({
      asset: verdict.ticker,
      action: verdict.action,
      size_pct: verdict.optimalSizePct,
      confidence: verdict.winRatePct,
      reasoning: verdict.synthesizedReasoning,
    });
    playTradeApprovedChime();
    setHandoffSuccess(true);
    setTimeout(() => setHandoffSuccess(false), 5000);
  };

  const getPersonaIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'flame':
        return <Flame className={className} />;
      case 'shield':
        return <Shield className={className} />;
      case 'globe':
      default:
        return <Globe2 className={className} />;
    }
  };

  const getStanceBadgeClass = (stanceType: string) => {
    switch (stanceType) {
      case 'BULLISH':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40';
      case 'SKEPTIC':
        return 'bg-amber-950/60 text-amber-400 border-amber-500/40';
      case 'VETO':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse';
      case 'RECALIBRATE':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';
      case 'APPROVED':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-400/40';
      case 'CONSENSUS':
        return 'bg-purple-900/70 text-purple-300 border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
      default:
        return 'bg-blue-950/60 text-blue-300 border-blue-500/40';
    }
  };

  const isDebateComplete = verdict && visibleTurnsCount >= verdict.turns.length;

  return (
    <div id="council-debate-panel" className="bg-[var(--lunaris-panel-bg)] border border-[var(--lunaris-panel-border)] rounded-lg p-4 font-mono shadow-2xl relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--lunaris-accent-purple)] shadow-[0_0_10px_#a855f7]" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-white">LUNARIS COUNCIL</h2>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                Tier 1 Multi-Agent
              </span>
              <span className="text-[10px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded bg-emerald-950/40">
                Tri-Persona Quorum
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Autonomous Turn-by-Turn Deliberation & Optimal Win-Rate/Risk Consensus
            </p>
          </div>
        </div>

        {/* Action Bar / Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded p-0.5 text-[10px]">
            <button
              onClick={() => setStreamSpeed('NORMAL')}
              className={`px-2 py-0.5 rounded transition-all ${
                streamSpeed === 'NORMAL' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Stream turns at realistic human deliberation pace (1.2s)"
            >
              1.2s Stream
            </button>
            <button
              onClick={() => setStreamSpeed('FAST')}
              className={`px-2 py-0.5 rounded transition-all ${
                streamSpeed === 'FAST' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Fast conversation pace (0.4s)"
            >
              0.4s Fast
            </button>
            <button
              onClick={() => setStreamSpeed('INSTANT')}
              className={`px-2 py-0.5 rounded transition-all ${
                streamSpeed === 'INSTANT' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Compute consensus immediately without conversation delay"
            >
              Instant
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundActive ? 'Cyber Audio Enabled' : 'Cyber Audio Muted'}
            className={`p-1.5 rounded border transition-all ${
              soundActive
                ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                : 'bg-black/40 border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Force Veto Check for testing circuit breaker dynamics */}
          <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer select-none bg-black/40 px-2 py-1 rounded border border-white/10 hover:border-white/20">
            <input
              type="checkbox"
              checked={forceOverAllocation}
              onChange={(e) => setForceOverAllocation(e.target.checked)}
              className="accent-purple-500 w-3 h-3 rounded"
            />
            <span className={forceOverAllocation ? 'text-amber-400 font-bold' : ''}>
              Test Veto (32%)
            </span>
          </label>
        </div>
      </div>

      {/* Pulse Radar Catalyst Instruction Banner (if convened from Pulse) */}
      {activePulseContext && activePulseContext.catalystSummary && (
        <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-purple-950/70 border border-blue-500/40 rounded-lg p-3 mb-3 text-xs shadow-[0_0_20px_rgba(59,130,246,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-blue-500/20 border border-blue-400/40 text-blue-400 mt-0.5">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                  Sourced from Lunaris Pulse Radar // {ticker}
                </span>
                <span className="text-[10px] bg-blue-500/25 text-blue-300 font-extrabold px-2 py-0.5 rounded border border-blue-400/40">
                  {activePulseContext.sentimentLabel || 'BULLISH'} · +{activePulseContext.velocity1h || 240}% Velocity
                </span>
                {activePulseContext.mentionsPerHour && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    {activePulseContext.mentionsPerHour.toLocaleString()} mentions/hr
                  </span>
                )}
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed italic">
                "{activePulseContext.catalystSummary}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => {
                setActivePulseContext(null);
                if (onClearPulseContext) onClearPulseContext();
              }}
              className="text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
            >
              Clear Pulse
            </button>
            <button
              onClick={() => startCouncilDeliberation(ticker, activePulseContext)}
              disabled={isDebating}
              className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1 rounded transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.3)] disabled:opacity-40"
            >
              <Sparkles className="w-3 h-3" /> Re-Convene on Pulse
            </button>
          </div>
        </div>
      )}

      {/* Input Selector & Quick Tickers */}
      <div className="space-y-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && !isDebating && startCouncilDeliberation()}
              className="w-full bg-black/70 border border-white/20 rounded px-3 py-1.5 text-xs text-white uppercase focus:border-[var(--lunaris-accent-purple)] focus:ring-1 focus:ring-[var(--lunaris-accent-purple)] outline-none"
              placeholder="ENTER TICKER (e.g. BTC, NVDA, SOL)"
            />
          </div>

          <button
            onClick={() => startCouncilDeliberation()}
            disabled={isDebating || !ticker.trim()}
            className="bg-[var(--lunaris-accent-purple)] hover:opacity-90 text-black font-bold px-4 py-1.5 rounded text-xs transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)] disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>{isDebating ? 'CONVENING COUNCIL...' : 'CONVENE COUNCIL'}</span>
          </button>

          {isDebateComplete && (
            <button
              onClick={() => startCouncilDeliberation()}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-3 py-1.5 rounded text-xs transition-all flex items-center gap-1"
              title="Replay debate with new random market conditions"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REPLAY</span>
            </button>
          )}
        </div>

        {/* Quick Ticker Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-gray-500 text-[10px] uppercase">Quick Select:</span>
          {quickTickers.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTicker(t);
                startCouncilDeliberation(t);
              }}
              disabled={isDebating}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                ticker === t
                  ? 'bg-[var(--lunaris-accent-purple)] text-black font-bold'
                  : 'bg-black/50 border border-white/10 text-gray-300 hover:border-white/30'
              } disabled:opacity-50`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* The Three Personas Roster Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {Object.values(COUNCIL_PERSONAS).map((persona) => {
          const isCurrentSpeaker =
            isDebating &&
            ((isTypingNextTurn && typingSpeaker === persona.id) ||
              (verdict &&
                visibleTurnsCount > 0 &&
                visibleTurnsCount <= verdict.turns.length &&
                verdict.turns[visibleTurnsCount - 1]?.speakerId === persona.id));

          return (
            <div
              key={persona.id}
              className={`p-2.5 rounded border transition-all flex items-center gap-2.5 ${
                isCurrentSpeaker
                  ? `${persona.borderColor} ${persona.badgeBg} ring-1 ring-white/20 shadow-md`
                  : 'bg-black/40 border-white/10 opacity-85'
              }`}
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border shrink-0 ${persona.avatarBg} ${
                  isCurrentSpeaker ? 'animate-pulse scale-105' : ''
                }`}
              >
                {getPersonaIcon(persona.avatarIcon, 'w-3.5 h-3.5')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold truncate ${persona.color}`}>
                    {persona.name}
                  </span>
                  {isCurrentSpeaker && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 text-white font-semibold animate-pulse">
                      SPEAKING
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-gray-400 truncate">{persona.role}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Turn Progress Bar */}
      {verdict && (isDebating || visibleTurnsCount > 0) && (
        <div className="mb-3 bg-black/60 border border-white/10 p-2 rounded flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Deliberation Turn:</span>
            <div className="flex items-center gap-1">
              {verdict.turns.map((t, idx) => (
                <div
                  key={t.turnIndex}
                  className={`w-4 h-1.5 rounded-full transition-all ${
                    idx < visibleTurnsCount
                      ? 'bg-purple-500 shadow-[0_0_6px_#a855f7]'
                      : idx === visibleTurnsCount && isTypingNextTurn
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-white/15'
                  }`}
                  title={`Turn ${idx + 1}: ${COUNCIL_PERSONAS[t.speakerId].name}`}
                />
              ))}
            </div>
            <span className="font-bold text-white ml-1">
              {visibleTurnsCount}/{verdict.turns.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isDebateComplete ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                <CheckCheck className="w-3 h-3" />
                CONVERGENCE ACHIEVED (100%)
              </span>
            ) : (
              <span className="text-purple-300 font-semibold flex items-center gap-1 text-[10px] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                ACTIVE CONVERSATION IN ORDER
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sequential Conversation Stream */}
      {verdict && visibleTurnsCount > 0 && (
        <div
          id="council-messages-stream"
          ref={chatContainerRef}
          className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 mb-4 scroll-smooth"
        >
          {verdict.turns.slice(0, visibleTurnsCount).map((turn) => {
            const persona = COUNCIL_PERSONAS[turn.speakerId];
            return (
              <div
                key={turn.turnIndex}
                className="animate-fadeIn p-3 rounded-lg bg-black/60 border border-white/10 hover:border-white/20 transition-all space-y-2 relative"
              >
                {/* Speaker Header & Stance */}
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-white/5 pb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border text-xs ${persona.avatarBg}`}
                    >
                      {getPersonaIcon(persona.avatarIcon, 'w-3 h-3')}
                    </div>
                    <span className={`text-xs font-bold ${persona.color}`}>{persona.name}</span>
                    <span className="text-[10px] text-gray-500">Turn {turn.turnIndex}/{turn.totalTurns}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getStanceBadgeClass(
                        turn.stanceType
                      )}`}
                    >
                      {turn.stanceLabel}
                    </span>
                    <span className="text-[9px] text-gray-500">{turn.timestamp}</span>
                  </div>
                </div>

                {/* Turn Dialogue */}
                <p className="text-xs text-gray-200 leading-relaxed font-sans font-normal pl-7">
                  "{turn.speech}"
                </p>

                {/* Tactical Parameters Strip */}
                <div className="flex flex-wrap items-center gap-2 pl-7 pt-1 text-[10px]">
                  {turn.proposedSizePct !== undefined && (
                    <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-300">
                      Sizing: <strong className="text-white">{turn.proposedSizePct}%</strong>
                    </span>
                  )}
                  {turn.stopLossPct !== undefined && (
                    <span className="bg-rose-950/40 border border-rose-500/30 px-1.5 py-0.5 rounded text-rose-300">
                      Stop-Loss: <strong>-{turn.stopLossPct}%</strong>
                    </span>
                  )}
                  {turn.takeProfitPct !== undefined && (
                    <span className="bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300">
                      Target: <strong>+{turn.takeProfitPct}%</strong>
                    </span>
                  )}
                  {turn.winRatePct !== undefined && (
                    <span className="bg-purple-950/40 border border-purple-500/30 px-1.5 py-0.5 rounded text-purple-300">
                      Modeled Win Rate: <strong>{turn.winRatePct}%</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing / Deliberating Indicator */}
          {isTypingNextTurn && (
            <div className="p-3 rounded-lg bg-black/40 border border-purple-500/20 flex items-center gap-2.5 text-xs text-purple-300 animate-pulse">
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border ${COUNCIL_PERSONAS[typingSpeaker].avatarBg}`}
              >
                {getPersonaIcon(COUNCIL_PERSONAS[typingSpeaker].avatarIcon, 'w-3 h-3')}
              </div>
              <span>
                <strong className={COUNCIL_PERSONAS[typingSpeaker].color}>
                  {COUNCIL_PERSONAS[typingSpeaker].name}
                </strong>{' '}
                is formulating response in sequence...
              </span>
              <span className="flex gap-1 ml-auto">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
              </span>
            </div>
          )}
        </div>
      )}

      {/* FINAL RATIFIED CONSENSUS VERDICT */}
      {isDebateComplete && verdict && (
        <div className="bg-gradient-to-b from-purple-950/30 to-black/70 border-2 border-purple-500/50 rounded-lg p-4 space-y-4 shadow-xl animate-fadeIn">
          {/* Verdict Banner Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/30 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wider flex items-center gap-1.5">
                  CONSENSUS OUTCOME RATIFIED:{' '}
                  <span className="text-emerald-400">{verdict.action} {verdict.ticker}</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  Unanimous 3/3 Agent Agreement • Ratified at {verdict.timestamp}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% Alignment
              </span>
            </div>
          </div>

          {/* Key Quantitative Metrics Grid (Win Rate, Risk, Sizing, Targets) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* 1. Win Rate */}
            <div className="p-2 bg-black/60 rounded border border-purple-500/20 text-center">
              <div className="text-[10px] text-purple-300 uppercase flex items-center justify-center gap-1">
                <Percent className="w-3 h-3" /> Win Rate
              </div>
              <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                {verdict.winRatePct}%
              </div>
              <div className="text-[9px] text-gray-400">Monte Carlo 500x</div>
            </div>

            {/* 2. Risk / Reward */}
            <div className="p-2 bg-black/60 rounded border border-purple-500/20 text-center">
              <div className="text-[10px] text-purple-300 uppercase flex items-center justify-center gap-1">
                <Scale className="w-3 h-3" /> Risk/Reward
              </div>
              <div className="text-base font-extrabold text-white mt-0.5">
                {verdict.riskRewardRatio} : 1
              </div>
              <div className="text-[9px] text-gray-400">Asymmetric Alpha</div>
            </div>

            {/* 3. Optimal Sizing */}
            <div className="p-2 bg-black/60 rounded border border-purple-500/20 text-center">
              <div className="text-[10px] text-purple-300 uppercase flex items-center justify-center gap-1">
                <Target className="w-3 h-3" /> Agreed Size
              </div>
              <div className="text-base font-extrabold text-amber-300 mt-0.5">
                {verdict.optimalSizePct}%
              </div>
              <div className="text-[9px] text-gray-400">Safe NAV Bound</div>
            </div>

            {/* 4. Profit Target */}
            <div className="p-2 bg-black/60 rounded border border-purple-500/20 text-center">
              <div className="text-[10px] text-purple-300 uppercase flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Target Gain
              </div>
              <div className="text-base font-extrabold text-emerald-400 mt-0.5">
                +{verdict.takeProfitPct}%
              </div>
              <div className="text-[9px] text-gray-400">${verdict.targetPrice.toLocaleString()}</div>
            </div>

            {/* 5. Hard Stop-Loss */}
            <div className="p-2 bg-black/60 rounded border border-purple-500/20 text-center">
              <div className="text-[10px] text-purple-300 uppercase flex items-center justify-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> Stop-Loss
              </div>
              <div className="text-base font-extrabold text-rose-400 mt-0.5">
                -{verdict.stopLossPct}%
              </div>
              <div className="text-[9px] text-gray-400">${verdict.stopLossPrice.toLocaleString()}</div>
            </div>

            {/* 6. Portfolio VaR */}
            <div className="p-2 bg-black/60 rounded border border-purple-500/20 text-center">
              <div className="text-[10px] text-purple-300 uppercase flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Max VaR
              </div>
              <div className="text-base font-extrabold text-cyan-300 mt-0.5">
                -{verdict.maxDrawdownVaR}%
              </div>
              <div className="text-[9px] text-gray-400">NAV Tail Risk</div>
            </div>
          </div>

          {/* Tri-Persona Final Ratification Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded bg-amber-950/20 border border-amber-500/30 text-amber-300">
              <div className="font-bold flex items-center gap-1 text-[10px] text-amber-400">
                <Flame className="w-3 h-3" /> Quant-Omega Ratification
              </div>
              <p className="text-gray-300 text-[10px] mt-0.5">
                Alpha momentum verified (+{verdict.takeProfitPct}% target). Accepted {verdict.optimalSizePct}% sizing.
              </p>
            </div>

            <div className="p-2 rounded bg-cyan-950/20 border border-cyan-500/30 text-cyan-300">
              <div className="font-bold flex items-center gap-1 text-[10px] text-cyan-400">
                <Shield className="w-3 h-3" /> Guardian-01 Ratification
              </div>
              <p className="text-gray-300 text-[10px] mt-0.5">
                Downside risk strictly bounded. Stop-loss armed at -{verdict.stopLossPct}% (${verdict.stopLossPrice}).
              </p>
            </div>

            <div className="p-2 rounded bg-purple-950/20 border border-purple-500/30 text-purple-300">
              <div className="font-bold flex items-center gap-1 text-[10px] text-purple-400">
                <Globe2 className="w-3 h-3" /> Atlas-Macro Ratification
              </div>
              <p className="text-gray-300 text-[10px] mt-0.5">
                Institutional liquidity & {verdict.riskRewardRatio}:1 asymmetric profile verified across markets.
              </p>
            </div>
          </div>

          {/* Synthesized Council Reasoning */}
          <div className="p-2.5 bg-black/70 rounded border border-white/10 text-xs">
            <div className="text-[10px] text-purple-300 uppercase font-semibold mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Synthesized Council Strategy Document
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">{verdict.synthesizedReasoning}</p>
          </div>

          {/* Dispatch to Autopilot Session */}
          <button
            onClick={handleDispatchToAutopilot}
            className={`w-full py-2.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              handoffSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500/20 border border-emerald-500 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400'
            }`}
          >
            {handoffSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> RATIFIED TRADE SIGNAL DISPATCHED TO AUTOPILOT ENGINE!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> DISPATCH RATIFIED CONSENSUS TO AUTOPILOT
              </>
            )}
          </button>
        </div>
      )}

      {/* Initial prompt helper when no debate has run yet */}
      {!verdict && !isDebating && (
        <div className="text-center py-8 px-4 bg-black/30 rounded border border-dashed border-white/10 text-xs text-gray-400">
          <p className="text-white font-medium mb-1">
            Tri-Persona Multi-Agent Deliberation Ready
          </p>
          <p className="text-gray-400 max-w-md mx-auto">
            Select or enter an asset ticker and click{' '}
            <span className="text-purple-300 font-bold">CONVENE COUNCIL</span>. Watch{' '}
            <span className="text-amber-400 font-semibold">Quant-Omega</span>,{' '}
            <span className="text-cyan-400 font-semibold">Guardian-01</span>, and{' '}
            <span className="text-purple-400 font-semibold">Atlas-Macro</span> converse in sequence to agree on the optimal win rate, risk parameters, and sizing.
          </p>
          <p className="text-[10px] text-gray-500 mt-2">
            Ratified consensus trades can be piped directly into the live Autopilot trading engine.
          </p>
        </div>
      )}
    </div>
  );
}
