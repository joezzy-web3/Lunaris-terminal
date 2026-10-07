// components/court/courtTheme.ts
// Single source of truth for the Lunaris Courtroom visual design system

export const COURT_THEME = {
  canvas: {
    width: 1920,
    height: 1080,
  },
  color: {
    cyan: '#6CF2FF',
    yellow: '#FFC42E',
    coral: '#F8A28C',
    magenta: '#D868E6',
    red: '#FF5A5F',
    white: '#F6F4EF',
    muted: '#8C91A0',
    crash: '#FF4D6D',
  },
  spring: {
    soft: { stiffness: 120, damping: 18 },
    snap: { stiffness: 300, damping: 22 },
    bounce: { stiffness: 170, damping: 11 },
  },
  cast: {
    guardian: {
      id: 'guardian' as const,
      name: 'Guardian-01',
      title: 'Sole Judge & Risk Arbiter',
      x: 960,
      y: 290,
      size: 180,
      bodyWidth: 380,
      deskY: 440,
      color: '#D868E6',
      gradient: 'linear-gradient(135deg, #f5b0f2, #c44fe0)',
      lid: '#d981ea',
      accessory: 'cap' as const,
      rest: { lid: 0.28, look: [0, 0] as [number, number], lidTilt: 0, pupilScale: 1 },
    },
    gemini: {
      id: 'gemini' as const,
      name: 'Gemini, High Arbiter',
      title: 'High Arbiter & Scribe',
      x: 960,
      y: 748,
      size: 104,
      bodyWidth: 150,
      deskY: 826,
      color: '#F6F4EF',
      gradient: 'linear-gradient(135deg, #f6f3ed, #b5b1a8)',
      lid: '#d6d2c9',
      accessory: null,
      rest: { lid: 0, look: [0, 0] as [number, number], lidTilt: 0, pupilScale: 1 },
    },
    quant: {
      id: 'quant' as const,
      name: 'Quant-Omega',
      title: 'Momentum & Orderflow Counsel',
      x: 330,
      y: 712,
      size: 160,
      bodyWidth: 310,
      deskY: 860,
      color: '#6CF2FF',
      gradient: 'linear-gradient(135deg, #a6f9ff, #45cde6)',
      lid: '#63dcec',
      accessory: 'visor' as const,
      rest: { lid: 0, look: [0, 0] as [number, number], lidTilt: 0, pupilScale: 1 },
    },
    atlas: {
      id: 'atlas' as const,
      name: 'Atlas-Macro',
      title: 'Cross-Asset Macro Witness',
      x: 440,
      y: 300,
      size: 150,
      bodyWidth: 290,
      deskY: 430,
      color: '#FFC42E',
      gradient: 'linear-gradient(135deg, #ffe58a, #ffae1a)',
      lid: '#ffc64f',
      accessory: 'wig' as const,
      rest: { lid: 0.2, look: [0, 0] as [number, number], lidTilt: 0, pupilScale: 1 },
    },
    nexus: {
      id: 'nexus' as const,
      name: 'Nexus-Red',
      title: 'Adversarial Red Team Counsel',
      x: 1590,
      y: 712,
      size: 160,
      bodyWidth: 310,
      deskY: 860,
      color: '#FF5A5F',
      gradient: 'linear-gradient(135deg, #ffa59a, #ee3f47)',
      lid: '#1c0b0e',
      accessory: 'mask' as const,
      rest: { lid: 0.32, lidTilt: -14, look: [0, 0] as [number, number], pupilScale: 1 },
    },
  },
  gavel: {
    pivotX: 1085,
    pivotY: 398,
    restAngle: 24,
    blockX: 1210,
    blockY: 436,
  },
  caseFile: {
    x: 960,
    y: 890,
    w: 620,
    h: 140,
  },
  screen: {
    x: 1280,
    y: 150,
    w: 420,
    h: 270,
  },
};

export type CastCharacterId = keyof typeof COURT_THEME.cast;

export interface CharacterEyeState {
  look?: [number, number]; // [-1..1, -1..1]
  lid?: number; // 0 open .. 1 shut
  lidTilt?: number; // degrees (+-14)
  pupilScale?: number; // 0.6 shock, 1 normal, 1.1 speaking
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
