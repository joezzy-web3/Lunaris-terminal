/**
 * LUNARIS Terminal (Bitget Edition) — Phase 2 Cybernetic Expansion
 * Inspired by Moonberg & Institutional AI Trading Cockpits
 * Built for Bitget AI Hackathon by Joezzy (Joezzy Web3)
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { CommandDeckHero } from '@/components/CommandDeckHero';
import { ThreePillarBento } from '@/components/ThreePillarBento';
import { LiveTickerMarquee } from '@/components/LiveTickerMarquee';

// Code-split heavy views & modals for instant initial page paint (<400KB initial chunk)
const AutonomousLoopPanel = lazy(() => import('@/components/AutonomousLoopPanel').then(m => ({ default: m.AutonomousLoopPanel })));
const DebateConsole = lazy(() => import('@/components/DebateConsole').then(m => ({ default: m.DebateConsole })));
const PulseRadarPanel = lazy(() => import('@/components/PulseRadarPanel').then(m => ({ default: m.PulseRadarPanel })));
const DemoModeController = lazy(() => import('@/components/DemoModeController').then(m => ({ default: m.DemoModeController })));
const HackathonCreditsModal = lazy(() => import('@/components/HackathonCreditsModal').then(m => ({ default: m.HackathonCreditsModal })));
const VisualAlgoBuilder = lazy(() => import('@/components/VisualAlgoBuilder').then(m => ({ default: m.VisualAlgoBuilder })));
const UnifiedDataConstellation = lazy(() => import('@/components/UnifiedDataConstellation').then(m => ({ default: m.UnifiedDataConstellation })));
const CrossAssetMatrix = lazy(() => import('@/components/CrossAssetMatrix').then(m => ({ default: m.CrossAssetMatrix })));
const RealTimeTradingChart = lazy(() => import('@/components/RealTimeTradingChart').then(m => ({ default: m.RealTimeTradingChart })));
const LiquidityDepthHeatmap = lazy(() => import('@/components/LiquidityDepthHeatmap').then(m => ({ default: m.LiquidityDepthHeatmap })));
const DeterministicKillSwitch = lazy(() => import('@/components/DeterministicKillSwitch').then(m => ({ default: m.DeterministicKillSwitch })));
const PaperTradingAuditView = lazy(() => import('@/components/PaperTradingAuditView').then(m => ({ default: m.PaperTradingAuditView })));
const CommandPaletteModal = lazy(() => import('@/components/CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })));
const BitgetApiKeyModal = lazy(() => import('@/components/BitgetApiKeyModal').then(m => ({ default: m.BitgetApiKeyModal })));
const BlackSwanDrillModal = lazy(() => import('@/components/BlackSwanDrillModal').then(m => ({ default: m.BlackSwanDrillModal })));
import { TradeProposal } from '@/lib/riskVeto';
import { clearAssetShocks } from '@/lib/demoSeedData';
import { PulseContext } from '@/lib/councilDebateEngine';
import {
  toggleTerminalSound,
  getTerminalSoundState,
  playCyberClick,
  toggleTradingFloorAmbience,
  getTradingFloorAmbienceState,
} from '@/lib/soundSynth';
import {
  Activity,
  Cpu,
  Radio,
  Scale,
  Award,
  BookOpen,
  Wifi,
  Layers,
  Terminal,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Volume2,
  VolumeX,
  Sparkles,
  Database,
  ArrowRightLeft,
  LayoutDashboard,
  Zap,
  LineChart,
  Bot,
  Compass,
  History,
  Shield,
  Grid,
  ScrollText,
  Key,
  Command,
  Headphones,
  ArrowLeft,
  ChevronLeft,
} from 'lucide-react';

export type TerminalTab = 'DECK' | 'TERMINAL' | 'AUTOPILOT' | 'COUNCIL' | 'PULSE' | 'ALGO' | 'AUDIT';

const TAB_LABELS: Record<TerminalTab, string> = {
  DECK: 'Command Deck',
  TERMINAL: 'Pro Cockpit',
  AUTOPILOT: 'Autopilot',
  COUNCIL: 'Council',
  PULSE: 'Pulse Radar',
  ALGO: 'Algo Builder',
  AUDIT: 'Audit Ledger',
};

const TAB_PATHS: Record<TerminalTab, string> = {
  DECK: '/',
  TERMINAL: '/terminal',
  AUTOPILOT: '/autopilot',
  COUNCIL: '/council',
  PULSE: '/pulse',
  ALGO: '/algo',
  AUDIT: '/auditlog',
};

export function getInitialTab(): TerminalTab {
  if (typeof window === 'undefined') return 'DECK';
  const path = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
  const search = new URLSearchParams(window.location.search);
  const tabParam = search.get('tab')?.toLowerCase();
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');

  const matchTarget = tabParam || path || hash;

  if (['audit', 'auditlog', 'audit-log', 'audit_log', 'ledger', 'trades'].includes(matchTarget)) {
    return 'AUDIT';
  }
  if (['autopilot', 'loop', 'auto', 'autonomous'].includes(matchTarget)) {
    return 'AUTOPILOT';
  }
  if (['council', 'debate', 'quorum'].includes(matchTarget)) {
    return 'COUNCIL';
  }
  if (['pulse', 'radar', 'social'].includes(matchTarget)) {
    return 'PULSE';
  }
  if (['algo', 'builder', 'algobuilder'].includes(matchTarget)) {
    return 'ALGO';
  }
  if (['terminal', 'pro', 'cockpit', 'chart'].includes(matchTarget)) {
    return 'TERMINAL';
  }
  return 'DECK';
}

function TerminalLoadingFallback() {
  return (
    <div className="min-h-[440px] w-full flex flex-col items-center justify-center p-8 bg-[#0b0b10] border border-white/10 rounded-2xl animate-pulse">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-10 h-10 rounded-xs bg-gradient-to-tr from-[#00F0FF] via-[#FACC15] to-[#D946EF] rotate-45 animate-spin" style={{ animationDuration: '2.5s' }} />
        <div className="absolute w-5 h-5 rounded-full bg-[#0b0b10]" />
      </div>
      <div className="flex items-center gap-2 font-mono text-xs text-cyan-400 font-bold uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>STREAMING QUANT MODULE // TELEMETRY LINK</span>
      </div>
      <div className="text-[11px] text-gray-400 font-mono mt-2">
        Sub-system streaming on demand...
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TerminalTab>(() => getInitialTab());
  const [tabHistory, setTabHistory] = useState<TerminalTab[]>([]);
  const [cockpitModule, setCockpitModule] = useState<'CHART' | 'AUTOPILOT' | 'COUNCIL' | 'PULSE' | 'DEPTH' | 'STATARB' | 'KILLSWITCH' | 'AUDIT' | 'ALL'>('CHART');
  const [councilSelectedTicker, setCouncilSelectedTicker] = useState<string>('BTC');
  const [incomingPulseContext, setIncomingPulseContext] = useState<(PulseContext & { ticker: string }) | null>(null);
  const [incomingProposal, setIncomingProposal] = useState<TradeProposal | null>(null);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [utcTime, setUtcTime] = useState<string>('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isBlackSwanDrillOpen, setIsBlackSwanDrillOpen] = useState<boolean>(false);
  const [tradingFloorAudio, setTradingFloorAudio] = useState<boolean>(false);
  const [isBitgetConnected, setIsBitgetConnected] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('LUNARIS_BITGET_BYOK_CREDENTIALS_V1');
    } catch {
      return false;
    }
  });

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        playCyberClick();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ')[4] || now.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const nextState = toggleTerminalSound();
    setSoundEnabled(nextState);
    if (nextState) {
      playCyberClick();
    }
  };

  const handleToggleTradingFloor = () => {
    playCyberClick();
    const nextAmbience = toggleTradingFloorAmbience();
    setTradingFloorAudio(nextAmbience);
  };

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const tab = getInitialTab();
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync initial URL if on audit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initial = getInitialTab();
      const currentPath = window.location.pathname.toLowerCase();
      if (initial === 'AUDIT' && currentPath !== '/auditlog') {
        window.history.replaceState({ tab: 'AUDIT' }, '', '/auditlog');
      }
    }
  }, []);

  // Silently pre-warm heavy modules during browser idle time so tab transitions are instant
  useEffect(() => {
    const prefetchTimer = setTimeout(() => {
      import('@/components/PaperTradingAuditView');
      import('@/components/RealTimeTradingChart');
      import('@/components/AutonomousLoopPanel');
      import('@/components/DebateConsole');
      import('@/components/PulseRadarPanel');
    }, 1500);
    return () => clearTimeout(prefetchTimer);
  }, []);

  // Navigates to a tab while pushing the current tab onto the history stack and updating the browser URL
  const navigateToTab = (newTab: TerminalTab, pushUrl: boolean = true) => {
    if (newTab === activeTab) return;
    setTabHistory((prev) => [...prev, activeTab]);
    setActiveTab(newTab);

    if (pushUrl && typeof window !== 'undefined') {
      const targetPath = TAB_PATHS[newTab] || '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: newTab }, '', targetPath);
      }
    }
  };

  // Return to the previous tab, or fallback to COMMAND DECK
  const handleGoBack = () => {
    playCyberClick();
    if (tabHistory.length > 0) {
      const prevTab = tabHistory[tabHistory.length - 1];
      setTabHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
      if (typeof window !== 'undefined') {
        const targetPath = TAB_PATHS[prevTab] || '/';
        window.history.pushState({ tab: prevTab }, '', targetPath);
      }
    } else {
      setActiveTab('DECK');
      if (typeof window !== 'undefined') {
        window.history.pushState({ tab: 'DECK' }, '', '/');
      }
    }
  };

  const previousTab = tabHistory.length > 0 ? tabHistory[tabHistory.length - 1] : 'DECK';

  // Dispatch signal from Council, Algo Builder, or Demo Scenario directly into Autopilot
  const handleSendToAutopilot = (proposal: TradeProposal) => {
    setIncomingProposal(proposal);
    navigateToTab('TERMINAL');
    setCockpitModule('AUTOPILOT');
  };

  // Handoff ticker and catalyst instruction from Pulse Radar to Council & auto-redirect
  const handlePulseTickerSelect = (ticker: string, context?: PulseContext) => {
    const sym = ticker.toUpperCase();
    setCouncilSelectedTicker(sym);
    if (context) {
      setIncomingPulseContext({
        ...context,
        ticker: sym,
      });
    }

    // Switch to Council tab or Pro Cockpit Council module
    if (activeTab === 'TERMINAL') {
      setCockpitModule('COUNCIL');
    } else {
      navigateToTab('COUNCIL');
    }

    // Scroll directly to the Council section
    setTimeout(() => {
      const councilSection = document.getElementById('council-debate-panel') || document.getElementById('council-messages-stream');
      if (councilSection) {
        councilSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleSelectAssetFromMarquee = (ticker: string) => {
    setCouncilSelectedTicker(ticker);
    navigateToTab('TERMINAL');
    setCockpitModule('CHART');
  };

  const handleResetPaperAccount = () => {
    clearAssetShocks();
    setIncomingProposal(null);
    setResetKey((prev) => prev + 1);
  };

  const COCKPIT_DOCK_ITEMS = [
    { id: 'CHART', name: 'Real-Time Chart', icon: LineChart, desc: 'Live Green Spike & Red Dip' },
    { id: 'AUTOPILOT', name: 'Autopilot Loop', icon: Bot, desc: 'Autonomous Execution' },
    { id: 'COUNCIL', name: 'Council Debate', icon: Scale, desc: 'Tri-Persona Quorum' },
    { id: 'PULSE', name: 'Pulse Radar', icon: Radio, desc: 'Sentiment & Whales' },
    { id: 'DEPTH', name: 'Liquidity Depth', icon: Layers, desc: 'Order Book Heatmap' },
    { id: 'STATARB', name: 'StatArb Matrix', icon: ArrowRightLeft, desc: 'Cross-Asset Pairs' },
    { id: 'AUDIT', name: 'Audit Ledger', icon: ScrollText, desc: 'Bitget S2 Paper Logs' },
    { id: 'KILLSWITCH', name: 'Kill-Switch', icon: Shield, desc: 'Circuit Telemetry' },
    { id: 'ALL', name: 'All-In-One Grid', icon: Grid, desc: 'Complete Matrix' },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--lunaris-bg)] text-[#e2e8f0] font-mono selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Streamlined Cybernetic Navigation Header */}
      <header className="border-b border-[var(--lunaris-panel-border)] bg-[#070709]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Brand Identity & Dedicated Back Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Dedicated Cybernetic Back Button for non-home sections */}
            {activeTab !== 'DECK' && (
              <button
                id="header-back-button"
                onClick={handleGoBack}
                title={`Back to ${TAB_LABELS[previousTab] || 'previous view'}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] hover:text-white transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:shadow-[0_0_18px_rgba(0,240,255,0.4)] cursor-pointer text-xs font-bold font-mono group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">BACK</span>
                <span className="hidden lg:inline text-[10px] text-zinc-400 group-hover:text-zinc-200">
                  ({TAB_LABELS[previousTab] || 'Deck'})
                </span>
              </button>
            )}

            <button
              onClick={() => {
                playCyberClick();
                navigateToTab('DECK');
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              {/* Restored Signature Vibrant Multi-Color Diamond Glyph */}
              <div className="relative flex items-center justify-center">
                <div className="w-4 h-4 rounded-xs bg-gradient-to-tr from-[#00F0FF] via-[#FACC15] to-[#D946EF] rotate-45 shadow-[0_0_12px_rgba(0,240,255,0.7)] group-hover:rotate-90 transition-transform duration-300" />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-[#070709]" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-wider text-white">
                  LUNARIS
                </h1>
                {/* Bitget Brand Blue/Cyan Themed Edition Badge */}
                <span className="text-[10px] font-extrabold text-[#00F0FF] border border-[#00F0FF]/40 px-2 py-0.5 rounded bg-[#00F0FF]/10 uppercase hidden sm:inline-block shadow-[0_0_8px_rgba(0,240,255,0.25)] tracking-wider">
                  Bitget AI Edition
                </span>
              </div>
            </button>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs">
            <button
              onClick={() => {
                playCyberClick();
                navigateToTab('DECK');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'DECK'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> COMMAND DECK
            </button>

            <button
              onClick={() => {
                playCyberClick();
                navigateToTab('TERMINAL');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'TERMINAL'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> PRO COCKPIT
            </button>

            <button
              onClick={() => {
                playCyberClick();
                navigateToTab('AUTOPILOT');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'AUTOPILOT'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> AUTOPILOT
            </button>

            <button
              onClick={() => {
                playCyberClick();
                navigateToTab('COUNCIL');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'COUNCIL'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" /> COUNCIL
            </button>

            <button
              onClick={() => {
                playCyberClick();
                navigateToTab('PULSE');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'PULSE'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> PULSE
            </button>

            {/* Official Bitget S2 Paper-Trading Audit Tab */}
            <button
              id="nav-tab-audit-log"
              onMouseEnter={() => {
                import('@/components/PaperTradingAuditView');
              }}
              onClick={() => {
                playCyberClick();
                navigateToTab('AUDIT');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'AUDIT'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>AUDIT LOG</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'AUDIT'
                  ? 'bg-black/15 text-black font-bold'
                  : 'bg-white/10 text-zinc-400'
              }`}>S2</span>
            </button>
          </nav>

          {/* Right: Quick Telemetry & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
            {/* Cmd + K Quick Agentic Command Bar Pill */}
            <button
              onClick={() => {
                playCyberClick();
                setIsCommandPaletteOpen(true);
              }}
              title="Open Quick Agent Command Palette (Cmd + K / Ctrl + K)"
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/15 hover:border-[#00F0FF]/40 px-2.5 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer"
            >
              <Command className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="hidden md:inline font-bold">⌘K</span>
            </button>

            {/* Bitget BYOK Read-Only API Key Trigger */}
            <button
              onClick={() => {
                playCyberClick();
                setIsApiKeyModalOpen(true);
              }}
              title={isBitgetConnected ? 'Bitget Read-Only Key Paired — Click to inspect live telemetry & verified assets' : 'Pair Read-Only Bitget API Key'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-mono transition-colors border cursor-pointer ${
                isBitgetConnected
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/15 text-zinc-400 hover:text-white'
              }`}
            >
              <Key className={`w-3.5 h-3.5 ${isBitgetConnected ? 'text-emerald-400' : 'text-[#00F0FF]'}`} />
              <span className="hidden lg:inline">{isBitgetConnected ? 'Bitget: Paired' : 'BYOK'}</span>
            </button>

            {/* Trading Floor Ambient Synthesizer Toggle */}
            <button
              onClick={handleToggleTradingFloor}
              title={tradingFloorAudio ? 'Mute Trading Floor Ambience' : 'Enable Bloomberg Ambient Floor Audio'}
              className={`p-1.5 rounded-full border transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                tradingFloorAudio
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>

            {/* Master Sound Effects Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? 'Disable Terminal Audio' : 'Enable Terminal Audio'}
              className={`p-1.5 rounded-full border transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                soundEnabled
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#00F0FF]" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Bitget Latency */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold border border-white/15 bg-white/5 px-2.5 py-1.5 rounded-full whitespace-nowrap">
              <Wifi className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
              <span className="text-zinc-300">Bitget: 4ms</span>
            </div>

            {/* Handbook trigger */}
            <button
              onClick={() => {
                playCyberClick();
                setIsCreditsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/15 px-2.5 py-1.5 rounded-full text-xs transition-colors font-semibold cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="hidden sm:inline">Handbook</span>
            </button>
          </div>
        </div>
      </header>

      {/* Infinite Real-Time Live Ticker Marquee (Crypto & Tokenized Stocks) */}
      <LiveTickerMarquee
        onSelectAsset={handleSelectAssetFromMarquee}
        activeTicker={councilSelectedTicker}
      />

      {/* Main Container */}
      <main className={`mx-auto px-4 py-4 space-y-8 transition-all duration-200 ${activeTab === 'AUDIT' ? 'max-w-[1680px]' : 'max-w-7xl'}`}>
        <Suspense fallback={<TerminalLoadingFallback />}>
          {/* VIEW 1: COMMAND DECK (Clean, Cinematic Gateway matching Moonberg Reference) */}
          {activeTab === 'DECK' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Cyber Hero with 3D Wireframe Spheres & Typewriter */}
            <CommandDeckHero
              onLaunchTerminal={() => {
                navigateToTab('TERMINAL');
                setCockpitModule('CHART');
              }}
              onOpenAlgoBuilder={() => {
                navigateToTab('TERMINAL');
                setCockpitModule('ALGO');
              }}
              onOpenAuditLedger={() => {
                navigateToTab('AUDIT');
              }}
            />

            {/* Official Bitget AI Base Camp S2 Audit Ledger Callout Banner */}
            <div className="bg-gradient-to-r from-[#00F0FF]/10 via-[#0e1017] to-cyan-500/5 border border-[#00F0FF]/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_25px_rgba(0,240,255,0.08)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
                  <span className="text-xs font-mono font-bold text-[#00F0FF] uppercase tracking-wider">
                    Bitget AI Base Camp S2 // Track 2: Agentic Trading Submission
                  </span>
                  <span className="text-[10px] bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 px-2 py-0.5 rounded font-mono font-bold">
                    MANDATORY LOG VERIFICATION
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Complete Autonomous Paper-Trading Audit Ledger & Institutional Metrics
                </h3>
                <p className="text-xs text-gray-400 max-w-3xl">
                  Inspect live-settled paper execution logs with exact UTC timestamps, instrument pairs, LONG/SHORT direction, sizing, execution price, Council Quorum reasoning, and settled balance changes ($100k → $107.9k). Includes 1-click CSV download for judge review.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onMouseEnter={() => {
                    import('@/components/PaperTradingAuditView');
                  }}
                  onClick={() => {
                    playCyberClick();
                    navigateToTab('AUDIT');
                  }}
                  className="flex items-center gap-2 bg-[#00F0FF] hover:bg-[#38f6ff] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:scale-102 cursor-pointer whitespace-nowrap"
                >
                  <ScrollText className="w-4 h-4" />
                  <span>OPEN AUDIT LEDGER</span>
                </button>
              </div>
            </div>

            {/* The 3-Pillar Bento Showcase (01: Data Layer, 02: Algo Builder, 03: What Lunaris Does) */}
            <div id="bento-showcase" className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-gray-400 font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  ARCHITECTURE SHOWCASE // #01 - #03
                </span>
                <span className="text-[11px] text-gray-500 hidden sm:inline">
                  Multi-Asset Quorum & Zero-Code Pipelines
                </span>
              </div>

              <ThreePillarBento
                onLaunchTerminal={() => {
                  navigateToTab('TERMINAL');
                  setCockpitModule('CHART');
                }}
                onDeployAlgo={handleSendToAutopilot}
                onSelectNode={(ticker) => handlePulseTickerSelect(ticker)}
                onOpenStudio={() => {
                  navigateToTab('TERMINAL');
                  setCockpitModule('CHART');
                }}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: FULL TRADING TERMINAL (PRO COCKPIT) WITH MODULAR NAME & SYMBOL DOCK */}
        {activeTab === 'TERMINAL' && (
          <div className="space-y-4 animate-fadeIn" key={resetKey}>
            {/* Cockpit Modular Command Dock: Name and Symbol of each functionality */}
            <div className="bg-[#0b0b10] border border-white/10 rounded-xl p-2.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2 mb-2 px-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-gray-300 font-bold uppercase tracking-wider font-mono">
                    PRO COCKPIT MODULES // SELECT TO VIEW FULL PICTURE
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono hidden sm:flex items-center gap-2">
                  <span>Selected Asset: <b className="text-yellow-400">{councilSelectedTicker}</b></span>
                  <span className="text-gray-600">|</span>
                  <span className="text-emerald-400">Bitget Order Router Armed</span>
                </div>
              </div>

              {/* Symbol & Name Module Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {COCKPIT_DOCK_ITEMS.map((item) => {
                  const isActive = cockpitModule === item.id;
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        playCyberClick();
                        setCockpitModule(item.id as any);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-102 font-extrabold'
                          : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FULL PICTURE MODULE RENDERING */}

            {/* 1. REAL-TIME TRADING CHART (Green Spikes & Red Dips) */}
            {cockpitModule === 'CHART' && (
              <div className="space-y-4 animate-fadeIn">
                <RealTimeTradingChart
                  selectedTicker={councilSelectedTicker}
                  onSelectTicker={setCouncilSelectedTicker}
                  onExecuteTrade={handleSendToAutopilot}
                />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-6">
                    <LiquidityDepthHeatmap ticker={councilSelectedTicker} />
                  </div>
                  <div className="lg:col-span-6">
                    <DeterministicKillSwitch
                      onEmergencyKillAll={handleResetPaperAccount}
                      onResetSystem={handleResetPaperAccount}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. AUTOPILOT LOOP & EXECUTION */}
            {cockpitModule === 'AUTOPILOT' && (
              <div className="space-y-4 animate-fadeIn">
                <DemoModeController
                  onTriggerDirectProposal={handleSendToAutopilot}
                  onResetBalances={handleResetPaperAccount}
                />
                <AutonomousLoopPanel
                  key={`auto-cockpit-${resetKey}`}
                  externalProposal={incomingProposal}
                  onClearExternalProposal={() => setIncomingProposal(null)}
                />
              </div>
            )}

            {/* 3. COUNCIL QUORUM DEBATE */}
            {cockpitModule === 'COUNCIL' && (
              <div className="space-y-4 animate-fadeIn">
                <DebateConsole
                  onSendToAutopilot={handleSendToAutopilot}
                  initialTicker={councilSelectedTicker}
                  incomingPulseContext={incomingPulseContext}
                  onClearPulseContext={() => setIncomingPulseContext(null)}
                />
              </div>
            )}

            {/* 4. SOCIAL & ON-CHAIN PULSE RADAR */}
            {cockpitModule === 'PULSE' && (
              <div className="space-y-4 animate-fadeIn">
                <PulseRadarPanel onSelectTickerForCouncil={handlePulseTickerSelect} />
              </div>
            )}

            {/* 5. LIQUIDITY DEPTH & ORDER BOOK HEATMAP */}
            {cockpitModule === 'DEPTH' && (
              <div className="space-y-4 animate-fadeIn">
                <LiquidityDepthHeatmap ticker={councilSelectedTicker} />
                <RealTimeTradingChart
                  selectedTicker={councilSelectedTicker}
                  onSelectTicker={setCouncilSelectedTicker}
                  onExecuteTrade={handleSendToAutopilot}
                />
              </div>
            )}

            {/* 6. CROSS-ASSET STATARB MATRIX */}
            {cockpitModule === 'STATARB' && (
              <div className="space-y-4 animate-fadeIn">
                <CrossAssetMatrix onRoutePairSignal={handleSendToAutopilot} />
              </div>
            )}

            {/* 7. DETERMINISTIC KILL-SWITCH & CIRCUIT SAFETY */}
            {cockpitModule === 'KILLSWITCH' && (
              <div className="space-y-4 animate-fadeIn">
                <DeterministicKillSwitch
                  onEmergencyKillAll={handleResetPaperAccount}
                  onResetSystem={handleResetPaperAccount}
                />
                <AutonomousLoopPanel
                  key={`auto-kill-${resetKey}`}
                  externalProposal={incomingProposal}
                  onClearExternalProposal={() => setIncomingProposal(null)}
                />
              </div>
            )}

            {/* 11. BITGET S2 OFFICIAL PAPER-TRADING AUDIT LEDGER */}
            {cockpitModule === 'AUDIT' && (
              <div className="space-y-4 animate-fadeIn">
                <PaperTradingAuditView
                  onBack={handleGoBack}
                  onNavigateToCockpit={(ticker) => {
                    if (ticker) setCouncilSelectedTicker(ticker);
                    setCockpitModule('CHART');
                  }}
                />
              </div>
            )}

            {/* 11. ALL-IN-ONE COMPLETE MATRIX */}
            {cockpitModule === 'ALL' && (
              <div className="space-y-4 animate-fadeIn">
                <RealTimeTradingChart
                  selectedTicker={councilSelectedTicker}
                  onSelectTicker={setCouncilSelectedTicker}
                  onExecuteTrade={handleSendToAutopilot}
                />
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                  <div className="xl:col-span-7">
                    <AutonomousLoopPanel
                      key={`auto-all-${resetKey}`}
                      externalProposal={incomingProposal}
                      onClearExternalProposal={() => setIncomingProposal(null)}
                    />
                  </div>
                  <div className="xl:col-span-5">
                    <DebateConsole
                      onSendToAutopilot={handleSendToAutopilot}
                      initialTicker={councilSelectedTicker}
                      incomingPulseContext={incomingPulseContext}
                      onClearPulseContext={() => setIncomingPulseContext(null)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-6">
                    <LiquidityDepthHeatmap ticker={councilSelectedTicker} />
                  </div>
                  <div className="lg:col-span-6">
                    <DeterministicKillSwitch
                      onEmergencyKillAll={handleResetPaperAccount}
                      onResetSystem={handleResetPaperAccount}
                    />
                  </div>
                </div>
                <PulseRadarPanel onSelectTickerForCouncil={handlePulseTickerSelect} />
                <CrossAssetMatrix onRoutePairSignal={handleSendToAutopilot} />
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: AUTOPILOT DEDICATED */}
        {activeTab === 'AUTOPILOT' && (
          <div key={resetKey} className="space-y-4 animate-fadeIn">
            <DemoModeController
              onTriggerDirectProposal={handleSendToAutopilot}
              onResetBalances={handleResetPaperAccount}
            />
            <AutonomousLoopPanel
              key={`auto-tab-${resetKey}`}
              externalProposal={incomingProposal}
              onClearExternalProposal={() => setIncomingProposal(null)}
            />
          </div>
        )}

        {/* VIEW 4: COUNCIL DEDICATED */}
        {activeTab === 'COUNCIL' && (
          <div key={resetKey} className="space-y-4 animate-fadeIn">
            <DebateConsole
              onSendToAutopilot={handleSendToAutopilot}
              initialTicker={councilSelectedTicker}
              incomingPulseContext={incomingPulseContext}
              onClearPulseContext={() => setIncomingPulseContext(null)}
            />
          </div>
        )}

        {/* VIEW 5: PULSE DEDICATED */}
        {activeTab === 'PULSE' && (
          <div key={resetKey} className="space-y-4 animate-fadeIn">
            <PulseRadarPanel onSelectTickerForCouncil={handlePulseTickerSelect} />
          </div>
        )}

        {/* VIEW 6: ALGO BUILDER DEDICATED */}
        {activeTab === 'ALGO' && (
          <div className="space-y-6 animate-fadeIn">
            <VisualAlgoBuilder onDeployToAutopilot={handleSendToAutopilot} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <UnifiedDataConstellation onSelectNode={handlePulseTickerSelect} />
              </div>
              <div className="lg:col-span-6">
                <CrossAssetMatrix onRoutePairSignal={handleSendToAutopilot} />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 7: BITGET S2 OFFICIAL PAPER-TRADING AUDIT LEDGER */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-6 animate-fadeIn">
            <PaperTradingAuditView
              onBack={handleGoBack}
              onNavigateToCockpit={(ticker) => {
                if (ticker) setCouncilSelectedTicker(ticker);
                navigateToTab('TERMINAL');
                setCockpitModule('CHART');
              }}
            />
          </div>
        )}
        </Suspense>
      </main>

      {/* Institutional Terminal Footer */}
      <footer className="border-t border-[var(--lunaris-panel-border)] bg-[#070709] py-6 mt-12 text-xs text-gray-500">
        <div className={`mx-auto px-4 flex flex-wrap items-center justify-between gap-4 transition-all duration-200 ${activeTab === 'AUDIT' ? 'max-w-[1680px]' : 'max-w-7xl'}`}>
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-xs bg-gradient-to-tr from-[#00F0FF] via-[#FACC15] to-[#D946EF] rotate-45 shadow-[0_0_10px_rgba(0,240,255,0.7)]" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-[#070709]" />
            </div>
            <span className="text-white font-black tracking-wider">LUNARIS Terminal</span>
            <span className="text-gray-600">|</span>
            <span>Cross-Asset Execution Agent (Phase 2 Expansion)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>Developer: <b className="text-gray-200">Joezzy (Joezzy Web3)</b></span>
            <span className="text-gray-600">•</span>
            <span>Bitget AI Hackathon S2</span>
            <span className="text-gray-600">•</span>
            <a
              href="https://bitget-ai.gitbook.io/bitgetai_hackathons2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              Handbook <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-gray-600">•</span>
            <a
              href="https://x.com/Bitget_AI"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              @Bitget_AI <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Lazy Modals Wrapped in Suspense */}
      <Suspense fallback={null}>
        {/* Hackathon Credits & Certification Modal */}
        <HackathonCreditsModal
          isOpen={isCreditsModalOpen}
          onClose={() => setIsCreditsModalOpen(false)}
        />

        {/* Quick Agentic Command Palette (Cmd + K / Ctrl + K) */}
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigateTab={(tab) => {
            navigateToTab(tab);
          }}
          onNavigateCockpitModule={(mod) => {
            setCockpitModule(mod);
          }}
          onConveneCouncil={(ticker, prompt) => {
            setCouncilSelectedTicker(ticker);
            navigateToTab('COUNCIL');
          }}
          onOpenFlashCrashDrill={() => {
            setIsBlackSwanDrillOpen(true);
          }}
          onOpenAuditLedger={() => {
            navigateToTab('AUDIT');
          }}
        />

        {/* Bitget Institutional Read-Only API (BYOK) Modal */}
        <BitgetApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onConnectionStatusChange={(connected) => {
            setIsBitgetConnected(connected);
          }}
        />

        {/* Black Swan / Flash Crash Emergency Drill Modal */}
        <BlackSwanDrillModal
          isOpen={isBlackSwanDrillOpen}
          onClose={() => setIsBlackSwanDrillOpen(false)}
        />
      </Suspense>
    </div>
  );
}
