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

/** Defcon-1 Black Swan Emergency Alarm */
export function playBlackSwanAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Two urgent alternating alert sweeps
    [0, 0.18, 0.36].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now + offset);
      osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.14);

      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  } catch {
    // Graceful fallback
  }
}

/** Heavy mechanical slam when emergency killswitch is hit */
export function playEmergencyButtonSlam() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Low frequency sub-thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    // High frequency metal switch click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(2200, now);
    clickOsc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
    clickGain.gain.setValueAtTime(0.06, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.04);
  } catch {
    // Graceful fallback
  }
}

/** Soft teletype Bloomberg ticker acoustic chirp */
export function playTradingFloorTick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800 + Math.random() * 400, now);

    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.015);
  } catch {
    // Graceful fallback
  }
}

let ambientIntervalId: number | null = null;
let ambientFloorEnabled = false;

/** Enable or disable subtle Bloomberg ambient floor ticker feedback */
export function toggleTradingFloorAmbience(): boolean {
  ambientFloorEnabled = !ambientFloorEnabled;

  if (ambientFloorEnabled) {
    if (typeof window !== 'undefined' && !ambientIntervalId) {
      ambientIntervalId = window.setInterval(() => {
        if (ambientFloorEnabled && isSoundEnabled) {
          playTradingFloorTick();
        }
      }, 3800);
    }
  } else {
    if (ambientIntervalId) {
      clearInterval(ambientIntervalId);
      ambientIntervalId = null;
    }
  }

  return ambientFloorEnabled;
}

export function getTradingFloorAmbienceState(): boolean {
  return ambientFloorEnabled;
}
