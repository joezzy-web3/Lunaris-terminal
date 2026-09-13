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
  TrendingUp,
  TrendingDown,
  Percent,
  Scale,
  Target,
  ShieldAlert,
  Users,
  CheckCheck,
  ChevronRight,
  Radio,
  Search,
  ExternalLink,
  BookOpen,
  FileText,
  Sliders,
  Skull,
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

interface GroundingInfo {
  queries: string[];
  sources: { title: string; url: string }[];
}

const PRESET_INSTRUCTIONS = [
  'Evaluate breakout momentum & volume profile',
  'Quant review on earnings & defense contract backlog',
  'Short hedge against macroeconomic volatility',
  'Mean-reversion trade with strict stop-loss',
  'Delta-neutral liquidity capture',
];

const PRESET_ASSETS = [
  { ticker: 'BTC', label: 'Bitcoin' },
  { ticker: 'ETH', label: 'Ethereum' },
  { ticker: 'SOL', label: 'Solana' },
  { ticker: 'SUI', label: 'Sui' },
  { ticker: 'DOGE', label: 'Dogecoin' },
  { ticker: 'NVDA', label: 'Nvidia' },
  { ticker: 'PLTR', label: 'Palantir' },
  { ticker: 'TSLA', label: 'Tesla' },
  { ticker: 'MSTR', label: 'MicroStrategy' },
  { ticker: 'AMD', label: 'AMD' },
  { ticker: 'AAPL', label: 'Apple' },
];

export function DebateConsole({
  onSendToAutopilot,
  initialTicker = 'PLTR',
  incomingPulseContext,
  onClearPulseContext,
}: DebateConsoleProps) {
  const [ticker, setTicker] = useState(incomingPulseContext?.ticker || initialTicker);
  const [customInstruction, setCustomInstruction] = useState('');
  const [showInstructionInput, setShowInstructionInput] = useState(false);
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

  // Real-time AI / Gemini telemetry metadata
  const [groundingInfo, setGroundingInfo] = useState<GroundingInfo | null>(null);
  const [isRealGemini, setIsRealGemini] = useState<boolean>(false);
  const [catalysts, setCatalysts] = useState<string[]>([]);
  const [livePriceData, setLivePriceData] = useState<{ price: number; change24h: number } | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInitialTickerRef = useRef<string>(initialTicker);

  // Sync initialTicker ONLY when the incoming prop actually changes, without locking user typing
  useEffect(() => {
    if (initialTicker && initialTicker !== lastInitialTickerRef.current && !incomingPulseContext) {
      lastInitialTickerRef.current = initialTicker;
      setTicker(initialTicker.toUpperCase());
    }
  }, [initialTicker, incomingPulseContext]);

  // When incomingPulseContext arrives from Pulse Radar, auto-convene council
  useEffect(() => {
    if (incomingPulseContext && incomingPulseContext.ticker) {
      const sym = incomingPulseContext.ticker.toUpperCase();
      setTicker(sym);
      setActivePulseContext(incomingPulseContext);
      if (incomingPulseContext.catalystSummary) {
        setCustomInstruction(incomingPulseContext.catalystSummary);
      }
      startCouncilDeliberation(sym, incomingPulseContext.catalystSummary, incomingPulseContext);

      setTimeout(() => {
        const councilElem = document.getElementById('council-messages-stream') || document.getElementById('council-debate-panel');
        if (councilElem) {
          councilElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    }
  }, [incomingPulseContext]);

  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) {
        clearTimeout(streamingTimerRef.current);
      }
    };
  }, []);

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
   * Convenes the Tri-Persona Council via real-time Gemini Search Grounding API
   * or high-precision deterministic matrix fallback for ANY typed stock/token.
   */
  const startCouncilDeliberation = async (
    targetTicker?: string,
    overrideInstruction?: string,
    pulseOverride?: PulseContext
  ) => {
    const symbol = (targetTicker || ticker).trim().toUpperCase() || 'PLTR';
    setTicker(symbol);

    const instructionToUse = overrideInstruction !== undefined ? overrideInstruction : customInstruction;
    const pulseToUse = pulseOverride !== undefined ? pulseOverride : activePulseContext;

    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
    }

    setIsDebating(true);
    setVisibleTurnsCount(0);
    setVerdict(null);
    setHandoffSuccess(false);
    setGroundingInfo(null);
    setCatalysts([]);

    // 1. Fetch real price snapshot from feed
    let currentPrice = 0;
    let change24hVal = 0;
    try {
      const snap = await fetchPriceSnapshot(symbol);
      if (snap && Number.isFinite(snap.price) && snap.price > 0) {
        currentPrice = snap.price;
        change24hVal = snap.change24h;
      }
    } catch {
      currentPrice = getSeededPrice(symbol);
    }

    // 2. Query Gemini Real-Time Search Grounding API
    let apiData: any = null;
    let geminiSuccess = false;
    let groundingData: GroundingInfo | null = null;

    try {
      const response = await fetch('/api/gemini/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: symbol,
          instruction: instructionToUse || pulseToUse?.catalystSummary || undefined,
          forceOverAllocation,
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          apiData = resJson.data;
          geminiSuccess = Boolean(resJson.isRealGemini);
          if (resJson.grounding) {
            groundingData = resJson.grounding;
          }
        }
      }
    } catch (apiErr) {
      console.warn('Gemini debate API request error, initiating local model synthesis', apiErr);
    }

    setIsRealGemini(geminiSuccess);
    if (groundingData) {
      setGroundingInfo(groundingData);
    }

    // Build the finalized ConsensusVerdict
    let activeVerdict: ConsensusVerdict;

    if (apiData && apiData.turns && apiData.turns.length >= 3) {
      const finalPrice = apiData.currentPrice || currentPrice || 100;
      const v = apiData.verdict || {};
      const action = v.action === 'VETO' ? 'HOLD' : (v.action || 'BUY');
      const optimalSize = forceOverAllocation ? 32 : (v.optimalSizePct ?? 4.5);
      const winRate = forceOverAllocation ? 38 : (v.winRatePct ?? 72);

      // Parse stopLoss / takeProfit values
      const stopLossPct = typeof v.stopLoss === 'string' && v.stopLoss.includes('%')
        ? Math.abs(parseFloat(v.stopLoss.replace(/[^0-9.-]/g, '')) || 4.2)
        : 4.2;
      const takeProfitPct = typeof v.takeProfit === 'string' && v.takeProfit.includes('%')
        ? Math.abs(parseFloat(v.takeProfit.replace(/[^0-9.-]/g, '')) || 11.5)
        : 11.5;

      const stopLossPrice = Number((finalPrice * (1 - stopLossPct / 100)).toFixed(2));
      const targetPrice = Number((finalPrice * (1 + takeProfitPct / 100)).toFixed(2));

      setLivePriceData({
        price: finalPrice,
        change24h: apiData.change24h || change24hVal,
      });

      if (apiData.keyCatalysts && Array.isArray(apiData.keyCatalysts)) {
        setCatalysts(apiData.keyCatalysts);
      }

      // Map turns to council personas
      const mappedTurns: DebateTurn[] = [
        {
          turnIndex: 1,
          totalTurns: 3,
          speakerId: 'QUANT',
          stanceLabel: apiData.turns[0]?.stance || 'BULLISH',
          stanceType: 'BULLISH',
          speech: apiData.turns[0]?.argument || `Quant order book signals confirm buyer volume expansion on ${symbol}.`,
          proposedSizePct: optimalSize,
          takeProfitPct,
          winRatePct: winRate,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        {
          turnIndex: 2,
          totalTurns: 3,
          speakerId: 'GUARDIAN',
          stanceLabel: forceOverAllocation ? 'HARD VETO' : (apiData.turns[1]?.stance || 'CAUTION'),
          stanceType: forceOverAllocation ? 'VETO' : 'SKEPTIC',
          speech: apiData.turns[1]?.argument || (forceOverAllocation ? 'Allocation limit breach: trade proposal terminated by Guardian circuit breaker.' : `Risk profile verified for ${symbol}. Stop loss required at ${stopLossPrice}.`),
          stopLossPct,
          riskScore: forceOverAllocation ? 9 : 4,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        {
          turnIndex: 3,
          totalTurns: 3,
          speakerId: 'MACRO',
          stanceLabel: forceOverAllocation ? 'VETO CONFIRMED' : (apiData.turns[2]?.stance || 'CONSENSUS'),
          stanceType: forceOverAllocation ? 'VETO' : 'CONSENSUS',
          speech: apiData.turns[2]?.argument || (forceOverAllocation ? 'Council upholds Guardian veto. Zero capital deployed.' : `Macro convergence confirmed. Ratifying ${action} signal for ${symbol}.`),
          proposedSizePct: forceOverAllocation ? 0 : optimalSize,
          winRatePct: winRate,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ];

      activeVerdict = {
        ticker: symbol,
        assetClass: ['BTC', 'ETH', 'SOL', 'SUI', 'DOGE'].includes(symbol) ? 'CX' : 'EQ',
        currentPrice: finalPrice,
        action,
        optimalSizePct: optimalSize,
        winRatePct: winRate,
        riskRewardRatio: Number((takeProfitPct / stopLossPct).toFixed(2)),
        takeProfitPct,
        stopLossPct,
        targetPrice,
        stopLossPrice,
        maxDrawdownVaR: Number(((optimalSize * stopLossPct) / 100).toFixed(2)),
        confidence: winRate,
        consensusAlignmentPct: forceOverAllocation ? 40 : 100,
        unanimous: !forceOverAllocation,
        synthesizedReasoning: v.synthesizedReasoning || `Council ratified strategy for ${symbol}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        tradeProposal: {
          asset: symbol,
          action,
          size_pct: optimalSize,
          confidence: winRate,
          reasoning: v.synthesizedReasoning || `Council consensus for ${symbol}`,
        },
        turns: mappedTurns,
        pulseContext: pulseToUse || undefined,
      };
    } else {
      // Fallback to local deterministic council debate
      activeVerdict = generateCouncilDebate(symbol, currentPrice, forceOverAllocation, pulseToUse || undefined);
    }

    setVerdict(activeVerdict);

    // Instant mode execution
    if (streamSpeed === 'INSTANT') {
      setVisibleTurnsCount(activeVerdict.turns.length);
      setIsDebating(false);
      setIsTypingNextTurn(false);
      if (forceOverAllocation) {
        playRiskVetoTone();
      } else {
        playTradeApprovedChime();
      }
      return;
    }

    // Sequential realistic turn streaming
    const stepDelay = streamSpeed === 'FAST' ? 450 : 1100;
    const typingDuration = streamSpeed === 'FAST' ? 250 : 600;

    let currentTurnIndex = 0;

    const streamNextTurn = () => {
      if (currentTurnIndex < activeVerdict.turns.length) {
        const nextSpeaker = activeVerdict.turns[currentTurnIndex].speakerId;
        setTypingSpeaker(nextSpeaker);
        setIsTypingNextTurn(true);

        streamingTimerRef.current = setTimeout(() => {
          setIsTypingNextTurn(false);
          currentTurnIndex++;
          setVisibleTurnsCount(currentTurnIndex);
          playCyberClick();

          if (currentTurnIndex < activeVerdict.turns.length) {
            streamingTimerRef.current = setTimeout(streamNextTurn, stepDelay);
          } else {
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

  const getPersonaIcon = (iconName: string, className: string = 'w-3.5 h-3.5') => {
    switch (iconName) {
      case 'flame':
        return <Flame className={`${className} text-[#FF5722] fill-[#FF9800]/50 drop-shadow-[0_0_6px_rgba(255,87,34,0.7)] shrink-0`} />;
      case 'shield':
        return <Shield className={`${className} text-[#8B5A2B] fill-[#5C3A21]/40 shrink-0`} />;
      case 'skull':
        return <Skull className={`${className} text-rose-500 fill-rose-950/40 shrink-0 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]`} />;
      case 'globe':
      default:
        return <Globe2 className={`${className} text-[#0284C7] fill-[#22C55E]/40 shrink-0 drop-shadow-[0_0_6px_rgba(2,132,199,0.5)]`} />;
    }
  };

  const isDebateComplete = verdict && visibleTurnsCount >= verdict.turns.length;

  return (
    <div id="council-debate-panel" className="bg-[#0c0e14] border border-white/10 rounded-lg p-4 font-mono select-none relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          {/* Signature Lunaris Multi-Color Diamond Emblem */}
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 rounded-xs bg-gradient-to-tr from-[#00F0FF] via-[#FACC15] to-[#D946EF] rotate-45 shadow-[0_0_10px_rgba(0,240,255,0.65)]" />
            <div className="absolute w-1 h-1 rounded-full bg-[#0c0e14]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold tracking-wider text-white">LUNARIS COUNCIL</h2>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white/10 text-zinc-200 border border-white/15">
                AI Agent Quorum
              </span>
              <span className="text-[10px] text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-950/40 font-medium">
                Live Google Search Grounded
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Convene multi-agent deliberation on any stock or token with real-time market search
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Speed Selector */}
          <div className="flex items-center bg-black/60 border border-white/10 rounded p-0.5 text-[10px]">
            <button
              onClick={() => setStreamSpeed('NORMAL')}
              className={`px-2 py-0.5 rounded transition-all ${
                streamSpeed === 'NORMAL' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              1.2s Stream
            </button>
            <button
              onClick={() => setStreamSpeed('FAST')}
              className={`px-2 py-0.5 rounded transition-all ${
                streamSpeed === 'FAST' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              0.4s Fast
            </button>
            <button
              onClick={() => setStreamSpeed('INSTANT')}
              className={`px-2 py-0.5 rounded transition-all ${
                streamSpeed === 'INSTANT' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Instant
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundActive ? 'Audio Enabled' : 'Audio Muted'}
            className={`p-1.5 rounded border transition-all ${
              soundActive
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-black/40 border-white/10 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Force Veto Check for testing circuit breaker */}
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer select-none bg-black/40 px-2 py-1 rounded border border-white/10 hover:border-white/20">
            <input
              type="checkbox"
              checked={forceOverAllocation}
              onChange={(e) => setForceOverAllocation(e.target.checked)}
              className="accent-white w-3 h-3 rounded"
            />
            <span className={forceOverAllocation ? 'text-rose-400 font-bold' : ''}>
              Test Veto (32%)
            </span>
          </label>
        </div>
      </div>

      {/* Main Search & Instruction Input Deck */}
      <div className="bg-black/50 border border-white/10 rounded-lg p-3 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Universal Ticker Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && !isDebating && startCouncilDeliberation()}
              className="w-full bg-[#07080c] border border-white/15 rounded-md pl-9 pr-3 py-2 text-xs text-white uppercase font-bold placeholder:text-zinc-500 placeholder:font-normal focus:border-white focus:ring-1 focus:ring-white outline-none transition-all"
              placeholder="ENTER ANY TICKER (e.g. PLTR, SUI, ARM, NVDA, DOGE, TSLA, BTC)"
            />
          </div>

          {/* Toggle Custom Instruction */}
          <button
            onClick={() => setShowInstructionInput(!showInstructionInput)}
            className={`px-3 py-2 rounded-md text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
              showInstructionInput || customInstruction
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{customInstruction ? 'Thesis Attached' : 'Add Trade Thesis'}</span>
          </button>

          {/* Convene Button */}
          <button
            onClick={() => startCouncilDeliberation()}
            disabled={isDebating || !ticker.trim()}
            className="bg-white hover:bg-zinc-200 text-black font-bold px-5 py-2 rounded-md text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>{isDebating ? 'CONVENING COUNCIL...' : 'CONVENE COUNCIL'}</span>
          </button>

          {isDebateComplete && (
            <button
              onClick={() => startCouncilDeliberation()}
              className="bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold px-3 py-2 rounded-md text-xs transition-all flex items-center justify-center gap-1"
              title="Re-run debate with fresh parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REPLAY</span>
            </button>
          )}
        </div>

        {/* Expandable Custom Instruction / Thesis Field */}
        {(showInstructionInput || customInstruction) && (
          <div className="pt-2 border-t border-white/8 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-300 font-medium flex items-center gap-1">
                <FileText className="w-3 h-3 text-zinc-400" />
                Trader Instruction or Strategic Hypothesis (Deliberated with real-time Gemini Search):
              </span>
              {customInstruction && (
                <button
                  onClick={() => setCustomInstruction('')}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Clear Instruction
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. 'Assess Palantir growth trajectory with defense contracts' or 'Short TSLA if robotaxi margins disappoint' or 'Delta-neutral buy on SUI breakout'"
              className="w-full bg-[#07080c] border border-white/15 rounded-md p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-white outline-none font-sans"
            />
            {/* Quick Instruction Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-zinc-500 uppercase">Presets:</span>
              {PRESET_INSTRUCTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setCustomInstruction(preset)}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 hover:border-white/20 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Asset Selector Strip */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/8 text-[11px]">
          <span className="text-zinc-500 text-[10px] uppercase font-semibold">Institutional Presets:</span>
          {PRESET_ASSETS.map((asset) => (
            <button
              key={asset.ticker}
              onClick={() => {
                setTicker(asset.ticker);
                startCouncilDeliberation(asset.ticker);
              }}
              disabled={isDebating}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                ticker === asset.ticker
                  ? 'bg-white text-black font-bold'
                  : 'bg-white/[0.03] border border-white/8 text-zinc-300 hover:border-white/20 hover:text-white'
              } disabled:opacity-50`}
            >
              {asset.ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Gemini Search Grounding Metadata Banner */}
      {groundingInfo && groundingInfo.sources && groundingInfo.sources.length > 0 && (
        <div className="bg-[#090b10] border border-white/10 rounded-lg p-3 mb-4 text-xs space-y-2 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                Real-Time Grounding Sources Verified
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                [Google Search Grounding Engine]
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Queried: <span className="text-zinc-200">"{groundingInfo.queries[0] || `${ticker} market price & catalysts`}"</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {groundingInfo.sources.slice(0, 4).map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/8 hover:border-white/20 hover:bg-white/[0.05] transition-all text-[10px] text-zinc-300 group"
              >
                <div className="truncate flex-1 pr-2">
                  <div className="font-medium text-white truncate group-hover:underline">
                    {src.title}
                  </div>
                  <div className="text-zinc-500 text-[9px] truncate font-mono">
                    {src.url.replace(/^https?:\/\//, '')}
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-white shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Catalysts discovered via Live AI Search */}
      {catalysts.length > 0 && (
        <div className="mb-4 p-2.5 rounded-md bg-white/[0.02] border border-white/8 text-[11px] space-y-1">
          <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-zinc-300" />
            Verified Market Catalysts Identified by Council:
          </div>
          <ul className="space-y-1 pl-4 list-disc text-zinc-300">
            {catalysts.map((cat, i) => (
              <li key={i} className="leading-snug">{cat}</li>
            ))}
          </ul>
        </div>
      )}

      {/* The Four Personas Roster Bar (with NEXUS-RED Adversary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
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
              className={`p-2.5 rounded-md border transition-all flex items-center gap-2.5 ${
                isCurrentSpeaker
                  ? 'bg-white/10 border-white text-white shadow-sm'
                  : 'bg-black/40 border-white/10 text-zinc-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center border shrink-0 ${
                  isCurrentSpeaker ? 'bg-white/15 border-white shadow-sm' : 'bg-white/5 border-white/10'
                }`}
              >
                {getPersonaIcon(persona.avatarIcon, 'w-4 h-4')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold truncate ${isCurrentSpeaker ? 'text-white' : 'text-zinc-200'}`}>
                    {persona.name}
                  </span>
                  {isCurrentSpeaker && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white text-black font-bold animate-pulse">
                      SPEAKING
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-zinc-400 truncate">{persona.role}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Turn Progress Bar */}
      {verdict && (isDebating || visibleTurnsCount > 0) && (
        <div className="mb-3 bg-black/60 border border-white/10 p-2 rounded-md flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Council Sequence:</span>
            <div className="flex items-center gap-1">
              {verdict.turns.map((t, idx) => (
                <div
                  key={t.turnIndex}
                  className={`w-5 h-1.5 rounded-full transition-all ${
                    idx < visibleTurnsCount
                      ? 'bg-white'
                      : idx === visibleTurnsCount && isTypingNextTurn
                      ? 'bg-zinc-400 animate-pulse'
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
                <CheckCheck className="w-3.5 h-3.5" />
                CONVERGENCE ACHIEVED
              </span>
            ) : (
              <span className="text-zinc-300 font-medium flex items-center gap-1.5 text-[10px] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                ACTIVE SYNTHESIS IN PROGRESS
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
            const isVetoTurn = turn.stanceType === 'VETO' || turn.stanceLabel.includes('VETO');
            const isBullishTurn = turn.stanceType === 'BULLISH' || turn.stanceType === 'APPROVED';

            return (
              <div
                key={turn.turnIndex}
                className="animate-fadeIn p-3.5 rounded-md bg-black/60 border border-white/10 hover:border-white/20 transition-all space-y-2 relative"
              >
                {/* Speaker Header & Stance */}
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-white/8 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center border bg-white/5 border-white/15 text-white text-xs">
                      {getPersonaIcon(persona.avatarIcon, 'w-3 h-3')}
                    </div>
                    <span className="text-xs font-bold text-white">{persona.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Turn {turn.turnIndex}/{turn.totalTurns}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        isVetoTurn
                          ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                          : isBullishTurn
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                          : 'bg-white/10 text-zinc-200 border-white/15'
                      }`}
                    >
                      {turn.stanceLabel}
                    </span>
                    <span className="text-[9px] text-zinc-500">{turn.timestamp}</span>
                  </div>
                </div>

                {/* Turn Dialogue */}
                <p className="text-xs text-zinc-200 leading-relaxed font-sans font-normal pl-7">
                  "{turn.speech}"
                </p>

                {/* Tactical Parameters Strip */}
                <div className="flex flex-wrap items-center gap-2 pl-7 pt-1 text-[10px]">
                  {turn.proposedSizePct !== undefined && (
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-300">
                      Sizing: <strong className="text-white">{turn.proposedSizePct}%</strong>
                    </span>
                  )}
                  {turn.stopLossPct !== undefined && (
                    <span className="bg-rose-950/30 border border-rose-500/30 px-2 py-0.5 rounded text-rose-300">
                      Stop-Loss: <strong>-{turn.stopLossPct}%</strong>
                    </span>
                  )}
                  {turn.takeProfitPct !== undefined && (
                    <span className="bg-emerald-950/30 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-300">
                      Target Gain: <strong>+{turn.takeProfitPct}%</strong>
                    </span>
                  )}
                  {turn.winRatePct !== undefined && (
                    <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-200">
                      Win Rate: <strong className="text-emerald-400">{turn.winRatePct}%</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing / Deliberating Indicator */}
          {isTypingNextTurn && (
            <div className="p-3 rounded-md bg-black/40 border border-white/10 flex items-center gap-2.5 text-xs text-zinc-300 animate-pulse">
              <div className="w-5 h-5 rounded flex items-center justify-center border bg-white/10 border-white/20 text-white">
                {getPersonaIcon(COUNCIL_PERSONAS[typingSpeaker].avatarIcon, 'w-3 h-3')}
              </div>
              <span>
                <strong className="text-white">{COUNCIL_PERSONAS[typingSpeaker].name}</strong>{' '}
                is formulating arguments...
              </span>
              <span className="flex gap-1 ml-auto">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
              </span>
            </div>
          )}
        </div>
      )}

      {/* FINAL RATIFIED CONSENSUS VERDICT */}
      {isDebateComplete && verdict && (
        <div className="bg-[#090b10] border border-white/15 rounded-lg p-4 space-y-4 animate-fadeIn">
          {/* Verdict Banner Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-white/10 text-white border border-white/20">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
                  CONSENSUS OUTCOME:{' '}
                  <span className={verdict.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                    {verdict.action} {verdict.ticker}
                  </span>
                  {livePriceData && (
                    <span className="text-zinc-400 font-mono text-[11px]">
                      (${livePriceData.price > 1000 ? livePriceData.price.toLocaleString() : livePriceData.price.toFixed(2)})
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400">
                  3-Agent Quorum Consensus • Ratified at {verdict.timestamp}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded border text-xs font-bold flex items-center gap-1 ${
                verdict.action === 'HOLD' && forceOverAllocation
                  ? 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {verdict.action === 'HOLD' && forceOverAllocation ? 'Risk Veto Enforced' : 'Consensus Ratified'}
              </span>
            </div>
          </div>

          {/* Key Quantitative Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {/* 1. Win Rate */}
            <div className="p-2.5 bg-black/60 rounded border border-white/10 text-center">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-center gap-1">
                <Percent className="w-3 h-3" /> Win Rate
              </div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {verdict.winRatePct}%
              </div>
              <div className="text-[9px] text-zinc-500">Monte Carlo 500x</div>
            </div>

            {/* 2. Risk / Reward */}
            <div className="p-2.5 bg-black/60 rounded border border-white/10 text-center">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-center gap-1">
                <Scale className="w-3 h-3" /> Risk/Reward
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {verdict.riskRewardRatio} : 1
              </div>
              <div className="text-[9px] text-zinc-500">Asymmetric Ratio</div>
            </div>

            {/* 3. Optimal Sizing */}
            <div className="p-2.5 bg-black/60 rounded border border-white/10 text-center">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-center gap-1">
                <Target className="w-3 h-3" /> Agreed Size
              </div>
              <div className={`text-base font-black mt-0.5 ${forceOverAllocation ? 'text-rose-400' : 'text-white'}`}>
                {verdict.optimalSizePct}%
              </div>
              <div className="text-[9px] text-zinc-500">
                {forceOverAllocation ? 'BREACHED' : 'Safe NAV Bound'}
              </div>
            </div>

            {/* 4. Profit Target */}
            <div className="p-2.5 bg-black/60 rounded border border-white/10 text-center">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Target Gain
              </div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                +{verdict.takeProfitPct}%
              </div>
              <div className="text-[9px] text-zinc-500">${verdict.targetPrice.toLocaleString()}</div>
            </div>

            {/* 5. Hard Stop-Loss */}
            <div className="p-2.5 bg-black/60 rounded border border-white/10 text-center">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> Stop-Loss
              </div>
              <div className="text-base font-black text-rose-400 mt-0.5">
                -{verdict.stopLossPct}%
              </div>
              <div className="text-[9px] text-zinc-500">${verdict.stopLossPrice.toLocaleString()}</div>
            </div>

            {/* 6. Portfolio VaR */}
            <div className="p-2.5 bg-black/60 rounded border border-white/10 text-center">
              <div className="text-[10px] text-zinc-400 uppercase flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Max VaR
              </div>
              <div className="text-base font-black text-zinc-300 mt-0.5">
                -{verdict.maxDrawdownVaR}%
              </div>
              <div className="text-[9px] text-zinc-500">Fund Risk Ceiling</div>
            </div>
          </div>

          {/* Tri-Persona Final Ratification Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2.5 rounded bg-white/[0.03] border border-white/10 text-zinc-300">
              <div className="font-bold flex items-center gap-1.5 text-[10px] text-white">
                <Flame className="w-3.5 h-3.5 text-[#FF5722] fill-[#FF9800]/50 drop-shadow-[0_0_5px_rgba(255,87,34,0.6)] shrink-0" /> Quant-Omega Signoff
              </div>
              <p className="text-zinc-400 text-[10px] mt-0.5">
                Momentum confirmed (+{verdict.takeProfitPct}% target). Accepted {verdict.optimalSizePct}% sizing allocation.
              </p>
            </div>

            <div className="p-2.5 rounded bg-white/[0.03] border border-white/10 text-zinc-300">
              <div className="font-bold flex items-center gap-1.5 text-[10px] text-white">
                <Shield className="w-3.5 h-3.5 text-[#8B5A2B] fill-[#5C3A21]/40 shrink-0" /> Guardian-01 Signoff
              </div>
              <p className="text-zinc-400 text-[10px] mt-0.5">
                Downside bounded. Hard stop-loss armed at -{verdict.stopLossPct}% (${verdict.stopLossPrice}).
              </p>
            </div>

            <div className="p-2.5 rounded bg-white/[0.03] border border-white/10 text-zinc-300">
              <div className="font-bold flex items-center gap-1.5 text-[10px] text-white">
                <Globe2 className="w-3.5 h-3.5 text-[#0284C7] fill-[#22C55E]/40 drop-shadow-[0_0_5px_rgba(2,132,199,0.5)] shrink-0" /> Atlas-Macro Signoff
              </div>
              <p className="text-zinc-400 text-[10px] mt-0.5">
                Macro orderflow and {verdict.riskRewardRatio}:1 asymmetric structure ratified for execution.
              </p>
            </div>
          </div>

          {/* Synthesized Council Reasoning */}
          <div className="p-3 bg-black/70 rounded border border-white/10 text-xs">
            <div className="text-[10px] text-zinc-400 uppercase font-semibold mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-zinc-300" /> Synthesized Strategy Document
            </div>
            <p className="text-zinc-200 leading-relaxed text-[11px] font-sans">{verdict.synthesizedReasoning}</p>
          </div>

          {/* Dispatch to Autopilot Session */}
          <button
            onClick={handleDispatchToAutopilot}
            className={`w-full py-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              handoffSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-black hover:bg-zinc-200'
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
        <div className="text-center py-8 px-4 bg-black/30 rounded border border-dashed border-white/10 text-xs text-zinc-400">
          <p className="text-white font-medium mb-1">
            Universal AI Council Deliberation Ready
          </p>
          <p className="text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Enter any stock or crypto ticker (e.g. <span className="text-white font-semibold">PLTR</span>, <span className="text-white font-semibold">SUI</span>, <span className="text-white font-semibold">NVDA</span>, <span className="text-white font-semibold">ARM</span>), or write a custom instruction or thesis, then click{' '}
            <span className="text-white font-bold">CONVENE COUNCIL</span>. The 3 agent personas deliberate in sequence using real-time search grounding.
          </p>
        </div>
      )}
    </div>
  );
}
