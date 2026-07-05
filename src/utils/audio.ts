// Web Audio API Sound Synthesizer for premium interface audio alerts

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a modern double-pulse alert tone (like an automobile speed warning)
 */
export function playOverspeedWarning(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Pulse 1
    playTone(ctx, 880, 0.15, now);
    // Pulse 2
    playTone(ctx, 880, 0.15, now + 0.25);
  } catch (e) {
    console.warn('Audio warning failed to play:', e);
  }
}

/**
 * Plays a soft high-quality click sound for button interactions
 */
export function playClick(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playTone(ctx, 600, 0.05, now, 'triangle', 0.2);
  } catch (e) {
    // Ignore context blocked
  }
}

/**
 * Helper to play a single synthesis tone
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  startTime: number,
  type: OscillatorType = 'sine',
  volume: number = 0.5
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Smooth volume envelope to avoid raw click pops
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.setValueAtTime(volume, startTime + duration - 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}
