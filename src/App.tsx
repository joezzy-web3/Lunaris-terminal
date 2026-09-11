/**
 * LUNARIS Terminal (Bitget Edition) — Phase 2 Cybernetic Expansion
 * Inspired by Moonberg & Institutional AI Trading Cockpits
 * Built for Bitget AI Hackathon by Joezzy (Joezzy Web3)
 */

import React, { useState, useEffect } from 'react';
import { AutonomousLoopPanel } from '@/components/AutonomousLoopPanel';
import { DebateConsole } from '@/components/DebateConsole';
import { PulseRadarPanel } from '@/components/PulseRadarPanel';
import { DemoModeController } from '@/components/DemoModeController';
import { HackathonCreditsModal } from '@/components/HackathonCreditsModal';
import { CommandDeckHero } from '@/components/CommandDeckHero';
import { VisualAlgoBuilder } from '@/components/VisualAlgoBuilder';
import { UnifiedDataConstellation } from '@/components/UnifiedDataConstellation';
import { WhatLunarisDoes } from '@/components/WhatLunarisDoes';
import { CrossAssetMatrix } from '@/components/CrossAssetMatrix';
import { ThreePillarBento } from '@/components/ThreePillarBento';
import { LiveTickerMarquee } from '@/components/LiveTickerMarquee';
import { RealTimeTradingChart } from '@/components/RealTimeTradingChart';
import { LiquidityDepthHeatmap } from '@/components/LiquidityDepthHeatmap';
import { QuantBacktestEngine } from '@/components/QuantBacktestEngine';
import { DeterministicKillSwitch } from '@/components/DeterministicKillSwitch';
import { TradeProposal } from '@/lib/riskVeto';
import { clearAssetShocks } from '@/lib/demoSeedData';
import { PulseContext } from '@/lib/councilDebateEngine';
import { toggleTerminalSound, getTerminalSoundState, playCyberClick } from '@/lib/soundSynth';
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
  Target,
  Shield,
  Grid,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'DECK' | 'TERMINAL' | 'AUTOPILOT' | 'COUNCIL' | 'PULSE' | 'ALGO'>('DECK');
  const [cockpitModule, setCockpitModule] = useState<'CHART' | 'AUTOPILOT' | 'COUNCIL' | 'PULSE' | 'DEPTH' | 'STATARB' | 'ALGO' | 'BACKTEST' | 'SANDBOX' | 'KILLSWITCH' | 'ALL'>('CHART');
  const [councilSelectedTicker, setCouncilSelectedTicker] = useState<string>('BTC');
  const [incomingPulseContext, setIncomingPulseContext] = useState<(PulseContext & { ticker: string }) | null>(null);
  const [incomingProposal, setIncomingProposal] = useState<TradeProposal | null>(null);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [utcTime, setUtcTime] = useState<string>('');

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

  // Dispatch signal from Council, Algo Builder, or Demo Scenario directly into Autopilot
  const handleSendToAutopilot = (proposal: TradeProposal) => {
    setIncomingProposal(proposal);
    setActiveTab('TERMINAL');
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
      setActiveTab('COUNCIL');
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
    setActiveTab('TERMINAL');
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
    { id: 'ALGO', name: 'Algo Studio', icon: Zap, desc: 'Visual Flowchart' },
    { id: 'BACKTEST', name: 'Quant Backtest', icon: History, desc: 'Scenario Replay' },
    { id: 'SANDBOX', name: 'Shock Sandbox', icon: Target, desc: 'Market Stress Tests' },
    { id: 'KILLSWITCH', name: 'Kill-Switch', icon: Shield, desc: 'Circuit Telemetry' },
    { id: 'ALL', name: 'All-In-One Grid', icon: Grid, desc: 'Complete Matrix' },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--lunaris-bg)] text-[#e2e8f0] font-mono selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Streamlined Cybernetic Navigation Header */}
      <header className="border-b border-[var(--lunaris-panel-border)] bg-[#070709]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                playCyberClick();
                setActiveTab('DECK');
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
                setActiveTab('DECK');
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
                setActiveTab('TERMINAL');
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
                setActiveTab('AUTOPILOT');
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
                setActiveTab('COUNCIL');
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
                setActiveTab('PULSE');
              }}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'PULSE'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> PULSE
            </button>
          </nav>

          {/* Right: Quick Telemetry & Action Buttons */}
          <div className="flex items-center gap-2.5 text-xs">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? 'Disable Terminal Audio' : 'Enable Terminal Audio'}
              className={`p-1.5 rounded-full border transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
                soundEnabled
                  ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-yellow-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Bitget Latency */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold border border-white/15 bg-white/5 px-2.5 py-1.5 rounded-full whitespace-nowrap">
              <Wifi className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span className="text-gray-300">Bitget: 4ms</span>
            </div>

            {/* Handbook trigger */}
            <button
              onClick={() => {
                playCyberClick();
                setIsCreditsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/15 px-3 py-1.5 rounded-full text-xs transition-colors font-semibold cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">Handbook</span>
            </button>

            {/* Action Pill / Live Telemetry Badge */}
            {activeTab === 'DECK' ? (
              <button
                onClick={() => {
                  playCyberClick();
                  setActiveTab('TERMINAL');
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold px-3.5 py-1.5 rounded-full text-xs transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] cursor-pointer uppercase tracking-wider"
              >
                <Terminal className="w-3.5 h-3.5 fill-black" />
                <span>Launch Terminal</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 border border-white/15 bg-white/5 text-gray-300 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Quorum Active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Infinite Real-Time Live Ticker Marquee (Crypto & Tokenized Stocks) */}
      <LiveTickerMarquee
        onSelectAsset={handleSelectAssetFromMarquee}
        activeTicker={councilSelectedTicker}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-8">
        {/* VIEW 1: COMMAND DECK (Clean, Cinematic Gateway matching Moonberg Reference) */}
        {activeTab === 'DECK' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Cyber Hero with 3D Wireframe Spheres & Typewriter */}
            <CommandDeckHero
              onLaunchTerminal={() => {
                setActiveTab('TERMINAL');
                setCockpitModule('CHART');
              }}
              onOpenAlgoBuilder={() => {
                setActiveTab('TERMINAL');
                setCockpitModule('ALGO');
              }}
            />

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
                  setActiveTab('TERMINAL');
                  setCockpitModule('CHART');
                }}
                onDeployAlgo={handleSendToAutopilot}
                onSelectNode={(ticker) => handlePulseTickerSelect(ticker)}
                onOpenStudio={() => {
                  setActiveTab('TERMINAL');
                  setCockpitModule('ALGO');
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

            {/* 7. VISUAL ALGO BUILDER */}
            {cockpitModule === 'ALGO' && (
              <div className="space-y-4 animate-fadeIn">
                <VisualAlgoBuilder onDeployToAutopilot={handleSendToAutopilot} />
              </div>
            )}

            {/* 8. QUANT BACKTEST ENGINE & SCENARIO REPLAY */}
            {cockpitModule === 'BACKTEST' && (
              <div className="space-y-4 animate-fadeIn">
                <QuantBacktestEngine onDeployCalibratedStrategy={handleSendToAutopilot} />
              </div>
            )}

            {/* 9. SHOCK SANDBOX & STRESS TEST */}
            {cockpitModule === 'SANDBOX' && (
              <div className="space-y-4 animate-fadeIn">
                <DemoModeController
                  onTriggerDirectProposal={handleSendToAutopilot}
                  onResetBalances={handleResetPaperAccount}
                />
              </div>
            )}

            {/* 10. DETERMINISTIC KILL-SWITCH & CIRCUIT SAFETY */}
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
      </main>

      {/* Institutional Terminal Footer */}
      <footer className="border-t border-[var(--lunaris-panel-border)] bg-[#070709] py-6 mt-12 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
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

      {/* Hackathon Credits & Certification Modal */}
      <HackathonCreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
      />
    </div>
  );
}
