const MUTE_KEY = 'granja-tienda-muted';

let ctx: AudioContext | null = null;
let muted = readMuted();
const last: Record<string, number> = {};

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Debe llamarse tras un gesto del usuario (política de autoplay). */
export function initAudio() {
  try {
    if (!ctx) ctx = new AudioContext();
    else if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* sin almacenamiento */
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.06, delay = 0, endFreq?: number) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function throttled(key: string, ms: number, fn: () => void) {
  const now = performance.now();
  if ((last[key] ?? 0) + ms > now) return;
  last[key] = now;
  fn();
}

export const sfx = {
  pick: () => throttled('pick', 55, () => tone(620 + Math.random() * 120, 0.07, 'triangle', 0.05, 0, 900)),
  drop: () => throttled('drop', 55, () => tone(520 + Math.random() * 60, 0.07, 'triangle', 0.05, 0, 340)),
  coin: () =>
    throttled('coin', 45, () => {
      tone(1320, 0.05, 'square', 0.02);
      tone(1760, 0.08, 'square', 0.02, 0.04);
    }),
  pay: () => throttled('pay', 60, () => tone(880, 0.05, 'square', 0.018)),
  cash: () => throttled('cash', 80, () => tone(990, 0.09, 'triangle', 0.05, 0, 1400)),
  unlock: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, i * 0.08)),
  upgrade: () => [660, 990].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, i * 0.07)),
  angry: () => tone(220, 0.25, 'sawtooth', 0.03, 0, 140),
};
