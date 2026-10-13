import { getAudioContext } from './audio';
import { onSettingsChange, settings } from './settings';

/**
 * Música de fondo generada con WebAudio (sin archivos). Un bucle de 4 compases cuyo
 * estilo cambia con la reputación: alegre (mayor, rápida), tranquila o tensa (menor, lenta).
 */

interface Mood {
  bpm: number;
  /** Acordes (notas MIDI) de los 4 compases. */
  chords: number[][];
  lead: OscillatorType;
  /** Qué corcheas del compás suenan en el arpegio. */
  pattern: boolean[];
  drums: boolean;
}

const MOODS: Record<'happy' | 'calm' | 'tense', Mood> = {
  // Do mayor: I – V – vi – IV
  happy: {
    bpm: 116,
    chords: [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]],
    lead: 'square',
    pattern: [true, true, true, true, true, false, true, true],
    drums: true,
  },
  // Do mayor suave: I – vi – IV – V
  calm: {
    bpm: 96,
    chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]],
    lead: 'triangle',
    pattern: [true, false, true, true, false, true, true, false],
    drums: true,
  },
  // La menor armónica: i – iv – V – i
  tense: {
    bpm: 80,
    chords: [[57, 60, 64], [62, 65, 69], [64, 68, 71], [57, 60, 64]],
    lead: 'sawtooth',
    pattern: [true, false, false, true, false, false, true, false],
    drums: false,
  },
};

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let timer = 0;
let nextTime = 0;
let step = 0;
let mood = 0.6;
let current: Mood = MOODS.calm;

function pickMood(): Mood {
  return mood >= 0.6 ? MOODS.happy : mood >= 0.3 ? MOODS.calm : MOODS.tense;
}

function applyVolume() {
  if (!ctx || !master) return;
  const v = settings.music ? settings.musicVolume * 0.5 : 0;
  master.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
}

function note(f: number, t: number, dur: number, type: OscillatorType, vol: number, endF?: number) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (endF) o.frequency.exponentialRampToValueAtTime(endF, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hat(t: number, vol: number) {
  const src = ctx!.createBufferSource();
  src.buffer = noise;
  const hp = ctx!.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = ctx!.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(hp).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.06);
}

function playStep(s: number, t: number) {
  const m = current;
  const eighth = 60 / m.bpm / 2;
  const chord = m.chords[Math.floor(s / 8) % 4];
  const e = s % 8;
  // Pad suave al empezar cada compás
  if (e === 0) for (const n of chord) note(freq(n), t, eighth * 8, 'sine', 0.018);
  // Bajo en los tiempos 1 y 3
  if (e === 0 || e === 4) note(freq(chord[0] - 24), t, eighth * 3, 'triangle', 0.11);
  // Arpegio
  if (m.pattern[e]) note(freq(chord[e % 3] + (e >= 4 ? 12 : 0)), t, eighth * 0.9, m.lead, m.lead === 'triangle' ? 0.05 : 0.022);
  if (m.drums) {
    if (e === 0 || e === 4) note(120, t, 0.18, 'sine', 0.12, 40);
    if (e % 2 === 1) hat(t, 0.02);
  } else if (e === 0 && Math.floor(s / 8) % 2 === 1) {
    // Golpe grave y tenso en compases alternos
    note(freq(chord[0] - 36), t, eighth * 6, 'sawtooth', 0.03);
  }
}

function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.15) {
    if (step % 8 === 0) current = pickMood();
    playStep(step, nextTime);
    nextTime += 60 / current.bpm / 2;
    step = (step + 1) % 32;
  }
}

/** Arranca la música (requiere que el audio ya esté desbloqueado por un gesto). */
export function startMusic() {
  if (timer) return;
  ctx = getAudioContext();
  if (!ctx) return;
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  applyVolume();
  nextTime = ctx.currentTime + 0.1;
  timer = window.setInterval(schedule, 25);
}

/** 0 = reputación por los suelos (tensa) · 1 = reputación máxima (alegre). */
export function setMusicMood(m: number) {
  mood = Math.max(0, Math.min(1, m));
}

onSettingsChange(applyVolume);

// Con la página oculta (móvil bloqueado, otra app o pestaña) se detiene el programador de notas
// para no gastar batería; al volver se reanuda desde el compás siguiente.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
    window.clearInterval(timer);
    timer = 0;
  } else if (!timer) {
    nextTime = ctx.currentTime + 0.1;
    step = 0;
    timer = window.setInterval(schedule, 25);
  }
});
