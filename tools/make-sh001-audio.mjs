/**
 * MÚSICA DE SH-001 · THE AWAKENING — 3:40, WAV 48 kHz estéreo PCM 16, sin timecode.
 *
 * Maqueta sintetizada, pero compuesta sobre la línea de tiempo real del
 * capítulo: cada golpe cae en el fotograma del golpe. Fija la forma, el tempo
 * emocional y los puntos de sincronía con las luces; se puede sustituir por
 * música con licencia respetando estos mismos tiempos.
 *
 * El motivo de la noche (re–la–re'–do#'–la–si–la–fa#–mi) aparece tres veces:
 * insinuado en el nacimiento, claro en PARA TI y completo en la revelación.
 *
 * Uso: node tools/make-sh001-audio.mjs dist/packages/SH-001/audio.wav
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SR = 48000, DUR = 220.5, N = Math.round(DUR * SR), TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), SL = new Float32Array(N), SRv = new Float32Array(N);   // mezcla seca y envío a reverb
let seed = 20261115;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const put = (i, v, pan = 0.5, send = 0) => { if (i < 0 || i >= N) return; const l = v * Math.cos(pan * Math.PI / 2), r = v * Math.sin(pan * Math.PI / 2); L[i] += l; R[i] += r; if (send) { SL[i] += l * send; SRv[i] += r * send; } };
const note = (semi, base = 293.66) => base * Math.pow(2, semi / 12);

/** Colchón: cada nota con dos voces desafinadas, una a cada lado. */
function pad(t0, t1, freqs, amp, att = 3, rel = 4, bright = 0.3) {
  for (const f of freqs) for (const [det, pan] of [[-0.0022, 0.38], [0.0022, 0.62]]) {
    const ff = f * (1 + det), ph = rnd() * TAU, lfo = 0.07 + rnd() * 0.1, lp = rnd() * TAU;
    for (let i = Math.round(t0 * SR), e = Math.min(N, Math.round((t1 + rel) * SR)); i < e; i++) {
      const t = i / SR, env = ss(t0, t0 + att, t) * (1 - ss(t1, t1 + rel, t)), x = TAU * ff * t + ph;
      put(i, (Math.sin(x) + bright * Math.sin(2 * x) + bright * 0.4 * Math.sin(3 * x)) * env * amp * (0.82 + 0.18 * Math.sin(TAU * lfo * t + lp)), pan, 0.25);
    }
  }
}
/** Campana o piano blando. */
function bell(t0, f, amp = 0.12, decay = 1.6, pan = 0.5, send = 0.6) {
  const i0 = Math.round(t0 * SR);
  for (let j = 0, n = Math.round(decay * 5 * SR); j < n; j++) { const t = j / SR, e = Math.exp(-t / decay) * ss(0, 0.004, t);
    put(i0 + j, (Math.sin(TAU * f * t) + 0.36 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 2.2) + 0.14 * Math.sin(TAU * 3.01 * f * t) * Math.exp(-t * 4.5)) * e * amp, pan, send); }
}
/** Golpe grave: seno que cae de tono. Nada por debajo de lo que una Sonos reproduce bien. */
function thump(t0, f0, f1, amp, decay = 0.5) {
  const i0 = Math.round(t0 * SR); let ph = 0;
  for (let j = 0, n = Math.round(decay * 6 * SR); j < n; j++) { const t = j / SR, f = f1 + (f0 - f1) * Math.exp(-t * 9); ph += TAU * f / SR; put(i0 + j, Math.sin(ph) * Math.exp(-t / decay) * ss(0, 0.003, t) * amp, 0.5, 0.1); }
}
/** Barrido de ruido con paso de banda que viaja en frecuencia y en panorama. */
function sweep(t0, t1, f0, f1, amp, pan0 = 0.5, pan1 = 0.5, shape = 1.3, q = 0.5) {
  let low = 0, band = 0;
  for (let i = Math.round(t0 * SR), e = Math.round(t1 * SR); i < e; i++) { const p = (i / SR - t0) / (t1 - t0), fc = f0 * Math.pow(f1 / f0, p), fq = 2 * Math.sin(Math.PI * Math.min(0.24, fc / SR));
    const hi = (rnd() * 2 - 1) - low - q * band; band += fq * hi; low += fq * band;
    put(i, band * Math.pow(Math.sin(Math.PI * p), shape) * amp, pan0 + (pan1 - pan0) * p, 0.3); }
}
/** Subida: ruido que se abre hasta un punto y se corta ahí. */
function riser(t0, t1, amp, f0 = 300, f1 = 7000) {
  let low = 0, band = 0;
  for (let i = Math.round(t0 * SR), e = Math.round(t1 * SR); i < e; i++) { const p = (i / SR - t0) / (t1 - t0), fc = f0 * Math.pow(f1 / f0, p), fq = 2 * Math.sin(Math.PI * Math.min(0.24, fc / SR));
    const hi = (rnd() * 2 - 1) - low - 0.6 * band; band += fq * hi; low += fq * band; put(i, band * p * p * amp, 0.5, 0.2); }
}
/** Lecho de ruido filtrado: aire, agua. */
function bed(t0, t1, cut, amp, att = 3, rel = 4) {
  let a = 0, b = 0; const k = 1 - Math.exp(-TAU * cut / SR);
  for (let i = Math.round(t0 * SR), e = Math.min(N, Math.round((t1 + rel) * SR)); i < e; i++) { const t = i / SR; a += ((rnd() * 2 - 1) - a) * k; b += ((rnd() * 2 - 1) - b) * k;
    const env = ss(t0, t0 + att, t) * (1 - ss(t1, t1 + rel, t)) * (0.7 + 0.3 * Math.sin(TAU * 0.11 * t)) * amp; if (i < N) { L[i] += a * env; R[i] += b * env; } }
}
/** Estallido de luz: ruido brillante que cae. */
function bloom(t0, amp, decay = 1.4) {
  let lp = 0; const i0 = Math.round(t0 * SR);
  for (let j = 0, n = Math.round(decay * 5 * SR); j < n; j++) { const t = j / SR; lp += ((rnd() * 2 - 1) - lp) * (0.03 + 0.3 * Math.exp(-t * 2.5)); put(i0 + j, lp * Math.exp(-t / decay) * ss(0, 0.02, t) * amp, 0.3 + 0.4 * rnd(), 0.5); }
}
/** Chasquido de madera: percusión orgánica. */
function tick(t0, amp, f = 900) { const i0 = Math.round(t0 * SR); for (let j = 0; j < SR * 0.12; j++) { const t = j / SR; put(i0 + j, (Math.sin(TAU * f * t) * 0.6 + (rnd() * 2 - 1) * 0.4) * Math.exp(-t * 60) * amp, 0.35 + 0.3 * rnd(), 0.5); } }
/** Canto de ballena: seno que resbala, con vibrato. */
function whale(t0, dur, fs, amp) { const i0 = Math.round(t0 * SR); let ph = 0;
  for (let j = 0, n = Math.round(dur * SR); j < n; j++) { const p = j / n, k = p * (fs.length - 1), a = Math.floor(k), f = fs[a] + (fs[Math.min(fs.length - 1, a + 1)] - fs[a]) * (k - a);
    ph += TAU * f * (1 + 0.012 * Math.sin(TAU * 5.2 * j / SR)) / SR; put(i0 + j, (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * Math.pow(Math.sin(Math.PI * p), 0.8) * amp, 0.4 + 0.2 * p, 0.9); } }
const MOTIF = [0, 7, 12, 11, 7, 9, 7, 4, 2];
function motif(t0, step, base, amp, n = MOTIF.length, decay = 1.8) { for (let k = 0; k < n; k++) bell(t0 + k * step, note(MOTIF[k], base), amp * (k === 2 ? 1.15 : 1), decay, 0.42 + 0.16 * (k % 2)); }
function arp(t0, t1, freqs, step, amp, decay = 0.5) { let k = 0; for (let t = t0; t < t1; t += step, k++) { const f = freqs[k % freqs.length] * (Math.floor(k / freqs.length) % 2 ? 2 : 1); bell(t, f, amp * (0.75 + 0.25 * ss(t0, t1, t)), decay, 0.3 + 0.4 * ((k * 0.37) % 1), 0.5); } }

// ═════════════ la partitura ═════════════
const D = { D2: 73.42, A2: 110, D3: 146.83, E3: 164.81, Fs3: 185, G3: 196, A3: 220, B3: 246.94, Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88 };

// 0:00 THE FIRST BREATH — casi nada: aire, y a los 8 s un latido
bed(1, 19, 260, 0.012, 6, 1);
for (let t = 8; t < 18.2; t += 2.3) { const g = 0.05 + 0.1 * ss(8, 18, t); thump(t, 74, 58, g, 0.22); thump(t + 0.35, 70, 56, g * 0.6, 0.2); }
bell(10.4, note(0, 587.33), 0.05, 2.6); bell(14.9, note(7, 587.33), 0.06, 2.8);
// 0:18 nace la estrella
riser(17.6, 19.25, 0.14); bloom(19.25, 0.32, 1.6); thump(19.25, 110, 60, 0.22, 0.6);
[0, 7, 14].forEach((s, k) => bell(19.25 + k * 0.05, note(s, 293.66), 0.11, 3));
// 0:19 THE SHOOTING STAR — espacio que crece
pad(19.3, 45, [D.D3, D.A3, D.E4], 0.03, 5, 1, 0.25); pad(30, 45, [D.D4, D.Fs4, D.A4], 0.018, 8, 1, 0.3);
sweep(23, 29.4, 500, 5200, 0.2, 0.4, 0.75); sweep(26.8, 34.6, 400, 4200, 0.2, 0.2, 0.8); sweep(30.8, 37.6, 400, 4200, 0.18, 0.8, 0.25); sweep(37, 45, 700, 240, 0.26, 0.7, 0.5, 0.9);
[23, 27, 31, 35, 37, 39, 41, 42, 43, 44].forEach((t, k) => thump(t, 82, 60, 0.07 + k * 0.014, 0.3));
motif(24, 1.35, 587.33, 0.035, 5, 2.4);
riser(41.5, 45.05, 0.24);
// 0:45 IMPACTO
thump(45.08, 130, 52, 0.42, 0.9); bloom(45.08, 0.4, 2.4); [0, 7, 12, 16].forEach((s) => bell(45.1, note(s, 196), 0.1, 3.5));
// 0:45 THE BIRTH OF LIFE — cálido, orgánico
pad(45.5, 59.5, [98, D.D3, D.B3, D.G3], 0.036, 3, 3, 0.28);
for (let t = 49.5; t < 78; t += 0.75) tick(t, 0.03 + 0.05 * ss(49.5, 66, t), 700 + 500 * ((t * 1.7) % 1));
arp(49.6, 59, [D.G3, D.B3, D.D4, D.G4], 0.5, 0.05, 0.9);
[[59.2, [98, D.G3, D.B3, D.D4]], [63.9, [82.4, D.E3, D.G3, D.B3]], [68.6, [130.8, D.E3, D.G3, 261.6]], [73.3, [D.D3, D.A3, D.D4, D.Fs4]]].forEach(([t, ch]) => { pad(t, t + 4.7, ch, 0.036, 1.6, 2.4, 0.4); arp(t, t + 4.7, ch.slice(1), 0.39, 0.045, 0.7); });
for (let k = 0; k < 40; k++) bell(69 + rnd() * 12, 1400 + rnd() * 2400, 0.012 + rnd() * 0.014, 0.4, 0.3 + rnd() * 0.4);
// 1:18 PARA TI — el motivo, claro por primera vez
pad(77.6, 90.4, [D.D3, D.A3, D.D4, D.Fs4], 0.04, 2.5, 3, 0.3);
motif(78.7, 0.62, 587.33, 0.085, 9, 2.0); motif(85.6, 0.5, 293.66, 0.075, 9, 2.2); bell(85.6, note(0, 146.83), 0.09, 4);
// 1:30 MEMORIES BLOOM — la versión emotiva
[[90.3, [123.47, D.Fs3, D.B3, D.D4]], [94.8, [98, D.G3, D.B3, D.D4]], [99.3, [D.D3, D.A3, D.D4, D.Fs4]], [103.8, [110, D.E3, D.A3, D.Cs4]]].forEach(([t, ch]) => { pad(t, t + 4.5, ch, 0.04, 1.8, 2.6, 0.32); arp(t + 0.2, t + 4.5, [ch[1], ch[2], ch[3], ch[2]], 0.75, 0.05, 1.4); });
motif(91, 1.0, 587.33, 0.06, 9, 2.6); motif(100.3, 0.9, 587.33, 0.055, 9, 2.6);
// 1:48 THE WATER PORTAL — la mariposa: destellos; luego cristal y subida
pad(108, 126, [110, D.E3, D.A3, D.Cs4], 0.03, 3, 2, 0.25);
for (let k = 0; k < 46; k++) { const t = 108.4 + rnd() * 11.4; bell(t, note([0, 2, 4, 7, 9, 12, 14][Math.floor(rnd() * 7)], 880), 0.022, 0.6, 0.3 + rnd() * 0.4); }
[0, 4, 7, 11, 12, 16, 19].forEach((s, k) => bell(120.3 + k * 0.42, note(s, 880), 0.06, 1.6, 0.35 + 0.05 * k));
riser(121.5, 126.2, 0.2, 400, 5200);
thump(126.25, 96, 50, 0.3, 0.8); sweep(126.2, 130.6, 2600, 260, 0.34, 0.5, 0.5, 0.6);
// 2:10 THE DEEP OCEAN — amplio y majestuoso
bed(126.4, 163, 420, 0.03, 4, 4);
[[130, [110, D.E3, D.A3, D.Cs4]], [138, [92.5, D.Fs3, D.A3, D.Cs4]], [146, [D.D3, D.A3, D.D4, D.Fs4]], [154, [82.4, D.E3, D.B3, D.E4]]].forEach(([t, ch]) => pad(t, t + 8, ch, 0.042, 3, 4, 0.22));
motif(132, 1.9, 293.66, 0.05, 9, 3.4);
whale(150.5, 3.2, [170, 250, 215], 0.07); whale(154.6, 2.8, [210, 300, 240], 0.06); whale(158.8, 3.6, [150, 230, 190, 260], 0.07);
// 2:42 ABOVE THE CLOUDS — salir a la luz
riser(160.5, 165.2, 0.2, 300, 6000); bloom(165.2, 0.3, 2.2); [0, 4, 7, 12].forEach((s) => bell(165.25, note(s, 293.66), 0.085, 3.2));
pad(165, 180.5, [D.D3, D.A3, D.D4, D.Fs4, D.A4], 0.036, 2.5, 3, 0.38);
arp(168, 180, [D.D4, D.Fs4, D.A4, D.Fs4], 0.375, 0.04, 0.5);
// 3:00 BEYOND THE STARS — empieza el clímax
[[180, [123.47, D.Fs3, D.B3, D.D4]], [187, [98, D.G3, D.B3, D.D4]], [194, [110, D.E3, D.A3, D.Cs4, D.E4]]].forEach(([t, ch]) => { pad(t, t + 7, ch, 0.045, 2.5, 3, 0.4); arp(t, t + 7, ch.slice(1), 0.25, 0.04, 0.45); });
sweep(189.8, 196.8, 400, 4200, 0.2, 0.8, 0.2);
[188, 190, 192, 194, 196, 197, 198, 199, 200].forEach((t, k) => thump(t, 84, 60, 0.08 + k * 0.016, 0.3));
// 3:21 THE REVEAL — reunir, y el golpe final
pad(201, 208.1, [110, D.E3, D.A3, D.Cs4, D.E4, D.A4], 0.04, 4, 0.3, 0.45);
for (let t = 201.2; t < 208; t += 0.125) bell(t, note([0, 4, 7, 12, 16, 19][Math.floor(rnd() * 6)], 440) * (rnd() < 0.5 ? 1 : 2), 0.012 + 0.03 * ss(201, 208, t), 0.25, 0.2 + rnd() * 0.6);
riser(202, 208.06, 0.34, 250, 8000);
thump(208.08, 140, 50, 0.5, 1.1); bloom(208.08, 0.48, 2.8);
pad(208.1, 215.4, [D.D2 * 2, D.A3, D.D4, D.Fs4, D.A4], 0.055, 0.15, 3.5, 0.45);
motif(208.2, 0.72, 587.33, 0.11, 9, 2.6); motif(208.2, 0.72, 293.66, 0.07, 9, 2.6);
// 3:35 aterrizaje: el acorde de CLOUDS, que se queda
pad(214.6, 221, [130.8, 196, 261.6, 392], 0.045, 3, 0.2, 0.25);
[392, 523.25, 784].forEach((f, k) => bell(215.6 + k * 0.9, f, 0.05, 3));

// ═════════════ reverb (Schroeder) sobre el envío ═════════════
function reverb(x, combs, aps) {
  const out = new Float32Array(N);
  for (const [d, fb] of combs) { const buf = new Float32Array(d); let p = 0, lp = 0; for (let i = 0; i < N; i++) { const y = buf[p]; lp += (y - lp) * 0.35; buf[p] = x[i] + lp * fb; out[i] += y; if (++p >= d) p = 0; } }
  for (const d of aps) { const buf = new Float32Array(d); let p = 0; for (let i = 0; i < N; i++) { const b = buf[p], v = out[i] + b * 0.5; buf[p] = v; out[i] = b - v * 0.5; if (++p >= d) p = 0; } }
  return out;
}
const wetL = reverb(SL, [[1557, 0.84], [1617, 0.83], [1491, 0.85], [1422, 0.86]], [225, 556]);
const wetR = reverb(SRv, [[1580, 0.84], [1640, 0.83], [1514, 0.85], [1445, 0.86]], [248, 579]);
for (let i = 0; i < N; i++) { L[i] += wetL[i] * 0.16; R[i] += wetR[i] * 0.16; }

// corte de graves a 45 Hz, limitador blando y normalización a −1 dBFS
const hp = (x) => { const rc = 1 / (TAU * 45), a = rc / (rc + 1 / SR); let y = 0, px = 0; for (let i = 0; i < N; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } };
hp(L); hp(R);
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const drive = 2.3 / peak;                                  // el limitador trabaja solo en los golpes
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * drive); R[i] = Math.tanh(R[i] * drive); }
let pk2 = 0; for (let i = 0; i < N; i++) pk2 = Math.max(pk2, Math.abs(L[i]), Math.abs(R[i]));
const g = Math.pow(10, -1 / 20) / pk2;
let mono = 0, st = 0; for (let i = 0; i < N; i += 97) { mono += Math.abs((L[i] + R[i]) / 2); st += (Math.abs(L[i]) + Math.abs(R[i])) / 2; }
const out = resolve(process.argv[2] || 'dist/packages/SH-001/audio.wav');
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
console.log(`AUDIO · SH-001 · ${DUR}s · pico −1 dBFS · compatibilidad mono ${(100 * mono / st).toFixed(0)} % → ${out}`);
