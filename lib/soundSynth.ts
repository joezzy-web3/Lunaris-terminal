// lib/soundSynth.ts
// Subtle Web Audio API cyber sounds for institutional terminal feedback

let audioCtx: AudioContext | null = null;
let isSoundEnabled = false;

export function toggleTerminalSound(enabled?: boolean): boolean {
  if (enabled !== undefined) {
    isSoundEnabled = enabled;
  } else {
    isSoundEnabled = !isSoundEnabled;
  }
  return isSoundEnabled;
}

export function getTerminalSoundState(): boolean {
  return isSoundEnabled;
}

function getAudioContext(): AudioContext | null {
  if (!isSoundEnabled) return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Soft cyber click for UI interactions */
export function playCyberClick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch {
    // Graceful fallback
  }
}

/** Chime when a trade is approved and executed */
export function playTradeApprovedChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [880, 1174.66, 1760].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.05, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.12);
    });
  } catch {
    // Graceful fallback
  }
}

/** Warning tone when risk veto triggers */
export function playRiskVetoTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.setValueAtTime(240, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Graceful fallback
  }
}
