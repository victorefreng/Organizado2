/**
 * AUDIO DE UNA TRANSICIÓN — 10 s, WAV 48 kHz estéreo PCM 16, sin timecode.
 *
 * Cuenta lo mismo que la imagen: un golpe blando de luz, un barrido que
 * acompaña a la estrella, las primeras notas del motivo de la noche y, al
 * final, el acorde del mundo al que se llega, sostenido para que la música del
 * mundo entre encima sin escalón.
 *
 * Uso: node tools/make-transition-audio.mjs production/pieces/TR-002/piece.json salida.wav
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SR = 48000;
const piece = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'));
const out = resolve(process.argv[3]);
const seconds = (piece.durationSeconds || 10) + 0.5;
const N = Math.round(seconds * SR);
const L = new Float32Array(N), R = new Float32Array(N);

// el acorde de reposo de cada mundo, una octava por encima del de su ambiente
const CHORDS = {
  clouds: [130.8, 196, 261.6, 392], ocean: [110, 165, 220, 329.4], jungle: [98, 146.8, 196, 261.6],
  galaxy: [82.4, 123.4, 164.8, 247], redroom: [98, 116.6, 146.8, 196]
};
const chord = CHORDS[piece.worldModule] || CHORDS.ocean;
let seed = [...piece.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const TAU = Math.PI * 2;
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const add = (i, v, pan = 0.5) => { if (i >= 0 && i < N) { L[i] += v * Math.cos(pan * Math.PI / 2); R[i] += v * Math.sin(pan * Math.PI / 2); } };

// 1 · golpe de luz: ruido filtrado que se abre y cae
{ let lp = 0; for (let i = 0; i < N; i++) { const t = i / SR - 0.2; if (t < 0 || t > 3) continue;
  lp += ((rnd() * 2 - 1) - lp) * (0.02 + 0.16 * Math.exp(-t * 2.2));
  add(i, lp * ss(0, 0.25, t) * Math.exp(-t * 1.5) * 1.5, 0.5); } }

// 2 · barrido que sigue a la estrella: paso de banda que sube
{ let low = 0, band = 0; for (let i = 0; i < N; i++) { const t = i / SR, p = (t - 0.9) / 4.6; if (p < 0 || p > 1) continue;
  const fc = 280 * Math.pow(18, p), fq = 2 * Math.sin(Math.PI * fc / SR), q = 0.55;
  const hi = (rnd() * 2 - 1) - low - q * band; band += fq * hi; low += fq * band;
  add(i, band * Math.pow(Math.sin(Math.PI * p), 1.3) * 0.42, 0.36 + 0.28 * p); } }

// 3 · el motivo de la noche: cinco notas en campana
{ const root = 587.33, semis = [0, 7, 12, 11, 7], at = [1.35, 2.05, 2.75, 3.45, 4.15];
  semis.forEach((s, k) => { const f = root * Math.pow(2, s / 12), i0 = Math.round(at[k] * SR);
    for (let j = 0; j < SR * 3.2; j++) { const t = j / SR, e = Math.exp(-t / 0.85) * ss(0, 0.004, t);
      add(i0 + j, (Math.sin(TAU * f * t) + 0.38 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 2) + 0.16 * Math.sin(TAU * 3.01 * f * t) * Math.exp(-t * 4)) * e * 0.15, 0.42 + 0.04 * k); } }); }

// 4 · chispas: pings altos y cortos mientras pasa la estela
for (let k = 0; k < 46; k++) { const t0 = 1.1 + rnd() * 4.9, f = 2200 + rnd() * 3600, i0 = Math.round(t0 * SR), pan = 0.3 + rnd() * 0.4, a = 0.012 + rnd() * 0.022;
  for (let j = 0; j < SR * 0.5; j++) { const t = j / SR; add(i0 + j, Math.sin(TAU * f * t) * Math.exp(-t * 11) * a, pan); } }

// 5 · llegada: el acorde del mundo, que se queda
chord.forEach((f, k) => { for (const det of [-0.0018, 0.0018]) { const ff = f * (1 + det), ph = rnd() * TAU;
  for (let i = Math.round(4.6 * SR); i < N; i++) { const t = i / SR;
    const env = ss(4.6, 6.4, t) * (1 - 0.4 * ss(8.2, seconds, t));
    const v = (Math.sin(TAU * ff * t + ph) + 0.22 * Math.sin(TAU * 2 * ff * t + ph)) * env * 0.075 * (k === 0 ? 1.15 : 1);
    add(i, v, det < 0 ? 0.42 : 0.58); } } });
// y un brillo encima del acorde, que es lo que suena a "llegar"
[chord[3] * 2, chord[2] * 3].forEach((f, k) => { for (let i = Math.round(5.5 * SR); i < N; i++) { const t = i / SR - 5.5;
  add(i, Math.sin(TAU * f * t) * ss(0, 0.5, t) * Math.exp(-t / 2.2) * 0.05, 0.5); } });

// corte de graves, normalización y salida
const hp = (x) => { const rc = 1 / (TAU * (piece.audio?.bassRolloffHz ?? 45)), a = rc / (rc + 1 / SR); let y = 0, px = 0;
  for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } };
hp(L); hp(R);
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = Math.pow(10, (piece.audio?.peakTargetDb ?? -1) / 20) / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`AUDIO · ${piece.id} · ${seconds}s · pico ${(20 * Math.log10(peak)).toFixed(1)} → ${piece.audio?.peakTargetDb ?? -1} dBFS → ${out}`);
