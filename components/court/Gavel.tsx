// components/court/Gavel.tsx
import React from 'react';
import { COURT_THEME, hexToRgba } from './courtTheme';

export interface GavelProps {
  angle?: number; // degrees
  ringOpacity?: number;
  ringScale?: number;
}

export const Gavel: React.FC<GavelProps> = ({
  angle = COURT_THEME.gavel.restAngle,
  ringOpacity = 0,
  ringScale = 0.2,
}) => {
  const G = COURT_THEME.gavel;
  const guardian = COURT_THEME.cast.guardian;
  const magenta = COURT_THEME.color.magenta;

  return (
    <>
      {/* Sound Block on high bench */}
      <div
        style={{
          position: 'absolute',
          left: '1172px',
          top: '432px',
          width: '76px',
          height: '9px',
          background: '#4a4c5c',
          borderRadius: '4px 4px 0 0',
        }}
      />

      {/* Impact shockwave ring expanding from sound block */}
      <div
        style={{
          position: 'absolute',
          left: `${G.blockX}px`,
          top: `${G.blockY}px`,
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: '5px solid #ffffff',
          boxSizing: 'border-box',
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity: ringOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Guardian arm holding gavel */}
      <div
        style={{
          position: 'absolute',
          left: '1000px',
          top: '372px',
          width: '100px',
          height: '44px',
          borderRadius: '22px',
          background: '#16171f',
          boxShadow: `inset 0 3px 0 ${hexToRgba(magenta, 0.5)}`,
        }}
      />

      {/* Gavel pivot */}
      <div
        style={{
          position: 'absolute',
          left: `${G.pivotX}px`,
          top: `${G.pivotY}px`,
          width: 0,
          height: 0,
          transformOrigin: '0 0',
          transform: `rotate(${angle}deg)`,
          transition: 'transform 0.05s linear',
        }}
      >
        {/* Handle */}
        <div
          style={{
            position: 'absolute',
            left: '-7px',
            top: '-118px',
            width: '14px',
            height: '128px',
            background: 'linear-gradient(90deg, #f4f0e6, #c4bdac)',
            borderRadius: '7px',
          }}
        />
        {/* Head */}
        <div
          style={{
            position: 'absolute',
            left: '-48px',
            top: '-150px',
            width: '96px',
            height: '50px',
            borderRadius: '10px',
            background: guardian.gradient,
            boxShadow: `0 0 30px ${hexToRgba(magenta, 0.5)}, inset 12px 0 0 rgba(255, 255, 255, 0.35), inset -12px 0 0 rgba(255, 255, 255, 0.35)`,
          }}
        />
      </div>

      {/* Hand disc over the pivot */}
      <div
        style={{
          position: 'absolute',
          left: `${G.pivotX}px`,
          top: `${G.pivotY}px`,
          transform: 'translate(-50%, -50%)',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: guardian.gradient,
          boxShadow: `0 0 12px ${hexToRgba(magenta, 0.4)}`,
        }}
      />
    </>
  );
};
