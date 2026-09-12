import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Key, Eye, EyeOff, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { verifyAdminPasscode } from '../lib/adminAuth';
import { playCyberClick, playTradeApprovedChime, playRiskVetoTone } from '@/lib/soundSynth';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passcode: string) => void;
  actionTitle?: string;
  actionDescription?: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'ADMINISTRATIVE AUTHORIZATION REQUIRED',
  actionDescription = 'Enter the master administrative passcode to modify 24/7 engine state or reset the verified paper-trading ledger.',
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the security passcode.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await verifyAdminPasscode(passcode.trim());
    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      playTradeApprovedChime();
      setTimeout(() => {
        setIsSuccess(false);
        setPasscode('');
        onSuccess(passcode.trim());
      }, 700);
    } else {
      playRiskVetoTone();
      setError(result.error || 'Access Denied: Invalid security passcode.');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-mono animate-fadeIn">
      <div className="bg-[#0b0d14] border border-[#00F0FF]/40 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.25)] space-y-4 sm:space-y-5 relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            playCyberClick();
            setError(null);
            setPasscode('');
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 pr-6">
          <div className="p-2.5 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] shrink-0 mt-0.5 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wider leading-snug">
              {actionTitle}
            </h3>
            <p className="text-[10px] text-[#00F0FF]/90 font-mono mt-0.5 uppercase tracking-wider font-bold">
              Bitget AI Edition // Track 2 Access Control
            </p>
          </div>
        </div>

        {/* Description Warning Box */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 text-xs text-gray-300 leading-relaxed font-mono">
          <span className="text-[#00F0FF] font-bold mr-1.5">[SPECTATOR LOCK]:</span>
          {actionDescription}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>Security Passcode:</span>
              </span>
              <span className="text-gray-500 font-normal text-[10px]">Case-Insensitive</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type={showPasscode ? 'text' : 'password'}
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(null);
                }}
                placeholder="Enter admin passcode"
                className="w-full pl-9 pr-10 py-2.5 bg-black/70 border border-white/20 focus:border-[#00F0FF] rounded-xl text-white text-sm outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-[#00F0FF] shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                title={showPasscode ? 'Hide passcode' : 'Show passcode'}
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl flex items-center gap-2.5 text-red-300 text-xs animate-shake font-mono">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Authorization verified! Access clearance granted.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                playCyberClick();
                setError(null);
                setPasscode('');
                onClose();
              }}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/10"
            >
              Cancel (Spectator)
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="flex-1 py-2.5 bg-[#00F0FF] hover:bg-[#38f6ff] text-black font-black rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>AUTHORIZE & PROCEED</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Always portal directly to document.body to escape header's backdrop-filter containing block
  if (mounted && typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
