import React, { useState } from 'react';
import { Lock, Unlock, LogOut } from 'lucide-react';
import { useAdminAuth } from '../lib/adminAuth';
import { AdminAuthModal } from './AdminAuthModal';
import { playCyberClick } from '@/lib/soundSynth';

interface SpectatorModeBadgeProps {
  className?: string;
  onAuthorizedAction?: () => void;
}

export const SpectatorModeBadge: React.FC<SpectatorModeBadgeProps> = ({ className = '', onAuthorizedAction }) => {
  const { isAuthenticated, logout } = useAdminAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className={`flex items-center font-mono ${className}`}>
        {isAuthenticated ? (
          <div className="text-[10px] font-extrabold text-[#00F0FF] border border-[#00F0FF]/50 px-2 py-0.5 rounded bg-[#00F0FF]/15 uppercase shadow-[0_0_8px_rgba(0,240,255,0.25)] tracking-wider flex items-center gap-1.5 whitespace-nowrap">
            <Unlock className="w-2.5 h-2.5 text-[#00F0FF]" />
            <span>Admin Access</span>
            <button
              onClick={() => {
                playCyberClick();
                logout();
              }}
              title="Lock session & return to Spectator Mode"
              className="ml-1 pl-1.5 border-l border-[#00F0FF]/40 text-[#00F0FF]/70 hover:text-white flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-2.5 h-2.5" />
              <span className="text-[9px]">LOCK</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              playCyberClick();
              setIsModalOpen(true);
            }}
            title="Terminal in Public Spectator Mode. Click to enter administrator passcode."
            className="text-[10px] font-extrabold text-[#00F0FF] hover:text-white border border-[#00F0FF]/40 hover:border-[#00F0FF] px-2 py-0.5 rounded bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 uppercase shadow-[0_0_8px_rgba(0,240,255,0.25)] hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] tracking-wider flex items-center gap-1.5 transition-all cursor-pointer group whitespace-nowrap"
          >
            <Lock className="w-2.5 h-2.5 text-[#00F0FF] group-hover:scale-110 transition-transform" />
            <span>Spectator Mode</span>
          </button>
        )}
      </div>

      <AdminAuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          if (onAuthorizedAction) onAuthorizedAction();
        }}
        actionTitle="ADMINISTRATIVE AUTHORIZATION"
        actionDescription="Terminal 24/7 autonomous loop is guarded against unauthorized modification. Please enter the administrator access key to modify loop controls."
      />
    </>
  );
};
