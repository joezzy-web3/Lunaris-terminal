// components/BlackSwanDrillModal.tsx
// Interactive Black Swan / Flash Crash Simulator with Guardian-01 Character Animation

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  X,
  Zap,
  Lock,
  Cpu,
  Activity,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { playCyberClick, playBlackSwanAlarm, playEmergencyButtonSlam, playTradeApprovedChime } from '@/lib/soundSynth';

interface BlackSwanDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKillswitchTriggered?: () => void;
  onResetSystem?: () => void;
}

export const BlackSwanDrillModal: React.FC<BlackSwanDrillModalProps> = ({
  isOpen,
  onClose,
  onKillswitchTriggered,
  onResetSystem,
}) => {
  // Drill stages: 'IDLE' | 'SHOCK_TRIGGERED' | 'GUARDIAN_SLAMMING' | 'CIRCUITS_HALTED'
  const [drillStage, setDrillStage] = useState<'IDLE' | 'SHOCK_TRIGGERED' | 'GUARDIAN_SLAMMING' | 'CIRCUITS_HALTED'>('IDLE');
  const [handDepressed, setHandDepressed] = useState(false);
  const [shockwaveActive, setShockwaveActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDrillStage('IDLE');
      setHandDepressed(false);
      setShockwaveActive(false);
      setLogs([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDrill = () => {
    playCyberClick();
    playBlackSwanAlarm();
    setDrillStage('SHOCK_TRIGGERED');
    setLogs([
      '[00.00s] SYNTHETIC MACRO SHOCK INJECTED: Institutional flash liquidity run detected on Bitget BTC orderbook.',
      '[00.12s] BTC price plunged -8.42% in 180ms ($94,850 → $86,863). Orderbook bid depth dropped by 82%.',
    ]);

    // After 1.4s, Guardian-01 detects the invariant breach and prepares to slam the button
    setTimeout(() => {
      setDrillStage('GUARDIAN_SLAMMING');
      setLogs((prev) => [
        ...prev,
        '[00.35s] GUARDIAN-01 DETERMINISTIC GATE: Single-asset VaR threshold breached (>25%). Hazard acrylic cover disengaged.',
      ]);

      // Hand strikes the killswitch after 800ms
      setTimeout(() => {
        setHandDepressed(true);
        setShockwaveActive(true);
        playEmergencyButtonSlam();

        // System halted
        setTimeout(() => {
          setDrillStage('CIRCUITS_HALTED');
          if (onKillswitchTriggered) onKillswitchTriggered();
          setLogs((prev) => [
            ...prev,
            '[00.48s] >>> EMERGENCY KILL-SWITCH DETERMINISTICALLY TRIPPED <<<',
            '[00.52s] [ACTION 1] 6 Open Maker & Taker Limit Orders Annihilated in 4.2ms.',
            '[00.65s] [ACTION 2] Synthetic Delta-Neutral Inverse Hedge Deployed against Bitget Live Liquidity.',
            '[00.78s] [ACTION 3] Portfolio VaR Locked at 0.00%. Execution loop isolated. Capital 100% shielded.',
          ]);
        }, 500);
      }, 700);
    }, 1400);
  };

  const handleResetDrill = () => {
    playCyberClick();
    playTradeApprovedChime();
    setDrillStage('IDLE');
    setHandDepressed(false);
    setShockwaveActive(false);
    setLogs([]);
    if (onResetSystem) onResetSystem();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn font-mono">
      <div className="bg-[#0c0e15] border border-rose-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-[0_0_50px_rgba(244,63,94,0.2)] relative max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Emergency Drill // Circuit Breaker Resilience Test
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-bold">
                BITGET DEFCON-1
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Guardian-01 Black Swan &amp; Flash Crash Simulator
            </h2>
          </div>

          <button
            onClick={() => {
              playCyberClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
          {/* Guardian-01 Interactive Character Animation Stage */}
          <div className="relative bg-[#07080d] border border-white/10 rounded-2xl p-5 overflow-hidden flex flex-col items-center justify-center min-h-[260px] text-center shadow-inner">
            {/* Ambient Red Alert Scanlines during emergency */}
            {drillStage !== 'IDLE' && (
              <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 via-transparent to-rose-500/10 pointer-events-none animate-pulse" />
            )}

            {/* Character Graphic: Guardian-01 Cybernetic Robotic Avatar */}
            <div className="relative w-48 h-48 flex items-center justify-center select-none">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
                {/* Robot Torso / Armor */}
                <path
                  d="M60,140 L140,140 L155,190 L45,190 Z"
                  fill="#181b26"
                  stroke={drillStage !== 'IDLE' ? '#F43F5E' : '#00F0FF'}
                  strokeWidth="2"
                />
                {/* Chest Reactor Core */}
                <circle
                  cx="100"
                  cy="165"
                  r="12"
                  fill={drillStage === 'CIRCUITS_HALTED' ? '#F43F5E' : '#00F0FF'}
                  className={drillStage !== 'IDLE' ? 'animate-pulse' : ''}
                />
                <circle cx="100" cy="165" r="6" fill="#FFFFFF" />

                {/* Neck */}
                <rect x="90" y="125" width="20" height="15" fill="#10131e" />

                {/* Robot Helmet / Head */}
                <polygon
                  points="70,60 130,60 140,95 130,125 70,125 60,95"
                  fill="#202434"
                  stroke={drillStage !== 'IDLE' ? '#F43F5E' : '#00F0FF'}
                  strokeWidth="2.5"
                />
                {/* Tactical Ear Antennae */}
                <polygon points="52,70 60,65 60,105 52,100" fill="#0f111a" stroke="#475569" />
                <polygon points="148,70 140,65 140,105 148,100" fill="#0f111a" stroke="#475569" />

                {/* Animated Tactical Visor */}
                <path
                  d="M72,82 Q100,75 128,82 Q100,98 72,82 Z"
                  fill={
                    drillStage === 'IDLE'
                      ? '#00F0FF'
                      : drillStage === 'SHOCK_TRIGGERED'
                      ? '#F59E0B'
                      : '#F43F5E'
                  }
                  className="transition-colors duration-300"
                />
                {/* Visor Glare & Scanning Line */}
                <line
                  x1="76"
                  y1="82"
                  x2="124"
                  y2="82"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeDasharray="10 15"
                  className={drillStage !== 'IDLE' ? 'animate-pulse' : ''}
                />

                {/* Animated Cybernetic Arm & Hand */}
                <g
                  className="transition-all duration-300 transform origin-top"
                  style={{
                    transform:
                      drillStage === 'GUARDIAN_SLAMMING'
                        ? handDepressed
                          ? 'translateY(24px) scale(1.05)'
                          : 'translateY(-10px) scale(0.95)'
                        : 'translateY(0px)',
                  }}
                >
                  {/* Forearm */}
                  <rect
                    x="86"
                    y={handDepressed ? 152 : 142}
                    width="28"
                    height="18"
                    rx="4"
                    fill="#334155"
                    stroke={drillStage !== 'IDLE' ? '#F43F5E' : '#64748B'}
                    strokeWidth="1.5"
                  />
                  {/* Cybernetic Fist */}
                  <circle
                    cx="100"
                    cy={handDepressed ? 172 : 160}
                    r="14"
                    fill={handDepressed ? '#E11D48' : '#1E293B'}
                    stroke={handDepressed ? '#FFFFFF' : '#94A3B8'}
                    strokeWidth="2"
                  />
                  {/* Knuckle Hydraulics */}
                  <rect
                    x="90"
                    y={handDepressed ? 168 : 156}
                    width="20"
                    height="4"
                    rx="1"
                    fill="#00F0FF"
                  />
                </g>
              </svg>

              {/* Protective Acrylic Safety Cover Graphic (flips open when drill starts) */}
              <div
                className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-28 h-12 rounded-t-xl border border-white/30 backdrop-blur-sm pointer-events-none transition-all duration-500 origin-bottom ${
                  drillStage === 'IDLE'
                    ? 'bg-cyan-500/10 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    : 'bg-rose-500/10 rotate-[-45deg] translate-y-[-25px] opacity-40'
                }`}
              >
                <div className="text-[8px] font-bold text-white/70 text-center pt-1 tracking-widest uppercase">
                  {drillStage === 'IDLE' ? 'SAFETY COVER [LOCKED]' : 'HAZARD COVER [LIFTED]'}
                </div>
              </div>

              {/* Shockwave Rings on Impact */}
              {shockwaveActive && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-2 border-rose-500 animate-ping pointer-events-none" />
              )}
            </div>

            {/* Stage Status Display */}
            <div className="mt-2 space-y-1">
              <div className="text-xs font-bold font-mono">
                {drillStage === 'IDLE' && (
                  <span className="text-zinc-400">
                    Guardian-01 Status: <span className="text-emerald-400">Armed &amp; Monitoring Orderbook Invariants</span>
                  </span>
                )}
                {drillStage === 'SHOCK_TRIGGERED' && (
                  <span className="text-amber-400 animate-pulse">
                    &gt;&gt;&gt; DETECTED FLASH CRASH (-8.42%) // INITIATING DEFENSIVE OVERRIDE &lt;&lt;&lt;
                  </span>
                )}
                {drillStage === 'GUARDIAN_SLAMMING' && (
                  <span className="text-rose-400 font-extrabold animate-bounce">
                    GUARDIAN-01 SLAMMING EMERGENCY CIRCUIT BREAKER!
                  </span>
                )}
                {drillStage === 'CIRCUITS_HALTED' && (
                  <span className="text-rose-400 font-extrabold">
                    SYSTEM HALTED: CIRCUIT BREAKER DETERMINISTICALLY LOCKED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                {drillStage === 'IDLE'
                  ? 'Click "Simulate Flash Crash" below to run an institutional test drill where Guardian-01 physically slams the killswitch to prevent catastrophic liquidation.'
                  : drillStage === 'CIRCUITS_HALTED'
                  ? 'Autonomous defense verified: Cancelled all open orders, initiated delta-neutral hedge, and quarantined risk exposure.'
                  : 'Synthesizing market depth shock on Bitget live orderbook...'}
              </p>
            </div>
          </div>

          {/* Real-Time Defense Invariants Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#07080d] border border-white/10 p-3 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-500 uppercase">BTC Flash Price</div>
              <div
                className={`text-sm font-bold ${
                  drillStage !== 'IDLE' ? 'text-rose-400' : 'text-white'
                }`}
              >
                {drillStage === 'IDLE' ? '$94,850.00' : '$86,863.50 (-8.4%)'}
              </div>
              <div className="text-[9px] text-zinc-400">
                {drillStage === 'IDLE' ? 'Normal Volatility' : 'Severe Shock'}
              </div>
            </div>

            <div className="bg-[#07080d] border border-white/10 p-3 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-500 uppercase">Pending Orders</div>
              <div
                className={`text-sm font-bold ${
                  drillStage === 'CIRCUITS_HALTED' ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {drillStage === 'CIRCUITS_HALTED' ? '0 (ALL PURGED)' : '6 Active'}
              </div>
              <div className="text-[9px] text-zinc-400">Immediate Cancel</div>
            </div>

            <div className="bg-[#07080d] border border-white/10 p-3 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-500 uppercase">Portfolio VaR</div>
              <div
                className={`text-sm font-bold ${
                  drillStage === 'CIRCUITS_HALTED' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {drillStage === 'CIRCUITS_HALTED' ? '0.00% (IMMUNIZED)' : '24.8% (Exposed)'}
              </div>
              <div className="text-[9px] text-zinc-400">Ceiling: 25.0%</div>
            </div>

            <div className="bg-[#07080d] border border-white/10 p-3 rounded-xl space-y-1">
              <div className="text-[10px] text-zinc-500 uppercase">Capital Preservation</div>
              <div className="text-sm font-bold text-emerald-400">
                {drillStage === 'CIRCUITS_HALTED' ? '$103,420 (SAFE)' : '100% Protected'}
              </div>
              <div className="text-[9px] text-zinc-400">Zero Liquidations</div>
            </div>
          </div>

          {/* Verification Execution Logs */}
          <div className="bg-[#07080d] border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                Deterministic Defense Logs
              </span>
              <span className="text-[10px] text-zinc-500">Sub-millisecond Precision</span>
            </div>

            <div className="bg-black/60 rounded-lg p-2.5 max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono text-zinc-300">
              {logs.length === 0 ? (
                <div className="text-zinc-500 italic">
                  Press &quot;Simulate Flash Crash Drill&quot; to witness Guardian-01 execute defensive response.
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes('EMERGENCY')
                        ? 'text-rose-400 font-bold'
                        : log.includes('ACTION')
                        ? 'text-emerald-400'
                        : 'text-zinc-300'
                    }
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 shrink-0">
          <button
            onClick={() => {
              playCyberClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Drill
          </button>

          {drillStage === 'CIRCUITS_HALTED' ? (
            <button
              onClick={handleResetDrill}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset &amp; Re-Arm Guardian Circuits</span>
            </button>
          ) : (
            <button
              onClick={handleStartDrill}
              disabled={drillStage !== 'IDLE'}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Simulate Flash Crash (-8%)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
