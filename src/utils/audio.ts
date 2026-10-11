/**
 * Synthesizes sound effects for the Pencak Silat scoring system using Web Audio API.
 * This is 100% self-contained, offline-friendly, and requires no external asset files.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    // Standard AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  // Resume if suspended (browsers block audio until user interaction)
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Plays a single high-pitched short beep (e.g. for key presses / judge inputs)
 */
export function playBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1000 Hz

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

/**
 * Plays a double high-pitched chime (sweet consensus alert)
 */
export function playSuccessChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First tone (higher)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(1200, now);
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  // Second tone (slightly offset, even higher)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1500, now + 0.08); // offset by 80ms
  gain2.gain.setValueAtTime(0.15, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.25);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.35);
}

/**
 * Plays a loud, thick game buzzer/horn (e.g. round timer ends)
 */
export function playBuzzer(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 1.8; // 1.8s horn

  // Mix standard saw and triangle waves for that aggressive "BZZZZZT" horn quality
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(120, now); // Low frequency
  // slightly detune
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(122, now);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.setValueAtTime(0.2, now + duration - 0.2); // stay loud until near the end
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + duration);
  osc2.start(now);
  osc2.stop(now + duration);
}

/**
 * Plays a deep double beep warning (e.g. for fouls/penalties)
 */
export function playWarning(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Sound 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(400, now); // Lower pitch
  gain1.gain.setValueAtTime(0.2, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  // Sound 2
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(400, now + 0.25);
  gain2.gain.setValueAtTime(0.2, now + 0.25);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.2);
  osc2.start(now + 0.25);
  osc2.stop(now + 0.45);
}

/**
 * Plays a resonant, traditional Pencak Silat gong strike with metallic decay
 */
export function playGong(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 3.2; // 3.2s long resonant fade

  // Fundamental low gong tone (pitch bend slightly downwards on impact)
  const oscLow = ctx.createOscillator();
  const gainLow = ctx.createGain();
  oscLow.type = "sine";
  oscLow.frequency.setValueAtTime(108, now);
  oscLow.frequency.exponentialRampToValueAtTime(104, now + 0.3);

  gainLow.gain.setValueAtTime(0.4, now);
  gainLow.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscLow.connect(gainLow);
  gainLow.connect(ctx.destination);

  // First metallic harmonic
  const oscHarmonic1 = ctx.createOscillator();
  const gainHarmonic1 = ctx.createGain();
  oscHarmonic1.type = "triangle";
  oscHarmonic1.frequency.setValueAtTime(224, now);
  oscHarmonic1.frequency.exponentialRampToValueAtTime(218, now + 0.5);

  gainHarmonic1.gain.setValueAtTime(0.25, now);
  gainHarmonic1.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

  oscHarmonic1.connect(gainHarmonic1);
  gainHarmonic1.connect(ctx.destination);

  // High metallic shimmer
  const oscHarmonic2 = ctx.createOscillator();
  const gainHarmonic2 = ctx.createGain();
  oscHarmonic2.type = "sine";
  oscHarmonic2.frequency.setValueAtTime(452, now);

  gainHarmonic2.gain.setValueAtTime(0.12, now);
  gainHarmonic2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  oscHarmonic2.connect(gainHarmonic2);
  gainHarmonic2.connect(ctx.destination);

  // Trigger all oscillators
  oscLow.start(now);
  oscLow.stop(now + duration);
  oscHarmonic1.start(now);
  oscHarmonic1.stop(now + 2.4);
  oscHarmonic2.start(now);
  oscHarmonic2.stop(now + 1.2);
}

/**
 * Plays a sound by its string key
 */
export function playSoundByKey(key: "none" | "short_beep" | "success_chime" | "buzzer" | "warning_beep" | "gong"): void {
  if (key === "short_beep") playBeep();
  else if (key === "success_chime") playSuccessChime();
  else if (key === "buzzer") playBuzzer();
  else if (key === "warning_beep") playWarning();
  else if (key === "gong") playGong();
}
