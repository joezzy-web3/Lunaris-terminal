// components/DeterministicKillSwitch.tsx
import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Power,
  RotateCcw,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { playCyberClick } from '@/lib/soundSynth';
import { BlackSwanDrillModal } from '@/components/BlackSwanDrillModal';

interface DeterministicKillSwitchProps {
  onEmergencyKillAll?: () => void;
  onResetSystem?: () => void;
}

export const DeterministicKillSwitch: React.FC<DeterministicKillSwitchProps> = ({
  onEmergencyKillAll,
  onResetSystem,
}) => {
  const [isKilled, setIsKilled] = useState<boolean>(false);
  const [confirmingKill, setConfirmingKill] = useState<boolean>(false);
  const [isDrillOpen, setIsDrillOpen] = useState<boolean>(false);

  const handleTriggerKill = () => {
    playCyberClick();
    if (!confirmingKill) {
      setConfirmingKill(true);
      return;
    }
    setIsKilled(true);
    setConfirmingKill(false);
    if (onEmergencyKillAll) onEmergencyKillAll();
  };

  const handleDisengage = () => {
    playCyberClick();
    setIsKilled(false);
    setConfirmingKill(false);
    if (onResetSystem) onResetSystem();
  };

  return (
    <>
      <div
        className={`border rounded-xl p-4 transition-all duration-300 ${
          isKilled
            ? 'bg-red-950/80 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
            : 'bg-[#0c0c11] border-white/10'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            {isKilled ? (
              <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                DETERMINISTIC RISK CIRCUIT &amp; KILL-SWITCH
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    isKilled
                      ? 'bg-red-500 text-black animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isKilled ? 'CIRCUITS TRIPPED (HALTED)' : 'CIRCUITS ARMED (ACTIVE)'}
                </span>
              </h3>
            </div>
          </div>

          {/* Emergency Kill Switch & Drill Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Interactive Black Swan / Flash Crash Drill Button */}
            <button
              onClick={() => {
                playCyberClick();
                setIsDrillOpen(true);
              }}
              className="flex items-center gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 hover:border-rose-500/60 text-rose-300 hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition-all cursor-pointer uppercase tracking-wider"
              title="Test autonomous defense response with Guardian-01 animated drill"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Flash Crash Drill</span>
            </button>

            {isKilled ? (
              <button
                onClick={handleDisengage}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Disengage &amp; Reset Circuits</span>
              </button>
            ) : confirmingKill ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerKill}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 rounded-lg text-xs transition-all cursor-pointer uppercase tracking-wider animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>CONFIRM EMERGENCY KILL</span>
                </button>
                <button
                  onClick={() => setConfirmingKill(false)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  playCyberClick();
                  setConfirmingKill(true);
                }}
                className="flex items-center gap-2 bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-300 hover:text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer uppercase tracking-wider shadow-[0_0_12px_rgba(239,68,68,0.2)]"
              >
                <Power className="w-4 h-4 text-red-400" />
                <span>Trip Emergency Kill-Switch</span>
              </button>
            )}
          </div>
        </div>

      {/* Safety Invariants Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs font-mono">
        <div className="bg-black/40 border border-white/5 p-2.5 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <div>
            <div className="text-gray-400 text-[10px]">MAX POSITION SIZE</div>
            <div className="text-white font-bold">25.0% Portfolio Cap</div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 p-2.5 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <div>
            <div className="text-gray-400 text-[10px]">DETERMINISTIC STOP-LOSS</div>
            <div className="text-white font-bold">-10.0% Hard Veto Threshold</div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 p-2.5 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <div>
            <div className="text-gray-400 text-[10px]">CROSS-ASSET DELTA CEILING</div>
            <div className="text-white font-bold">&plusmn;1.50 Synthetic Beta Limit</div>
          </div>
        </div>
      </div>
    </div>

      {/* Interactive Black Swan / Flash Crash Emergency Drill Modal */}
      <BlackSwanDrillModal
        isOpen={isDrillOpen}
        onClose={() => setIsDrillOpen(false)}
        onKillswitchTriggered={() => {
          setIsKilled(true);
          if (onEmergencyKillAll) onEmergencyKillAll();
        }}
        onResetSystem={() => {
          setIsKilled(false);
          if (onResetSystem) onResetSystem();
        }}
      />
    </>
  );
};
