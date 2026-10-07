// components/court/CaseFile.tsx
import React from 'react';
import { COURT_THEME, hexToRgba } from './courtTheme';

export interface CaseFileProps {
  caseNumber?: string;
  ticker?: string;
  action?: 'BUY' | 'SELL' | 'HOLD';
  leverage?: string;
  sizePct?: number;
  entryPrice?: number;
  targetExitPrice?: number;
  stopLossPrice?: number;
  takeProfitPct?: number;
  stopLossPct?: number;
  executionType?: string;
  stamp?: 'NONE' | 'VETO' | 'APPROVED';
  stampScale?: number;
  stampOpacity?: number;
  xOffset?: number;
  rotOffset?: number;
  opacity?: number;
  proofHash?: string;
  onOpenProof?: () => void;
}

export const CaseFile: React.FC<CaseFileProps> = ({
  caseNumber = 'Case #3570',
  ticker = 'SOL',
  action = 'BUY',
  leverage = 'requested: 10x leverage',
  sizePct = 12,
  entryPrice,
  targetExitPrice,
  stopLossPrice,
  takeProfitPct,
  stopLossPct,
  executionType,
  stamp = 'NONE',
  stampScale = 1,
  stampOpacity = 0,
  xOffset = 0,
  rotOffset = 0,
  opacity = 1,
  proofHash,
  onOpenProof,
}) => {
  const F = COURT_THEME.caseFile;
  const magenta = COURT_THEME.color.magenta;
  const actionText = action === 'BUY' ? 'Long' : action === 'SELL' ? 'Short' : 'Neutral';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${F.x}px`,
        top: `${F.y}px`,
        width: `${F.w}px`,
        height: `${F.h}px`,
        transform: `translate(-50%, -50%) translate(${xOffset}px, 0px) rotate(${rotOffset}deg)`,
        opacity,
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #f8f6f0, #ded9cd)',
        boxShadow: '0 16px 45px rgba(0, 0, 0, 0.7)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: 25,
        border: '1px solid rgba(255, 255, 255, 0.4)',
      }}
    >
      {/* Top Meta Bar */}
      <div
        className="mono"
        style={{
          position: 'absolute',
          left: '28px',
          top: '16px',
          fontSize: '16px',
          color: '#555966',
          fontWeight: 700,
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span>{caseNumber}</span>
        <span style={{ opacity: 0.5 }}>//</span>
        <span style={{ color: '#2563eb' }}>HIGH COURT DOCKET</span>
      </div>

      {/* Trade Proposal Header */}
      <div
        style={{
          position: 'absolute',
          left: '26px',
          top: '44px',
          fontSize: '34px',
          fontWeight: 800,
          color: '#0e1017',
          whiteSpace: 'nowrap',
          lineHeight: 1,
          fontFamily: 'var(--display)',
          letterSpacing: '-0.02em',
        }}
      >
        {actionText} {ticker}
        {sizePct ? (
          <span style={{ fontSize: '20px', opacity: 0.7, fontWeight: 600, marginLeft: '12px' }}>
            ({sizePct}% NAV)
          </span>
        ) : null}
      </div>

      {/* Explicit Order Terms & Pricing */}
      <div
        className="mono"
        style={{
          position: 'absolute',
          left: '28px',
          top: '90px',
          fontSize: '15px',
          color: '#1e2433',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'nowrap',
          maxWidth: '560px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {entryPrice ? (
          <>
            <span style={{ color: '#0369a1' }}>
              Entry: ${entryPrice.toLocaleString()} {executionType === 'LIMIT_PULLBACK' ? '[Limit]' : '[Market]'}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ color: '#047857' }}>
              TP: ${targetExitPrice ? targetExitPrice.toLocaleString() : '---'} (+{takeProfitPct || 11.5}%)
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ color: '#be123c' }}>
              SL: ${stopLossPrice ? stopLossPrice.toLocaleString() : '---'} (-{stopLossPct || 4.2}%)
            </span>
          </>
        ) : (
          <span>{leverage}</span>
        )}
      </div>

      {/* Cryptographic Proof Link Button on right */}
      {onOpenProof && (
        <button
          onClick={onOpenProof}
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            background: 'rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#1e293b',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          [SHA-256 SEAL]
        </button>
      )}

      {/* VETO STAMP */}
      {stamp === 'VETO' && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) rotate(-8deg) scale(${stampScale})`,
            opacity: stampOpacity,
            fontSize: '76px',
            fontWeight: 900,
            letterSpacing: '0.12em',
            color: '#c12bd6',
            border: '8px solid #c12bd6',
            borderRadius: '14px',
            padding: '4px 28px',
            lineHeight: 1,
            boxShadow: `0 0 50px ${hexToRgba(magenta, 0.6)}`,
            background: 'rgba(246, 243, 236, 0.65)',
            pointerEvents: 'none',
            userSelect: 'none',
            backdropFilter: 'blur(2px)',
          }}
        >
          VETO
        </div>
      )}

      {/* APPROVED STAMP */}
      {stamp === 'APPROVED' && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) rotate(-4deg) scale(${stampScale})`,
            opacity: stampOpacity,
            fontSize: '64px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: '#059669',
            border: '7px solid #059669',
            borderRadius: '14px',
            padding: '4px 22px',
            lineHeight: 1,
            boxShadow: `0 0 45px rgba(5, 150, 105, 0.55)`,
            background: 'rgba(246, 243, 236, 0.65)',
            pointerEvents: 'none',
            userSelect: 'none',
            backdropFilter: 'blur(2px)',
          }}
        >
          APPROVED
        </div>
      )}
    </div>
  );
};
