// components/court/SpeechBubble.tsx
import React from 'react';
import { hexToRgba } from './courtTheme';

export interface SpeechBubbleProps {
  text: string;
  speakerLabel?: string;
  x: number;
  y: number;
  color: string;
  size?: number;
  tailOffset?: number;
  opacity?: number;
  scale?: number;
  yOffset?: number;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  speakerLabel,
  x,
  y,
  color,
  size = 18,
  tailOffset = 0,
  opacity = 1,
  scale = 1,
  yOffset = 0,
}) => {
  if (!text || opacity <= 0.01) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) translateY(${yOffset}px) scale(${scale})`,
        opacity,
        maxWidth: '380px',
        width: 'max-content',
        minWidth: '220px',
        textAlign: 'center',
        padding: '10px 16px',
        borderRadius: '16px',
        background: 'rgba(8, 9, 14, 0.96)',
        border: `2px solid ${color}`,
        boxShadow: `0 8px 30px rgba(0, 0, 0, 0.8), 0 0 20px ${hexToRgba(color, 0.35)}`,
        zIndex: 50,
        pointerEvents: 'none',
        color: '#F6F4EF',
        boxSizing: 'border-box',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Speaker Persona / Stance Pill */}
      {speakerLabel && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color,
            marginBottom: '4px',
            background: hexToRgba(color, 0.12),
            padding: '2px 8px',
            borderRadius: '6px',
            border: `1px solid ${hexToRgba(color, 0.3)}`,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
          {speakerLabel}
        </div>
      )}

      {/* Punchy Core Speech (Option A) */}
      <div
        style={{
          fontSize: `${size}px`,
          fontWeight: 650,
          lineHeight: 1.35,
          color: '#F6F4EF',
          wordBreak: 'break-word',
          letterSpacing: '-0.01em',
        }}
      >
        {text}
      </div>

      {/* Downward triangle tail towards speaking character */}
      <div
        style={{
          position: 'absolute',
          left: `calc(50% + ${tailOffset}px)`,
          bottom: '-9px',
          width: '16px',
          height: '16px',
          marginLeft: '-8px',
          background: '#08090e',
          borderRight: `2px solid ${color}`,
          borderBottom: `2px solid ${color}`,
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
};
