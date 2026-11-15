/**
 * SINTETIZADOR DE MAQUETAS — una mesa de mezcla mínima para componer sobre la
 * línea de tiempo de cada pieza. Sale siempre WAV 48 kHz estéreo PCM 16, con
 * corte de graves a 45 Hz (Sonos por Bluetooth), limitador blando y −1 dBFS.
 *
 *   const m = mix(60, 'SH-003');
 *   m.pad(0, 20, [146.8, 220, 293.7], 0.04); m.thump(18, 120, 52, 0.4);
 *   m.write('dist/packages/SH-003/audio.wav');
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export const SR = 48000;
const TAU = Math.PI * 2;
export const MOTIF = [0, 7, 12, 11, 7, 9, 7, 4, 2];           // el motivo de UNIVERSO 1/1
export const note = (semi, base = 293.66) => base * Math.pow(2, semi / 12);
export const CHORD = {                                         // acordes de reposo de cada mundo
  clouds: [130.8, 196, 261.6, 392], ocean: [110, 165, 220, 329.4], jungle: [98, 146.8, 196, 261.6],
  galaxy: [82.4, 123.4, 164.8, 247], redroom: [98, 116.6, 146.8, 196]
};

export function mix(seconds, seedText = 'u11') {
  const DUR = seconds + 0.5, N = Math.round(DUR * SR);
  const L = new Float32Array(N), R = new Float32Array(N), SL = new Float32Array(N), SRv = new Float32Array(N);
  let seed = [...seedText].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const put = (i, v, pan = 0.5, send = 0) => { if (i < 0 || i >= N) return; const l = v * Math.cos(pan * Math.PI / 2), r = v * Math.sin(pan * Math.PI / 2); L[i] += l; R[i] += r; if (send) { SL[i] += l * send; SRv[i] += r * send; } };
  const m = { rnd, ss, seconds, DUR };

  /** Colchón: cada nota con dos voces desafinadas, una a cada lado. */
  m.pad = (t0, t1, freqs, amp, att = 3, rel = 4, bright = 0.3) => {
    for (const f of freqs) for (const [det, pan] of [[-0.0022, 0.38], [0.0022, 0.62]]) {
      const ff = f * (1 + det), ph = rnd() * TAU, lfo = 0.07 + rnd() * 0.1, lp = rnd() * TAU;
      for (let i = Math.max(0, Math.round(t0 * SR)), e = Math.min(N, Math.round((t1 + rel) * SR)); i < e; i++) {
        const t = i / SR, env = ss(t0, t0 + att, t) * (1 - ss(t1, t1 + rel, t)), x = TAU * ff * t + ph;
        put(i, (Math.sin(x) + bright * Math.sin(2 * x) + bright * 0.4 * Math.sin(3 * x)) * env * amp * (0.82 + 0.18 * Math.sin(TAU * lfo * t + lp)), pan, 0.25);
      }
    }
  };
  /** Campana o piano blando. */
  m.bell = (t0, f, amp = 0.12, decay = 1.6, pan = 0.5, send = 0.6) => {
    const i0 = Math.round(t0 * SR);
    for (let j = 0, n = Math.round(decay * 5 * SR); j < n; j++) { const t = j / SR, e = Math.exp(-t / decay) * ss(0, 0.004, t);
      put(i0 + j, (Math.sin(TAU * f * t) + 0.36 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 2.2) + 0.14 * Math.sin(TAU * 3.01 * f * t) * Math.exp(-t * 4.5)) * e * amp, pan, send); }
  };
  /** Pulso electrónico: onda cuadrada suavizada, corta. */
  m.pluck = (t0, f, amp = 0.06, decay = 0.18, pan = 0.5) => {
    const i0 = Math.round(t0 * SR);
    for (let j = 0, n = Math.round(decay * 6 * SR); j < n; j++) { const t = j / SR, x = TAU * f * t;
      put(i0 + j, (Math.sin(x) + 0.33 * Math.sin(3 * x) + 0.2 * Math.sin(5 * x)) * Math.exp(-t / decay) * ss(0, 0.002, t) * amp, pan, 0.35); }
  };
  /** Golpe grave: seno que cae de tono. */
  m.thump = (t0, f0, f1, amp, decay = 0.5) => {
    const i0 = Math.round(t0 * SR); let ph = 0;
    for (let j = 0, n = Math.round(decay * 6 * SR); j < n; j++) { const t = j / SR, f = f1 + (f0 - f1) * Math.exp(-t * 9); ph += TAU * f / SR; put(i0 + j, Math.sin(ph) * Math.exp(-t / decay) * ss(0, 0.003, t) * amp, 0.5, 0.1); }
  };
  /** Barrido de ruido que viaja en frecuencia y en panorama. */
  m.sweep = (t0, t1, f0, f1, amp, pan0 = 0.5, pan1 = 0.5, shape = 1.3, q = 0.5) => {
    let low = 0, band = 0;
    for (let i = Math.round(t0 * SR), e = Math.round(t1 * SR); i < e; i++) { const p = (i / SR - t0) / (t1 - t0), fc = f0 * Math.pow(f1 / f0, p), fq = 2 * Math.sin(Math.PI * Math.min(0.24, fc / SR));
      const hi = (rnd() * 2 - 1) - low - q * band; band += fq * hi; low += fq * band;
      put(i, band * Math.pow(Math.sin(Math.PI * p), shape) * amp, pan0 + (pan1 - pan0) * p, 0.3); }
  };
  /** Subida: ruido que se abre hasta un punto y se corta ahí. */
  m.riser = (t0, t1, amp, f0 = 300, f1 = 7000) => {
    let low = 0, band = 0;
    for (let i = Math.round(t0 * SR), e = Math.round(t1 * SR); i < e; i++) { const p = (i / SR - t0) / (t1 - t0), fc = f0 * Math.pow(f1 / f0, p), fq = 2 * Math.sin(Math.PI * Math.min(0.24, fc / SR));
      const hi = (rnd() * 2 - 1) - low - 0.6 * band; band += fq * hi; low += fq * band; put(i, band * p * p * amp, 0.5, 0.2); }
  };
  /** Lecho de ruido filtrado: aire, agua, fuego. */
  m.bed = (t0, t1, cut, amp, att = 3, rel = 4, wob = 0.11) => {
    let a = 0, b = 0; const k = 1 - Math.exp(-TAU * cut / SR);
    for (let i = Math.max(0, Math.round(t0 * SR)), e = Math.min(N, Math.round((t1 + rel) * SR)); i < e; i++) { const t = i / SR; a += ((rnd() * 2 - 1) - a) * k; b += ((rnd() * 2 - 1) - b) * k;
      const env = ss(t0, t0 + att, t) * (1 - ss(t1, t1 + rel, t)) * (0.7 + 0.3 * Math.sin(TAU * wob * t)) * amp; L[i] += a * env; R[i] += b * env; }
  };
  /** Estallido de luz: ruido brillante que cae. */
  m.bloom = (t0, amp, decay = 1.4) => {
    let lp = 0; const i0 = Math.round(t0 * SR);
    for (let j = 0, n = Math.round(decay * 5 * SR); j < n; j++) { const t = j / SR; lp += ((rnd() * 2 - 1) - lp) * (0.03 + 0.3 * Math.exp(-t * 2.5)); put(i0 + j, lp * Math.exp(-t / decay) * ss(0, 0.02, t) * amp, 0.3 + 0.4 * rnd(), 0.5); }
  };
  /** Chasquido: percusión orgánica (madera) o chispa (agudo). */
  m.tick = (t0, amp, f = 900, k = 60) => { const i0 = Math.round(t0 * SR); for (let j = 0; j < SR * 0.14; j++) { const t = j / SR; put(i0 + j, (Math.sin(TAU * f * t) * 0.6 + (rnd() * 2 - 1) * 0.4) * Math.exp(-t * k) * amp, 0.35 + 0.3 * rnd(), 0.5); } };
  /** Charles electrónico: ruido agudo muy corto. */
  m.hat = (t0, amp) => { const i0 = Math.round(t0 * SR); let p = 0; for (let j = 0; j < SR * 0.06; j++) { const t = j / SR, x = rnd() * 2 - 1, hp = x - p; p = x; put(i0 + j, hp * Math.exp(-t * 90) * amp, 0.4 + 0.2 * rnd(), 0.15); } };
  m.motif = (t0, step, base, amp, n = MOTIF.length, decay = 1.8) => { for (let k = 0; k < n; k++) m.bell(t0 + k * step, note(MOTIF[k], base), amp * (k === 2 ? 1.15 : 1), decay, 0.42 + 0.16 * (k % 2)); };
  m.arp = (t0, t1, freqs, step, amp, decay = 0.5, voice = 'bell') => { let k = 0; for (let t = t0; t < t1; t += step, k++) { const f = freqs[k % freqs.length] * (Math.floor(k / freqs.length) % 2 ? 2 : 1); const a = amp * (0.75 + 0.25 * ss(t0, t1, t)), pan = 0.3 + 0.4 * ((k * 0.37) % 1); voice === 'pluck' ? m.pluck(t, f, a, decay, pan) : m.bell(t, f, a, decay, pan, 0.5); } };
  /** Destellos: campanitas agudas al azar dentro de una escala. */
  m.sparkle = (t0, t1, count, base = 880, amp = 0.02, scale = [0, 2, 4, 7, 9, 12, 14]) => { for (let k = 0; k < count; k++) m.bell(t0 + rnd() * (t1 - t0), note(scale[Math.floor(rnd() * scale.length)], base), amp * (0.6 + 0.8 * rnd()), 0.5, 0.3 + rnd() * 0.4); };
  /** Entrada: el golpe blando que tapa el fundido. */
  m.intro = (amp = 0.3) => { m.bloom(0.35, amp, 1.4); m.thump(0.35, 100, 58, amp * 0.6, 0.5); };
  /** Aterrizaje: el acorde del mundo de llegada, sostenido hasta el final. */
  m.land = (world, from, amp = 0.045) => { m.pad(from, DUR + 1, CHORD[world], amp, 3, 0.2, 0.25); [CHORD[world][3], CHORD[world][3] * 1.5].forEach((f, k) => m.bell(from + 1 + k * 0.9, f * 2, 0.04, 3)); };

  m.write = (path, { drive = m.drive ?? 2.3, reverb = 0.16, targetRms = m.targetRms ?? -15 } = {}) => {
    const rv = (x, combs, aps) => { const out = new Float32Array(N);
      for (const [d, fb] of combs) { const buf = new Float32Array(d); let p = 0, lp = 0; for (let i = 0; i < N; i++) { const y = buf[p]; lp += (y - lp) * 0.35; buf[p] = x[i] + lp * fb; out[i] += y; if (++p >= d) p = 0; } }
      for (const d of aps) { const buf = new Float32Array(d); let p = 0; for (let i = 0; i < N; i++) { const b = buf[p], v = out[i] + b * 0.5; buf[p] = v; out[i] = b - v * 0.5; if (++p >= d) p = 0; } }
      return out; };
    const wl = rv(SL, [[1557, 0.84], [1617, 0.83], [1491, 0.85], [1422, 0.86]], [225, 556]), wr = rv(SRv, [[1580, 0.84], [1640, 0.83], [1514, 0.85], [1445, 0.86]], [248, 579]);
    for (let i = 0; i < N; i++) { L[i] += wl[i] * reverb; R[i] += wr[i] * reverb; }
    const hp = (x) => { const rc = 1 / (TAU * 45), a = rc / (rc + 1 / SR); let y = 0, px = 0; for (let i = 0; i < N; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } };
    hp(L); hp(R);
    let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const d = drive / peak; for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * d); R[i] = Math.tanh(R[i] * d); }
    let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    let g = Math.pow(10, -1 / 20) / pk;
    let mono = 0, st = 0, sq = 0; for (let i = 0; i < N; i += 7) { mono += Math.abs((L[i] + R[i]) / 2); st += (Math.abs(L[i]) + Math.abs(R[i])) / 2; sq += (L[i] * g) ** 2; }
    // todas las piezas a un volumen parecido: si una queda más alta que el objetivo, se baja (el pico solo puede quedar más holgado)
    const rms = 10 * Math.log10(sq / (N / 7));
    if (rms > targetRms) { const k = Math.pow(10, (targetRms - rms) / 20); g *= k; sq *= k * k; }
    const out = resolve(path), buf = Buffer.alloc(44 + N * 4);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
    buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
    for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
    mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
    console.log(`AUDIO · ${seedText} · ${DUR}s · pico ≤ −1 dBFS · RMS ${(10 * Math.log10(sq / (N / 7))).toFixed(1)} dB · mono ${(100 * mono / st).toFixed(0)} % → ${out}`);
  };
  return m;
}
