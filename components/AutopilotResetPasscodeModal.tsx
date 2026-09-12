import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Lock, CheckCircle2, AlertTriangle, X, Eye, EyeOff, Settings } from 'lucide-react';
import { playCyberClick, playRiskVetoTone, playTradeApprovedChime } from '@/lib/soundSynth';

interface AutopilotResetPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

const DEFAULT_SECRET_KEY = 'chllap5803';

export function AutopilotResetPasscodeModal({
  isOpen,
  onClose,
  onConfirmReset,
}: AutopilotResetPasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [currentKeyInput, setCurrentKeyInput] = useState('');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [customKeySuccess, setCustomKeySuccess] = useState(false);

  if (!isOpen) return null;

  const getActiveSecretKey = (): string => {
    try {
      const custom = localStorage.getItem('LUNARIS_ADMIN_PASSCODE');
      if (custom && custom.trim()) return custom.trim();
    } catch {
      // fallback
    }
    return DEFAULT_SECRET_KEY;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeKey = getActiveSecretKey();
    const normalized = passcode.trim().toLowerCase();

    // Accept either custom key or default master key
    if (
      normalized === activeKey.toLowerCase() ||
      normalized === DEFAULT_SECRET_KEY.toLowerCase()
    ) {
      setIsSuccess(true);
      playTradeApprovedChime();
      setTimeout(() => {
        onConfirmReset();
        setIsSuccess(false);
        setPasscode('');
        onClose();
      }, 700);
    } else {
      playRiskVetoTone();
      setErrorMsg('Access Denied: Invalid Administrative Passcode. Verification failed.');
    }
  };

  const handleSaveNewPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const activeKey = getActiveSecretKey();

    if (
      currentKeyInput.trim().toLowerCase() !== activeKey.toLowerCase() &&
      currentKeyInput.trim().toLowerCase() !== DEFAULT_SECRET_KEY.toLowerCase()
    ) {
      playRiskVetoTone();
      setErrorMsg('Current Passcode incorrect. Cannot update authorization key.');
      return;
    }

    if (!newKeyInput.trim() || newKeyInput.trim().length < 4) {
      playRiskVetoTone();
      setErrorMsg('New passcode must be at least 4 characters long.');
      return;
    }

    try {
      localStorage.setItem('LUNARIS_ADMIN_PASSCODE', newKeyInput.trim());
      setCustomKeySuccess(true);
      playTradeApprovedChime();
      setTimeout(() => {
        setCustomKeySuccess(false);
        setIsCustomizing(false);
        setCurrentKeyInput('');
        setNewKeyInput('');
      }, 1200);
    } catch {
      setErrorMsg('Failed to save to local storage.');
    }
  };

  const handleClose = () => {
    playCyberClick();
    setPasscode('');
    setShowPasscode(false);
    setErrorMsg(null);
    setIsSuccess(false);
    setIsCustomizing(false);
    setCurrentKeyInput('');
    setNewKeyInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl overflow-hidden">
        {/* Top Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-[#00F0FF]" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              AUTOPILOT LEDGER RESET
            </h3>
            <p className="text-xs text-zinc-400">
              Administrative Passcode Verification Required
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5 mb-4 text-xs text-zinc-300 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>PROTECTED BALANCE & LEDGER STORAGE</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Your Autopilot balance and transaction ledger are permanently stored across browser sessions. 
            To prevent unauthorized erasure or accidental balance reset, input your authorization key.
          </p>
          <div className="pt-1 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Privileged administrative clearance required.</span>
            <button
              type="button"
              onClick={() => {
                playCyberClick();
                setIsCustomizing(!isCustomizing);
                setErrorMsg(null);
              }}
              className="text-[#00F0FF] hover:underline text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>{isCustomizing ? 'Back to Reset' : 'Change Key'}</span>
            </button>
          </div>
        </div>

        {isCustomizing ? (
          /* Change Passcode Form */
          <form onSubmit={handleSaveNewPasscode} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Current Authorization Key
              </label>
              <input
                type="password"
                value={currentKeyInput}
                onChange={(e) => {
                  setCurrentKeyInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter existing authorization key..."
                className="w-full bg-black/60 border border-zinc-700 focus:border-[#00F0FF] focus:outline-none text-white text-sm px-3.5 py-2 rounded-lg tracking-wider placeholder:text-zinc-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                New Custom Authorization Key
              </label>
              <input
                type="password"
                value={newKeyInput}
                onChange={(e) => {
                  setNewKeyInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Create new private secret key..."
                className="w-full bg-black/60 border border-zinc-700 focus:border-[#00F0FF] focus:outline-none text-white text-sm px-3.5 py-2 rounded-lg tracking-wider placeholder:text-zinc-600 font-mono"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {customKeySuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Authorization key successfully updated!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!currentKeyInput.trim() || !newKeyInput.trim() || customKeySuccess}
                className="px-3.5 py-1.5 text-xs font-bold text-black bg-[#00F0FF] hover:bg-[#38f6ff] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer transition-colors"
              >
                Save New Key
              </button>
            </div>
          </form>
        ) : (
          /* Reset Verification Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Enter Authorization Key</span>
                <KeyRound className="w-3.5 h-3.5 text-[#00F0FF]" />
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter secret authorization key..."
                  className="w-full bg-black/60 border border-zinc-700 focus:border-[#00F0FF] focus:outline-none text-white text-sm px-3.5 py-2.5 pr-10 rounded-lg tracking-wider placeholder:text-zinc-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Passcode Verified. Resetting balance and ledger to baseline...</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!passcode.trim() || isSuccess}
                className="px-4 py-2 text-xs font-bold text-black bg-[#00F0FF] hover:bg-[#38f6ff] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.25)] flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Verify & Reset</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
