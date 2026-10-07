// components/court/CourtStage.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { COURT_THEME, CharacterEyeState, CastCharacterId, hexToRgba } from './courtTheme';
import { CourtCharacter } from './CourtCharacter';
import { Gavel } from './Gavel';
import { EvidenceScreen } from './EvidenceScreen';
import { CaseFile } from './CaseFile';
import { SpeechBubble } from './SpeechBubble';

export interface CourtStageProps {
  // Override or debug eye states
  customEyeStates?: Partial<Record<CastCharacterId, CharacterEyeState>>;
  // Camera zoom & shake
  cameraZoom?: number;
  cameraFocus?: { x: number; y: number };
  cameraShake?: { x: number; y: number };
  // Visual states
  caption?: string;
  gavelAngle?: number;
  gavelRingOpacity?: number;
  gavelRingScale?: number;
  caseFileOffset?: { x: number; rot: number };
  caseFileStamp?: 'NONE' | 'VETO' | 'APPROVED';
  caseFileStampScale?: number;
  caseFileStampOpacity?: number;
  proofHash?: string;
  ticker?: string;
  tradeAction?: 'BUY' | 'SELL' | 'HOLD';
  leverageText?: string;
  sizePct?: number;
  targetEntryPrice?: number;
  targetExitPrice?: number;
  stopLossPrice?: number;
  takeProfitPct?: number;
  stopLossPct?: number;
  executionType?: string;
  voteBadges?: {
    quant?: { visible: boolean; approved: boolean };
    atlas?: { visible: boolean; approved: boolean };
    nexus?: { visible: boolean; approved: boolean };
  };
  activeBubbles?: {
    who: CastCharacterId;
    text: string;
    speakerLabel?: string;
    x: number;
    y: number;
    tail: number;
    size: number;
    opacity: number;
    scale: number;
  }[];
  // Evidence screen state
  isScreenDisputed?: boolean;
  isCrashMode?: boolean;
  currentPrice?: number;
  // Flash overlay
  flashColor?: string;
  flashOpacity?: number;
  // Character head offsets (e.g. for speaking bob)
  headOffsets?: Partial<Record<CastCharacterId, { x?: number; y?: number; rot?: number; scale?: number }>>;
  rootOffsets?: Partial<Record<CastCharacterId, { x?: number; y?: number; scale?: number }>>;
  // Callbacks
  onOpenProofModal?: () => void;
  // Debug panel switch (for Step 1 review)
  showDebugPanel?: boolean;
}

export const CourtStage: React.FC<CourtStageProps> = ({
  customEyeStates,
  cameraZoom = 1,
  cameraFocus = { x: 960, y: 560 },
  cameraShake = { x: 0, y: 0 },
  caption = 'The court is ready.',
  gavelAngle = COURT_THEME.gavel.restAngle,
  gavelRingOpacity = 0,
  gavelRingScale = 0.2,
  caseFileOffset = { x: 0, rot: 0 },
  caseFileStamp = 'NONE',
  caseFileStampScale = 1,
  caseFileStampOpacity = 0,
  proofHash,
  ticker = 'SOL',
  tradeAction = 'BUY',
  leverageText = 'requested: 10x leverage',
  sizePct = 12,
  targetEntryPrice,
  targetExitPrice,
  stopLossPrice,
  takeProfitPct,
  stopLossPct,
  executionType,
  voteBadges = {
    quant: { visible: false, approved: true },
    atlas: { visible: false, approved: true },
    nexus: { visible: false, approved: false },
  },
  activeBubbles = [],
  isScreenDisputed = false,
  isCrashMode = false,
  currentPrice,
  flashColor = '#ffffff',
  flashOpacity = 0,
  headOffsets,
  rootOffsets,
  onOpenProofModal,
  showDebugPanel = true,
}) => {
  const hOffsets = headOffsets || {};
  const rOffsets = rootOffsets || {};
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Debug panel state for Step 1 review
  const [debugChar, setDebugChar] = useState<CastCharacterId>('guardian');
  const [debugEye, setDebugEye] = useState<Record<CastCharacterId, CharacterEyeState>>({
    guardian: { ...COURT_THEME.cast.guardian.rest },
    gemini: { ...COURT_THEME.cast.gemini.rest },
    quant: { ...COURT_THEME.cast.quant.rest },
    atlas: { ...COURT_THEME.cast.atlas.rest },
    nexus: { ...COURT_THEME.cast.nexus.rest },
  });
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // ResizeObserver to scale the 1920x1080 design canvas to parent container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const containerWidth = el.clientWidth;
      if (containerWidth > 0) {
        setScale(containerWidth / COURT_THEME.canvas.width);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const C = COURT_THEME.color;
  const cast = COURT_THEME.cast;

  // Active eye states merging external customEyeStates and local debug state
  const resolvedEyeStates = useMemo(() => {
    return {
      guardian: customEyeStates?.guardian ?? debugEye.guardian,
      gemini: customEyeStates?.gemini ?? debugEye.gemini,
      quant: customEyeStates?.quant ?? debugEye.quant,
      atlas: customEyeStates?.atlas ?? debugEye.atlas,
      nexus: customEyeStates?.nexus ?? debugEye.nexus,
    };
  }, [customEyeStates, debugEye]);

  // Camera transform calculations
  const camTransform = `translate(${
    cameraFocus.x * (1 - cameraZoom) + cameraShake.x
  }px, ${cameraFocus.y * (1 - cameraZoom) + cameraShake.y}px) scale(${cameraZoom})`;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none bg-black rounded-2xl border border-white/10 shadow-2xl"
      style={{
        height: `${Math.round(1080 * scale)}px`,
        aspectRatio: '16 / 9',
      }}
    >
      {/* Scaled 1920x1080 Stage Canvas */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          background: '#000000',
          overflow: 'hidden',
          color: '#F6F4EF',
          fontFamily: 'var(--display)',
        }}
      >
        {/* ============================================================== */}
        {/* CAMERA LAYER: All world coordinates subject to pan, zoom, shake */}
        {/* ============================================================== */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '1920px',
            height: '1080px',
            transformOrigin: '0 0',
            transform: camTransform,
            transition: 'transform 0.05s linear',
          }}
        >
          {/* 1. BACK WALL GLOWS */}
          <div
            style={{
              position: 'absolute',
              left: `${440 - 330}px`,
              top: `${300 - 330}px`,
              width: '660px',
              height: '660px',
              background: `radial-gradient(ellipse at 50% 50%, ${hexToRgba(C.yellow, 0.15)}, transparent 64%)`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${960 - 330}px`,
              top: `${300 - 330}px`,
              width: '660px',
              height: '660px',
              background: `radial-gradient(ellipse at 50% 50%, ${hexToRgba(C.magenta, 0.15)}, transparent 64%)`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${330 - 330}px`,
              top: `${700 - 330}px`,
              width: '660px',
              height: '660px',
              background: `radial-gradient(ellipse at 50% 50%, ${hexToRgba(C.cyan, 0.15)}, transparent 64%)`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${1590 - 330}px`,
              top: `${700 - 330}px`,
              width: '660px',
              height: '660px',
              background: `radial-gradient(ellipse at 50% 50%, ${hexToRgba(C.red, 0.15)}, transparent 64%)`,
              pointerEvents: 'none',
            }}
          />

          {/* 2. DIAMOND LOGO EMBLEM ON REAR WALL */}
          <div
            style={{
              position: 'absolute',
              left: '960px',
              top: '290px',
              transform: 'translate(-50%, -50%)',
              width: '620px',
              height: '620px',
              pointerEvents: 'none',
            }}
          >
            <svg width="620" height="620" viewBox="-310 -310 620 620">
              <rect
                x="-195"
                y="-195"
                width="390"
                height="390"
                rx="60"
                transform="rotate(45)"
                fill="none"
                stroke="rgba(255, 255, 255, 0.09)"
                strokeWidth="4"
              />
              <circle r="142" fill="none" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="4" />
            </svg>
          </div>

          {/* 3. FLUTED PILLARS (Columns behind court) */}
          {[110, 640, 1210, 1740].map((x) => (
            <React.Fragment key={x}>
              <div
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: '130px',
                  width: '70px',
                  height: `${x < 200 || x > 1700 ? 760 : 515}px`,
                  background:
                    'repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.085) 0 6px, rgba(255, 255, 255, 0.025) 6px 14px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${x - 14}px`,
                  top: '112px',
                  width: '98px',
                  height: '20px',
                  background: 'rgba(255, 255, 255, 0.11)',
                  borderRadius: '4px',
                }}
              />
            </React.Fragment>
          ))}

          {/* 4. EVIDENCE SCREEN */}
          <EvidenceScreen
            ticker={ticker}
            isDisputed={isScreenDisputed}
            isCrashMode={isCrashMode}
            currentPrice={currentPrice}
          />

          {/* 5. BACK ROW CHARACTERS */}
          {/* Atlas-Macro (Witness Box) */}
          <CourtCharacter
            id="atlas"
            eyeState={resolvedEyeStates.atlas}
            headOffset={hOffsets.atlas}
            rootOffset={rOffsets.atlas}
          />

          {/* Guardian-01 (High Judge) */}
          <CourtCharacter
            id="guardian"
            eyeState={resolvedEyeStates.guardian}
            headOffset={hOffsets.guardian}
            rootOffset={rOffsets.guardian}
          />

          {/* 6. WITNESS BOX & HIGH BENCH FURNITURE */}
          {/* Witness Box Post & Pedestal */}
          <div
            style={{
              position: 'absolute',
              left: '395px',
              top: '500px',
              width: '90px',
              height: '230px',
              background: 'linear-gradient(180deg, #1b1c25, rgba(11, 11, 15, 0))',
            }}
          />
          {/* Witness Box Enclosure */}
          <div
            style={{
              position: 'absolute',
              left: '290px',
              top: '430px',
              width: '300px',
              height: '86px',
              background: 'linear-gradient(180deg, #22232e, #0d0d12)',
              borderRadius: '14px 14px 6px 6px',
              boxShadow: 'inset 0 6px 0 #353746',
            }}
          />

          {/* High Bench Plinth */}
          <div
            style={{
              position: 'absolute',
              left: '630px',
              top: '650px',
              width: '660px',
              height: '28px',
              background: '#0c0c11',
              borderRadius: '6px',
            }}
          />
          {/* High Bench Desk Slab */}
          <div
            style={{
              position: 'absolute',
              left: '660px',
              top: '440px',
              width: '600px',
              height: '220px',
              background: 'linear-gradient(180deg, #23242f, #0b0b0f 80%)',
              borderRadius: '14px 14px 0 0',
              boxShadow: 'inset 0 7px 0 #3a3c4b',
            }}
          />
          {/* Spectrum Accent Line on High Bench */}
          <div
            style={{
              position: 'absolute',
              left: '660px',
              top: '458px',
              width: '600px',
              height: '2px',
              background: 'linear-gradient(90deg, #6CF2FF, #FFC42E 48%, #F8A28C 72%, #D868E6)',
              opacity: 0.45,
            }}
          />

          {/* Atlas-Macro Nameplate */}
          <div
            className="mono"
            style={{
              position: 'absolute',
              left: '440px',
              top: '474px',
              transform: 'translate(-50%, -50%)',
              fontSize: '22px',
              padding: '9px 18px',
              borderRadius: '8px',
              border: `2px solid ${hexToRgba(cast.atlas.color, 0.75)}`,
              background: '#0a0a0e',
              color: cast.atlas.color,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
            }}
          >
            {cast.atlas.name}
          </div>

          {/* Guardian-01 Nameplate */}
          <div
            className="mono"
            style={{
              position: 'absolute',
              left: '960px',
              top: '512px',
              transform: 'translate(-50%, -50%)',
              fontSize: '24px',
              padding: '9px 22px',
              borderRadius: '8px',
              border: `2px solid ${hexToRgba(cast.guardian.color, 0.75)}`,
              background: '#0a0a0e',
              color: cast.guardian.color,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.7)',
            }}
          >
            {cast.guardian.name}
          </div>

          {/* Gavel & Sound Block */}
          <Gavel
            angle={gavelAngle}
            ringOpacity={gavelRingOpacity}
            ringScale={gavelRingScale}
          />

          {/* 7. FRONT ROW CHARACTERS */}
          {/* Quant-Omega (Counsel Left) */}
          <CourtCharacter
            id="quant"
            eyeState={resolvedEyeStates.quant}
            headOffset={hOffsets.quant}
            rootOffset={rOffsets.quant}
          />

          {/* Nexus-Red (Opposing Counsel Right) */}
          <CourtCharacter
            id="nexus"
            eyeState={resolvedEyeStates.nexus}
            headOffset={hOffsets.nexus}
            rootOffset={rOffsets.nexus}
          />

          {/* Gemini (High Arbiter & Clerk Center) */}
          <CourtCharacter
            id="gemini"
            eyeState={resolvedEyeStates.gemini}
            headOffset={hOffsets.gemini}
            rootOffset={rOffsets.gemini}
          />

          {/* 8. FRONT COUNSEL TABLES */}
          {/* Quant Counsel Desk */}
          <div
            style={{
              position: 'absolute',
              left: '110px',
              top: '860px',
              width: '450px',
              height: '240px',
              background: 'linear-gradient(180deg, #1d1e28, #08080b 80%)',
              borderRadius: '14px 14px 0 0',
              boxShadow: 'inset 0 7px 0 #30323f',
            }}
          />
          {/* Nexus Counsel Desk */}
          <div
            style={{
              position: 'absolute',
              left: '1360px',
              top: '860px',
              width: '450px',
              height: '240px',
              background: 'linear-gradient(180deg, #1d1e28, #08080b 80%)',
              borderRadius: '14px 14px 0 0',
              boxShadow: 'inset 0 7px 0 #30323f',
            }}
          />
          {/* Gemini Center Desk */}
          <div
            style={{
              position: 'absolute',
              left: '700px',
              top: '826px',
              width: '520px',
              height: '280px',
              background: 'linear-gradient(180deg, #23242f, #0a0a0e 80%)',
              borderRadius: '14px 14px 0 0',
              boxShadow: 'inset 0 7px 0 #3a3c4b',
            }}
          />

          {/* Quant Nameplate */}
          <div
            className="mono"
            style={{
              position: 'absolute',
              left: '335px',
              top: '906px',
              transform: 'translate(-50%, -50%)',
              fontSize: '22px',
              padding: '9px 18px',
              borderRadius: '8px',
              border: `2px solid ${hexToRgba(cast.quant.color, 0.75)}`,
              background: '#0a0a0e',
              color: cast.quant.color,
            }}
          >
            {cast.quant.name}
          </div>

          {/* Nexus Nameplate */}
          <div
            className="mono"
            style={{
              position: 'absolute',
              left: '1585px',
              top: '906px',
              transform: 'translate(-50%, -50%)',
              fontSize: '22px',
              padding: '9px 18px',
              borderRadius: '8px',
              border: `2px solid ${hexToRgba(cast.nexus.color, 0.75)}`,
              background: '#0a0a0e',
              color: cast.nexus.color,
            }}
          >
            {cast.nexus.name}
          </div>

          {/* Gemini Nameplate */}
          <div
            className="mono"
            style={{
              position: 'absolute',
              left: '960px',
              top: '856px',
              transform: 'translate(-50%, -50%)',
              fontSize: '19px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `2px solid ${hexToRgba(cast.gemini.color, 0.75)}`,
              background: '#0a0a0e',
              color: cast.gemini.color,
            }}
          >
            {cast.gemini.name}
          </div>

          {/* 9. CASE FILE */}
          <CaseFile
            ticker={ticker}
            action={tradeAction}
            leverage={leverageText}
            sizePct={sizePct}
            entryPrice={targetEntryPrice}
            targetExitPrice={targetExitPrice}
            stopLossPrice={stopLossPrice}
            takeProfitPct={takeProfitPct}
            stopLossPct={stopLossPct}
            executionType={executionType}
            stamp={caseFileStamp}
            stampScale={caseFileStampScale}
            stampOpacity={caseFileStampOpacity}
            proofHash={proofHash}
            onOpenProof={onOpenProofModal}
            xOffset={caseFileOffset.x}
            rotOffset={caseFileOffset.rot}
          />

          {/* 10. VOTE BADGES */}
          {voteBadges.quant?.visible && (
            <div
              style={{
                position: 'absolute',
                left: '462px',
                top: '650px',
                transform: 'translate(-50%, -50%)',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: voteBadges.quant.approved ? C.cyan : C.red,
                color: '#0b0b10',
                fontSize: '32px',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: '52px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
              }}
            >
              {voteBadges.quant.approved ? '✓' : '✗'}
            </div>
          )}
          {voteBadges.atlas?.visible && (
            <div
              style={{
                position: 'absolute',
                left: '560px',
                top: '250px',
                transform: 'translate(-50%, -50%)',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: voteBadges.atlas.approved ? C.yellow : C.red,
                color: '#0b0b10',
                fontSize: '32px',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: '52px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
              }}
            >
              {voteBadges.atlas.approved ? '✓' : '✗'}
            </div>
          )}
          {voteBadges.nexus?.visible && (
            <div
              style={{
                position: 'absolute',
                left: '1458px',
                top: '650px',
                transform: 'translate(-50%, -50%)',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: voteBadges.nexus.approved ? C.cyan : C.red,
                color: '#0b0b10',
                fontSize: '32px',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: '52px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
              }}
            >
              {voteBadges.nexus.approved ? '✓' : '✗'}
            </div>
          )}

          {/* 11. ACTIVE SPEECH BUBBLES */}
          {activeBubbles.map((b, idx) => (
            <SpeechBubble
              key={idx}
              text={b.text}
              speakerLabel={b.speakerLabel}
              x={b.x}
              y={b.y}
              color={cast[b.who]?.color || C.cyan}
              size={b.size}
              tailOffset={b.tail}
              opacity={b.opacity}
              scale={b.scale}
            />
          ))}
        </div>

        {/* ============================================================== */}
        {/* FIXED CAMERA OVERLAYS: Scanlines, Vignette, Flash, Caption     */}
        {/* ============================================================== */}
        {/* Flash Overlay */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '1920px',
            height: '1080px',
            background: flashColor,
            opacity: flashOpacity,
            pointerEvents: 'none',
            transition: 'opacity 0.05s ease-out',
          }}
        />

        {/* Scanlines Overlay */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '1920px',
            height: '1080px',
            background:
              'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.022) 0 1px, transparent 1px 4px)',
            pointerEvents: 'none',
          }}
        />

        {/* Film Vignette Overlay */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '1920px',
            height: '1080px',
            background:
              'radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0, 0, 0, 0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Center Top Caption Ribbon (Responsive, No Cropping) */}
        {caption && (
          <div
            style={{
              position: 'absolute',
              left: '960px',
              top: '54px',
              transform: 'translate(-50%, -50%)',
              maxWidth: '1550px',
              width: 'max-content',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: '#F6F4EF',
              background: 'rgba(8, 10, 15, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '9999px',
              padding: '8px 30px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 35,
              backdropFilter: 'blur(10px)',
            }}
          >
            {caption}
          </div>
        )}

        {/* Bottom Verdict Decree Ribbon (Guaranteed visible at bottom of animation) */}
        {caseFileStamp !== 'NONE' && (
          <div
            style={{
              position: 'absolute',
              left: '960px',
              bottom: '22px',
              transform: 'translateX(-50%)',
              background:
                caseFileStamp === 'APPROVED'
                  ? 'rgba(6, 78, 59, 0.95)'
                  : 'rgba(112, 26, 117, 0.95)',
              border: `2px solid ${
                caseFileStamp === 'APPROVED' ? '#10b981' : '#d946ef'
              }`,
              borderRadius: '12px',
              padding: '8px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: `0 8px 30px ${
                caseFileStamp === 'APPROVED'
                  ? 'rgba(16, 185, 129, 0.45)'
                  : 'rgba(217, 70, 239, 0.45)'
              }`,
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#ffffff',
              pointerEvents: 'none',
              zIndex: 40,
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background:
                  caseFileStamp === 'APPROVED' ? '#34d399' : '#f472b6',
                boxShadow: `0 0 10px ${
                  caseFileStamp === 'APPROVED' ? '#34d399' : '#f472b6'
                }`,
              }}
            />
            <span>
              {caseFileStamp === 'APPROVED'
                ? `RULING RATIFIED: ${tradeAction} ${ticker} @ $${(targetEntryPrice || currentPrice || 0).toLocaleString()} • EXIT (TP): $${(targetExitPrice || 0).toLocaleString()} (+${takeProfitPct || 11.5}%) • SL: $${(stopLossPrice || 0).toLocaleString()} (-${stopLossPct || 4.2}%)`
                : `TRIBUNAL VETO ENGAGED: TRADE PROPOSAL ON ${ticker} TERMINATED BY RISK ENGINE`}
            </span>
          </div>
        )}

        {/* Watermark in bottom corner */}
        <div
          className="mono"
          style={{
            position: 'absolute',
            right: '30px',
            bottom: '24px',
            fontSize: '15px',
            color: C.muted,
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        >
          LUNARIS TRIBUNAL // BITGET S2 QUANT COCKPIT
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEP 1 TEMPORARY DEBUG PANEL: Inspect & control any character eye */}
      {/* ============================================================== */}
      {showDebugPanel && (
        <div className="absolute top-3 right-3 z-50">
          <button
            onClick={() => setIsDebugOpen((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-xs font-mono text-zinc-300 border border-white/20 shadow-lg cursor-pointer flex items-center gap-2 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Step 1: Eye Debug Inspector</span>
            <span className="text-[10px] text-zinc-500">[{isDebugOpen ? 'Hide' : 'Show'}]</span>
          </button>

          {isDebugOpen && (
            <div className="mt-2 w-80 p-4 rounded-xl bg-zinc-950/95 border border-white/20 text-xs font-mono text-zinc-200 shadow-2xl backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Character Eye Controller
                </span>
                <span className="text-[10px] text-zinc-400">Step 1 Review Tool</span>
              </div>

              {/* Character Selector */}
              <div className="flex flex-wrap gap-1.5">
                {(['guardian', 'gemini', 'quant', 'atlas', 'nexus'] as CastCharacterId[]).map((cid) => (
                  <button
                    key={cid}
                    onClick={() => setDebugChar(cid)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      debugChar === cid
                        ? 'bg-white text-black shadow'
                        : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cast[cid].name.split(',')[0]}
                  </button>
                ))}
              </div>

              {/* Expression Presets */}
              <div className="border-t border-white/10 pt-2 space-y-1">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Expression Presets</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Neutral', state: { lid: 0, lidTilt: 0, look: [0, 0] as [number, number], pupilScale: 1 } },
                    { label: 'Speaking', state: { lid: 0, lidTilt: 0, look: [0.8, -0.15] as [number, number], pupilScale: 1.1 } },
                    { label: 'Suspicious', state: { lid: 0.42, lidTilt: 14, look: [0.8, 0] as [number, number], pupilScale: 1 } },
                    { label: 'Shocked', state: { lid: 0, lidTilt: 0, look: [0, -0.7] as [number, number], pupilScale: 0.6 } },
                    { label: 'Blink / Shut', state: { lid: 1, lidTilt: 0, look: [0, 0] as [number, number], pupilScale: 1 } },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() =>
                        setDebugEye((prev) => ({
                          ...prev,
                          [debugChar]: preset.state,
                        }))
                      }
                      className="px-2 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-[10px] text-zinc-300 text-left cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider Controls */}
              <div className="space-y-2 border-t border-white/10 pt-2">
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Eyelid closure (lid):</span>
                    <span>{(debugEye[debugChar].lid || 0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={debugEye[debugChar].lid || 0}
                    onChange={(e) =>
                      setDebugEye((prev) => ({
                        ...prev,
                        [debugChar]: { ...prev[debugChar], lid: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full h-1 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Eyelid tilt (lidTilt deg):</span>
                    <span>{debugEye[debugChar].lidTilt || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={debugEye[debugChar].lidTilt || 0}
                    onChange={(e) =>
                      setDebugEye((prev) => ({
                        ...prev,
                        [debugChar]: { ...prev[debugChar], lidTilt: parseInt(e.target.value, 10) },
                      }))
                    }
                    className="w-full h-1 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Pupil horizontal look (look[0]):</span>
                    <span>{(debugEye[debugChar].look?.[0] || 0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={debugEye[debugChar].look?.[0] || 0}
                    onChange={(e) => {
                      const lx = parseFloat(e.target.value);
                      const ly = debugEye[debugChar].look?.[1] || 0;
                      setDebugEye((prev) => ({
                        ...prev,
                        [debugChar]: { ...prev[debugChar], look: [lx, ly] },
                      }));
                    }}
                    className="w-full h-1 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Pupil scale:</span>
                    <span>{(debugEye[debugChar].pupilScale || 1).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.3"
                    step="0.05"
                    value={debugEye[debugChar].pupilScale || 1}
                    onChange={(e) =>
                      setDebugEye((prev) => ({
                        ...prev,
                        [debugChar]: { ...prev[debugChar], pupilScale: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full h-1 bg-zinc-800 rounded accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Reset button */}
              <button
                onClick={() =>
                  setDebugEye((prev) => ({
                    ...prev,
                    [debugChar]: { ...cast[debugChar].rest },
                  }))
                }
                className="w-full py-1 text-center rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[10px] border border-white/10 cursor-pointer"
              >
                Reset {cast[debugChar].name.split(',')[0]} to Rest
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
