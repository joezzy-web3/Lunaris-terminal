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

/** Dramatic Courtroom "OBJECTION, MY LORD!" Chord & Alarm Sting */
export function playCourtObjectionSting() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Dissonant dramatic crash chord: 440Hz, 622.25Hz (tritone), 880Hz, 1244Hz
    const freqs = [440, 622.25, 880, 1244.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + 0.28);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  } catch {
    // Graceful fallback
  }
}

/** Heavy Resonant Wooden Gavel Slam with Sub-Bass Shockwave Impact */
export function playGavelImpactSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    // 1. Heavy resonant wood body transient (400Hz snap decaying to 160Hz)
    const woodOsc = ctx.createOscillator();
    const woodGain = ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(420, now);
    woodOsc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    woodGain.gain.setValueAtTime(0.35, now);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    woodOsc.connect(woodGain);
    woodGain.connect(ctx.destination);
    woodOsc.start(now);
    woodOsc.stop(now + 0.22);

    // 2. Heavy Sub-Bass Table Thud (65Hz vibrating down to 24Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.35);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);

    // 3. High-frequency crack/impact spark
    const crackOsc = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crackOsc.type = 'square';
    crackOsc.frequency.setValueAtTime(2400, now);
    crackOsc.frequency.exponentialRampToValueAtTime(400, now + 0.035);

    crackGain.gain.setValueAtTime(0.15, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    crackOsc.connect(crackGain);
    crackGain.connect(ctx.destination);
    crackOsc.start(now);
    crackOsc.stop(now + 0.035);
  } catch {
    // Graceful fallback
  }
}

/** Suspense tension riser right before the magistrate strikes */
export function playGavelRiserSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.35);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.32);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
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

/** Wooden gavel knock / tap on sound block */
export function playWoodenGavelKnock(firm = false) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Wood strike fundamental
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(firm ? 460 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + (firm ? 0.09 : 0.06));

    gain.gain.setValueAtTime(firm ? 0.35 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (firm ? 0.12 : 0.08));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (firm ? 0.12 : 0.08));

    // Secondary wooden block resonance
    const blockOsc = ctx.createOscillator();
    const blockGain = ctx.createGain();
    blockOsc.type = 'sine';
    blockOsc.frequency.setValueAtTime(190, now);
    blockOsc.frequency.exponentialRampToValueAtTime(60, now + 0.14);
    blockGain.gain.setValueAtTime(firm ? 0.25 : 0.15, now);
    blockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    blockOsc.connect(blockGain);
    blockGain.connect(ctx.destination);
    blockOsc.start(now);
    blockOsc.stop(now + 0.14);
  } catch {
    // Graceful fallback
  }
}

/** Low quiet courtroom murmur during deliberation */
export function playCourtroomMurmur() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Layered soft low-pass noise filter simulating distant hushed murmur
    [130, 160, 210].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + Math.random() * 20, now);
      osc.frequency.linearRampToValueAtTime(freq - 10 + Math.random() * 20, now + 0.6);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6 + i * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  } catch {
    // Graceful fallback
  }
}

/** Short stab for an objection */
export function playObjectionStab() {
  playCourtObjectionSting();
}

/** Deep heartbeat thump for the risk check zoom */
export function playHeartbeatSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Lub-dub pair
    [0, 0.12].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 68 : 55, now + offset);
      osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.16);

      gain.gain.setValueAtTime(idx === 0 ? 0.22 : 0.16, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch {
    // Graceful fallback
  }
}

/** Soft crystalline chime when the SHA-256 seal is stamped */
export function playSealChimeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [1046.5, 1318.51, 1567.98, 2093.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.04, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.45);
    });
  } catch {
    // Graceful fallback
  }
}
