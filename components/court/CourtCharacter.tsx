// components/court/CourtCharacter.tsx
import React, { useMemo } from 'react';
import { COURT_THEME, CharacterEyeState, hexToRgba, CastCharacterId } from './courtTheme';

export interface CourtCharacterProps {
  id: CastCharacterId;
  eyeState?: CharacterEyeState;
  headOffset?: { x?: number; y?: number; rot?: number; scale?: number };
  rootOffset?: { x?: number; y?: number; scale?: number };
  customX?: number;
  customY?: number;
  customSize?: number;
  customBodyWidth?: number;
  customRobeHeight?: number;
  hideRobe?: boolean;
}

export const CourtCharacter: React.FC<CourtCharacterProps> = ({
  id,
  eyeState,
  headOffset,
  rootOffset,
  customX,
  customY,
  customSize,
  customBodyWidth,
  customRobeHeight,
  hideRobe = false,
}) => {
  const hOff = headOffset || {};
  const rOff = rootOffset || {};
  const c = COURT_THEME.cast[id];
  const S = customSize ?? c.size;
  const R = S * 0.54; // eye diameter
  const mid = S / 2;
  const posX = customX ?? c.x;
  const posY = customY ?? c.y;
  const bw = customBodyWidth ?? c.bodyWidth;
  const bodyTop = posY + S * 0.48;
  const robeH = customRobeHeight ?? (c.deskY - bodyTop + 160);

  // Merge default rest eye state with passed eyeState
  const effectiveEye = useMemo(() => {
    return {
      look: eyeState?.look ?? c.rest.look ?? [0, 0],
      lid: eyeState?.lid ?? c.rest.lid ?? 0,
      lidTilt: eyeState?.lidTilt ?? (c.rest as any).lidTilt ?? 0,
      pupilScale: eyeState?.pupilScale ?? c.rest.pupilScale ?? 1,
    };
  }, [eyeState, c.rest]);

  // Compute wig curls for Atlas-Macro
  const wigCurls = useMemo(() => {
    if (c.accessory !== 'wig') return null;
    const hd = S * 0.69;
    const r = S * 0.15;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      pts.push([-hd + hd * t - 6 * (1 - t), -hd * t - 8]);
    }
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      pts.push([hd * t + 6 * t, -hd + hd * t - 8]);
    }
    [
      [-hd - 4, 0.2],
      [-hd + 2, 0.48],
      [-hd + 12, 0.74],
    ].forEach(([px, ty]) => {
      pts.push([px, S * ty]);
      pts.push([-px, S * ty]);
    });
    return { r, pts };
  }, [c.accessory, S]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        transform: `translate(${rOff.x || 0}px, ${rOff.y || 0}px) scale(${rOff.scale ?? 1})`,
        pointerEvents: 'none',
      }}
    >
      {/* 1. ROBE (Sitting below head) */}
      {!hideRobe && (
        <div
          style={{
            position: 'absolute',
            left: `${posX - bw / 2}px`,
            top: `${bodyTop}px`,
            width: `${bw}px`,
            height: `${robeH}px`,
            borderRadius: `${bw * 0.42}px ${bw * 0.42}px 0 0`,
            background: 'linear-gradient(180deg, #1d1e28, #0b0b10)',
            boxShadow: `inset 0 3px 0 ${hexToRgba(c.color, 0.55)}`,
            overflow: 'hidden',
          }}
        >
          {/* Centre accent stripe */}
          <div
            style={{
              position: 'absolute',
              left: `${bw / 2 - 36}px`,
              top: 0,
              width: '72px',
              height: '500px',
              background: `linear-gradient(180deg, ${hexToRgba(c.color, 0.55)}, ${hexToRgba(c.color, 0.14)})`,
            }}
          />
          {/* Left collar tab */}
          <div
            style={{
              position: 'absolute',
              left: `${bw / 2 - 31}px`,
              top: `${S * 0.2}px`,
              width: '27px',
              height: '70px',
              background: '#f1ede4',
              borderRadius: '4px 4px 6px 12px',
              transform: 'rotate(7deg)',
            }}
          />
          {/* Right collar tab */}
          <div
            style={{
              position: 'absolute',
              left: `${bw / 2 + 4}px`,
              top: `${S * 0.2}px`,
              width: '27px',
              height: '70px',
              background: '#f1ede4',
              borderRadius: '4px 4px 12px 6px',
              transform: 'rotate(-7deg)',
            }}
          />
        </div>
      )}

      {/* 2. HEAD (Rotated square diamond + eye + accessories) */}
      <div
        style={{
          position: 'absolute',
          left: `${posX}px`,
          top: `${posY}px`,
          width: `${S}px`,
          height: `${S}px`,
          transform: `translate(-50%, -50%) translate(${hOff.x || 0}px, ${hOff.y || 0}px) rotate(${
            hOff.rot || 0
          }deg) scale(${hOff.scale ?? 1})`,
        }}
      >
        {/* Diamond Head body */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${S}px`,
            height: `${S}px`,
            borderRadius: '17%',
            transform: 'rotate(45deg)',
            background: c.gradient,
            boxShadow: `0 0 ${S * 0.45}px ${hexToRgba(c.color, 0.38)}`,
          }}
        />

        {/* Mask accessory sits BEHIND eye (Nexus-Red) */}
        {c.accessory === 'mask' && (
          <div
            style={{
              position: 'absolute',
              left: `${mid}px`,
              top: `${mid}px`,
              transform: 'translate(-50%, -50%)',
              width: `${S * 1.04}px`,
              height: `${S * 0.3}px`,
              background: '#1c0b0e',
              borderRadius: '99px',
            }}
          />
        )}

        {/* Round Eye container with white 60% fill */}
        <div
          style={{
            position: 'absolute',
            left: `${mid}px`,
            top: `${mid}px`,
            transform: 'translate(-50%, -50%)',
            width: `${R}px`,
            height: `${R}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          {/* Pupil */}
          <div
            style={{
              position: 'absolute',
              left: `${R / 2}px`,
              top: `${R / 2}px`,
              width: `${R * 0.58}px`,
              height: `${R * 0.58}px`,
              borderRadius: '50%',
              background: '#000000',
              transform: `translate(-50%, -50%) translate(${effectiveEye.look[0] * R * 0.17}px, ${
                effectiveEye.look[1] * R * 0.17
              }px) scale(${effectiveEye.pupilScale})`,
              transition: 'transform 0.08s ease-out',
            }}
          >
            {/* White specular highlight dot */}
            <div
              style={{
                position: 'absolute',
                left: `${R * 0.36}px`,
                top: `${R * 0.12}px`,
                width: `${R * 0.11}px`,
                height: `${R * 0.11}px`,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
              }}
            />
          </div>

          {/* Eyelid parked above eye, sliding down */}
          <div
            style={{
              position: 'absolute',
              left: `${-R * 0.3}px`,
              top: `${-R}px`,
              width: `${R * 1.6}px`,
              height: `${R}px`,
              background: c.lid,
              transformOrigin: '50% 100%',
              transform: `translateY(${effectiveEye.lid * R}px) rotate(${effectiveEye.lidTilt}deg)`,
              transition: 'transform 0.08s ease-out',
            }}
          />
        </div>

        {/* Visor accessory (Quant-Omega) */}
        {c.accessory === 'visor' && (
          <>
            <div
              style={{
                position: 'absolute',
                left: `${mid - S * 0.5}px`,
                top: `${mid - S * 0.31}px`,
                width: `${S}px`,
                height: `${S * 0.21}px`,
                borderRadius: `0 0 ${S * 0.5}px ${S * 0.5}px / 0 0 ${S * 0.21}px ${S * 0.21}px`,
                background: 'linear-gradient(180deg, rgba(6, 58, 70, 0.95), rgba(6, 58, 70, 0.4))',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${mid}px`,
                top: `${mid - S * 0.33}px`,
                transform: 'translate(-50%, -50%)',
                width: `${S * 0.84}px`,
                height: `${S * 0.1}px`,
                borderRadius: '99px',
                background: '#07313b',
                boxShadow: 'inset 0 2px 0 rgba(255, 255, 255, 0.25)',
              }}
            />
          </>
        )}

        {/* Judge wig + Monocle (Atlas-Macro) */}
        {c.accessory === 'wig' && wigCurls && (
          <>
            {wigCurls.pts.map(([px, py], idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${mid + px}px`,
                  top: `${mid + py}px`,
                  transform: 'translate(-50%, -50%)',
                  width: `${wigCurls.r * 2}px`,
                  height: `${wigCurls.r * 2}px`,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 40% 35%, #fffaf0, #e6decd 68%, #cbc2ae)',
                  boxShadow: '0 2px 0 rgba(0, 0, 0, 0.2)',
                }}
              />
            ))}
            {/* Monocle ring */}
            <div
              style={{
                position: 'absolute',
                left: `${mid}px`,
                top: `${mid}px`,
                transform: 'translate(-50%, -50%)',
                width: `${R * 1.24}px`,
                height: `${R * 1.24}px`,
                borderRadius: '50%',
                border: '5px solid #fff0b8',
                boxSizing: 'border-box',
              }}
            />
            {/* Monocle chain */}
            <div
              style={{
                position: 'absolute',
                left: `${mid + R * 0.58}px`,
                top: `${mid + R * 0.3}px`,
                width: '3px',
                height: `${S * 0.5}px`,
                background: '#fff0b8',
                transformOrigin: '0 0',
                transform: 'rotate(-24deg)',
                borderRadius: '2px',
              }}
            />
          </>
        )}

        {/* Flat cap (Guardian-01) */}
        {c.accessory === 'cap' && (
          <div
            style={{
              position: 'absolute',
              left: `${mid}px`,
              top: `${mid - S * 0.6}px`,
              transform: 'translate(-50%, -50%)',
              width: `${S * 0.56}px`,
              height: `${S * 0.17}px`,
              borderRadius: '8px 8px 4px 4px',
              background: '#101014',
              boxShadow: `inset 0 -4px 0 ${COURT_THEME.color.magenta}`,
            }}
          />
        )}
      </div>
    </div>
  );
};
