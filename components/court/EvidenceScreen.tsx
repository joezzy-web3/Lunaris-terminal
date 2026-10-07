// components/court/EvidenceScreen.tsx
import React from 'react';
import { COURT_THEME, hexToRgba } from './courtTheme';

export interface EvidenceScreenProps {
  ticker?: string;
  isDisputed?: boolean;
  disputeText?: string;
  isCrashMode?: boolean;
  activeExhibit?: 'ORDERBOOK' | 'FUNDING' | 'MACRO' | 'PRICE';
  currentPrice?: number;
}

export const EvidenceScreen: React.FC<EvidenceScreenProps> = ({
  ticker = 'SOL',
  isDisputed = false,
  disputeText = 'bid wall',
  isCrashMode = false,
  activeExhibit = 'ORDERBOOK',
  currentPrice,
}) => {
  const S = COURT_THEME.screen;
  const C = COURT_THEME.color;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${S.x}px`,
        top: `${S.y}px`,
        width: `${S.w}px`,
        height: `${S.h}px`,
        borderRadius: '14px',
        background: '#06070b',
        border: isCrashMode ? `3px solid ${C.crash}` : '3px solid rgba(255, 255, 255, 0.22)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: isCrashMode ? `0 0 30px ${hexToRgba(C.crash, 0.4)}` : '0 8px 30px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Exhibit header */}
      <div
        className="mono"
        style={{
          position: 'absolute',
          left: '16px',
          top: '13px',
          fontSize: '17px',
          color: isCrashMode ? C.crash : C.muted,
          fontWeight: 600,
        }}
      >
        {isCrashMode
          ? `CRASH ANOMALY: ${ticker} DUMP`
          : activeExhibit === 'FUNDING'
          ? `Exhibit B: ${ticker} 8h Funding Rate`
          : `Exhibit A: ${ticker} order book`}
      </div>

      {isCrashMode ? (
        // Crash Mode visualization
        <div style={{ position: 'absolute', inset: '40px 16px 16px 16px' }}>
          <svg width="388" height="200" viewBox="0 0 388 200">
            <path
              d="M 10 30 L 70 45 L 130 95 L 190 80 L 260 160 L 320 150 L 380 190"
              fill="none"
              stroke={C.crash}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 10 30 L 70 45 L 130 95 L 190 80 L 260 160 L 320 150 L 380 190 L 380 200 L 10 200 Z"
              fill={`url(#crashGrad)`}
              opacity="0.25"
            />
            <defs>
              <linearGradient id="crashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.crash} />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
          <div
            className="mono"
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              fontSize: '13px',
              color: C.crash,
              fontWeight: 700,
              background: 'rgba(255, 77, 109, 0.15)',
              padding: '4px 8px',
              borderRadius: '4px',
              border: `1px solid ${C.crash}`,
            }}
          >
            STRESS EVENT: -15.4% LIQUIDATION CASCADE
          </div>
        </div>
      ) : (
        // Standard Exhibit Order Book
        <>
          {/* Asks (Coral) */}
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '50px',
              width: '70px',
              height: '18px',
              background: hexToRgba(C.coral, 0.75),
              borderRadius: '3px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '74px',
              width: '120px',
              height: '18px',
              background: hexToRgba(C.coral, 0.75),
              borderRadius: '3px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '98px',
              width: '56px',
              height: '18px',
              background: hexToRgba(C.coral, 0.75),
              borderRadius: '3px',
            }}
          />

          {/* Spread Mid-line */}
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '128px',
              width: '388px',
              height: '2px',
              background: 'rgba(255, 255, 255, 0.18)',
            }}
          />

          {/* Bids (Cyan) */}
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '146px',
              width: '96px',
              height: '18px',
              background: hexToRgba(C.cyan, 0.75),
              borderRadius: '3px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '170px',
              width: '140px',
              height: '18px',
              background: hexToRgba(C.cyan, 0.75),
              borderRadius: '3px',
            }}
          />

          {/* Prominent Bid Wall */}
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '194px',
              width: '372px',
              height: '36px',
              background: C.cyan,
              borderRadius: '4px',
              boxShadow: `0 0 24px ${hexToRgba(C.cyan, 0.6)}`,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '12px',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '18px',
                color: '#04252b',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {disputeText}
            </span>
            {currentPrice && (
              <span
                className="mono"
                style={{
                  marginLeft: 'auto',
                  marginRight: '12px',
                  fontSize: '14px',
                  color: '#04252b',
                  opacity: 0.8,
                }}
              >
                ${currentPrice.toLocaleString()}
              </span>
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '236px',
              width: '84px',
              height: '18px',
              background: hexToRgba(C.cyan, 0.75),
              borderRadius: '3px',
            }}
          />

          {/* Disputed highlighted frame when Nexus-Red objects */}
          {isDisputed && (
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '186px',
                width: '392px',
                height: '52px',
                border: `3px dashed ${C.red}`,
                borderRadius: '8px',
                boxSizing: 'border-box',
                animation: 'pulse 1s infinite alternate',
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
