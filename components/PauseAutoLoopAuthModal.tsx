import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldAlert, CheckCircle2, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import { verifyOperatorPasscode } from '@/lib/authGuard';
import { playCyberClick, playRiskVetoTone, playTradeApprovedChime } from '@/lib/soundSynth';

interface PauseAutoLoopAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export function PauseAutoLoopAuthModal({
  isOpen,
  onClose,
  onAuthenticated,
}: PauseAutoLoopAuthModalProps) {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
      setIsSuccess(false);
      setIsVerifying(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle ESC key to dismiss without pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isVerifying || isSuccess) return;

    setErrorMsg(null);
    setIsVerifying(true);

    try {
      const isValid = await verifyOperatorPasscode(passcode);
      if (isValid) {
        setIsSuccess(true);
        playTradeApprovedChime();
        setTimeout(() => {
          onAuthenticated();
          onClose();
        }, 600);
      } else {
        playRiskVetoTone();
        setErrorMsg('Access Denied: Invalid Authorization Passcode.');
        setPasscode('');
        inputRef.current?.focus();
      }
    } catch {
      playRiskVetoTone();
      setErrorMsg('Authentication error. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      id="modal-pause-autoloop-auth"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playCyberClick();
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-[#0c0e14] border border-amber-500/30 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 font-mono">
        {/* Close Button */}
        <button
          id="btn-close-pause-auth-modal"
          onClick={() => {
            playCyberClick();
            onClose();
          }}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
          title="Dismiss without pausing"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Authentication Required
            </h3>
            <p className="text-xs text-zinc-400">
              Operator verification to pause autonomous trade execution
            </p>
          </div>
        </div>

        {/* Notice Description */}
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90 mb-5 leading-relaxed">
          The 7×24 autonomous trading loop is actively recording trades to the verified audit ledger. Halting execution requires authorized operator credentials.
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Authorization Passcode</span>
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="input-pause-auth-passcode"
                type={showPassword ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                disabled={isVerifying || isSuccess}
                placeholder="Enter authorization passcode..."
                className="w-full bg-black/70 border border-zinc-700 focus:border-amber-400 focus:outline-none text-white text-sm px-3.5 py-2.5 pr-10 rounded-lg tracking-wider placeholder:text-zinc-600 font-mono disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                title={showPassword ? 'Hide passcode' : 'Show passcode'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              <span>Identity Verified. Pausing autonomous trading loop...</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              id="btn-cancel-pause-auth"
              type="button"
              onClick={() => {
                playCyberClick();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel (Keep Running)
            </button>
            <button
              id="btn-submit-pause-auth"
              type="submit"
              disabled={!passcode.trim() || isVerifying || isSuccess}
              className="px-4 py-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.25)] flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying...' : 'Authenticate & Pause'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
