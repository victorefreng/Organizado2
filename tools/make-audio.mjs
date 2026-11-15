/**
 * AUDIO MAESTRO + LTC para un plano.
 *
 * Produce dos WAV de 48 kHz / 16 bits:
 *   1. <id>-master.wav  — música y efectos, estéreo, con los tres cues marcados
 *      musicalmente en sus timecodes exactos.
 *   2. <id>-ltc.wav     — LTC SMPTE 30 fps no-drop, mono. Es lo que engancha
 *      grandMA2 por entrada de audio para chasear el timecode del plano.
 *
 * Sin dependencias: sintetiza por suma de osciladores y escribe el WAV a mano.
 * Determinista: el mismo shot.json produce siempre el mismo archivo.
 *
 * Uso: node tools/make-audio.mjs production/ocean-test/shot.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

// ─────────────────────────── WAV ───────────────────────────

function writeWav(path, channels, sampleRate) {
  const n = channels[0].length;
  const ch = channels.length;
  const bytes = n * ch * 2;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);          // tamaño del bloque fmt
  buf.writeUInt16LE(1, 20);           // PCM
  buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * ch * 2, 28);
  buf.writeUInt16LE(ch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      let v = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(v * 32767), o);
      o += 2;
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return bytes + 44;
}

// ─────────────────────────── utilidades ───────────────────────────

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Envolvente ataque–sostenido–caída en segundos. */
function env(t, start, attack, hold, release) {
  if (t < start) return 0;
  const u = t - start;
  if (u < attack) return smooth(0, attack, u);
  if (u < attack + hold) return 1;
  const r = u - attack - hold;
  return r < release ? 1 - smooth(0, release, r) : 0;
}
/** Ruido determinista (mulberry32) */
function makeNoise(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

// ─────────────────────────── síntesis del master ───────────────────────────

function synthMaster(shot) {
  const sr = shot.format.audioSampleRate;
  const dur = shot.format.duration;
  const n = Math.round(sr * dur);
  const L = new Float32Array(n);
  const R = new Float32Array(n);

  const [c1, c2, c3] = shot.cues.map((c) => c.seconds);
  const noise = makeNoise(0x0ce4);

  // filtros de un polo para el agua
  let lp1 = 0, lp2 = 0, hp = 0, prev = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let l = 0, r = 0;

    // ── SUB: la masa del animal. Entra en el cue 1, culmina en el 2, se retira en el 3.
    const subEnv =
      env(t, c1 - 0.6, 1.4, c2 - c1 + 1.0, 0) * 0.55 +
      env(t, c2 - 0.25, 0.5, 1.6, 2.2) * 0.45 +
      env(t, c3, 0.4, 0.3, dur - c3 - 0.5) * 0.25;
    const sub =
      Math.sin(2 * Math.PI * 41 * t) * 0.62 +
      Math.sin(2 * Math.PI * 55 * t + 0.7) * 0.3 +
      Math.sin(2 * Math.PI * 27.5 * t) * 0.22;
    l += sub * subEnv * 0.38;
    r += sub * subEnv * 0.38;

    // ── PAD: acorde suspendido que no resuelve hasta el cue 3.
    const padEnv = smooth(0, 2.2, t) * (1 - smooth(c3 + 0.8, dur, t) * 0.55);
    // antes del cue 3 el pad está en suspensión; después baja una quinta
    const root = t < c3 ? 110 : 110 * Math.pow(2, -7 / 12);
    const glide = t < c3 ? 1 : 1 + (1 - smooth(c3, c3 + 1.2, t)) * 0.05;
    for (let h = 0; h < 5; h++) {
      const mult = [1, 1.5, 2, 3, 4.5][h];
      const det = Math.sin(2 * Math.PI * (0.07 + h * 0.013) * t) * 2.2;
      const f = root * mult * glide + det;
      const amp = (0.26 / (h + 1)) * padEnv;
      const pan = (h % 2 === 0 ? -1 : 1) * 0.3;
      const v = Math.sin(2 * Math.PI * f * t + h);
      l += v * amp * (1 - pan * 0.5);
      r += v * amp * (1 + pan * 0.5);
    }

    // ── AGUA: ruido filtrado con movimiento lento. Nunca estático.
    const w = noise();
    lp1 += (w - lp1) * 0.035;
    lp2 += (lp1 - lp2) * 0.05;
    const cut = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.09 * t);
    hp = lp2 - prev * 0.5; prev = lp2;
    const water = (lp2 * cut + hp * 0.3) * 2.6;
    const waterEnv = 0.34 + 0.22 * smooth(c1, c2, t);
    l += water * waterEnv;
    r += water * 0.92 * waterEnv;

    // ── CANTO DE BALLENA: glissando descendente en el cue 2.
    if (t > c2 - 0.3 && t < c2 + 3.2) {
      const u = clamp01((t - (c2 - 0.3)) / 3.5);
      const vib = 1 + Math.sin(2 * Math.PI * 5.2 * t) * 0.012;
      const f1 = (182 - 90 * Math.pow(u, 0.75)) * vib;
      const we = env(t, c2 - 0.3, 0.45, 1.1, 1.9);
      const v1 = Math.sin(2 * Math.PI * f1 * t);
      const v2 = Math.sin(2 * Math.PI * f1 * 1.49 * t + 1.1) * 0.34;
      const v3 = Math.sin(2 * Math.PI * f1 * 0.5 * t) * 0.28;
      l += (v1 + v2 + v3) * we * 0.2 * 0.92;
      r += (v1 + v2 + v3) * we * 0.2;
    }

    // ── BRILLOS: floración en el cue 2, cola larga hasta el final.
    const shimEnv = env(t, c2 - 0.1, 0.35, 1.0, 4.2) * 0.7 + env(t, c3, 0.5, 0.2, 1.8) * 0.3;
    if (shimEnv > 0.001) {
      let sh = 0;
      const partials = [1318.5, 1760, 2093, 2637, 3520];
      for (let k = 0; k < partials.length; k++) {
        const ph = k * 1.7;
        const trem = 0.55 + 0.45 * Math.sin(2 * Math.PI * (0.8 + k * 0.23) * t + ph);
        sh += Math.sin(2 * Math.PI * partials[k] * t + ph) * trem / (k + 2);
      }
      const panS = Math.sin(2 * Math.PI * 0.11 * t);
      l += sh * shimEnv * 0.052 * (1 - panS * 0.35);
      r += sh * shimEnv * 0.052 * (1 + panS * 0.35);
    }

    // ── fundidos de entrada y salida del plano
    const fade = smooth(0, 0.35, t) * (1 - smooth(dur - 0.6, dur, t));
    L[i] = l * fade;
    R[i] = r * fade;
  }

  // normalización al pico objetivo
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const target = Math.pow(10, (shot.audio.peakTarget ?? -1) / 20);
  const g = peak > 0 ? target / peak : 1;
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }

  return { L, R, sr, peak, gain: g };
}

// ─────────────────────────── LTC SMPTE ───────────────────────────

/**
 * Construye los 80 bits de un frame LTC (SMPTE 12M).
 * Orden de transmisión: bit 0 primero. BCD con LSB primero en cada campo.
 */
function ltcFrame(h, m, s, f, dropFrame = false) {
  const bits = new Uint8Array(80);
  const put = (start, len, value) => {
    for (let i = 0; i < len; i++) bits[start + i] = (value >> i) & 1;
  };
  put(0, 4, f % 10);        // unidades de frame
  put(8, 2, Math.floor(f / 10));
  bits[10] = dropFrame ? 1 : 0;
  bits[11] = 0;             // color frame
  put(16, 4, s % 10);       // unidades de segundo
  put(24, 3, Math.floor(s / 10));
  put(32, 4, m % 10);       // unidades de minuto
  put(40, 3, Math.floor(m / 10));
  put(48, 4, h % 10);       // unidades de hora
  put(56, 2, Math.floor(h / 10));

  // palabra de sincronismo, bits 64..79: 0011111111111101
  const sync = '0011111111111101';
  for (let i = 0; i < 16; i++) bits[64 + i] = sync.charCodeAt(i) - 48;

  // Bit 27: corrección de polaridad. El total de unos debe ser PAR para que
  // cada frame empiece con la misma polaridad al decodificar.
  let ones = 0;
  for (let i = 0; i < 80; i++) ones += bits[i];
  bits[27] = ones % 2 === 0 ? 0 : 1;
  return bits;
}

/** Codifica en biphase mark: transición en cada bit; los '1' añaden otra a mitad. */
function synthLtc(shot) {
  const sr = shot.format.audioSampleRate;
  const fps = shot.format.fps;
  const dur = shot.format.duration;
  const frames = Math.round(dur * fps);
  const samplesPerFrame = sr / fps;
  if (!Number.isInteger(samplesPerFrame / 80)) {
    // 48000/30/80 = 20 exacto. Si alguien cambia el fps, avisamos.
    console.warn(`  ⚠ ${sr} Hz a ${fps} fps da ${samplesPerFrame / 80} muestras por bit (no entero): el LTC tendrá jitter.`);
  }
  const perBit = samplesPerFrame / 80;
  const n = Math.round(sr * dur);
  const out = new Float32Array(n);

  const [sh, sm, ss, sf] = (shot.audio.startTimecode || '00:00:00:00').split(':').map(Number);
  const startFrame = ((sh * 60 + sm) * 60 + ss) * fps + sf;

  let level = 1;
  let idx = 0;
  const amp = 0.5; // −6 dBFS, nivel sano para una entrada de consola

  for (let fr = 0; fr < frames; fr++) {
    const abs = startFrame + fr;
    const f = abs % fps;
    const totalSec = Math.floor(abs / fps);
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600) % 24;
    const bits = ltcFrame(h, m, s, f, false);

    for (let b = 0; b < 80; b++) {
      const startS = Math.round((fr * 80 + b) * perBit);
      const endS = Math.round((fr * 80 + b + 1) * perBit);
      level = -level;                       // transición al inicio de cada bit
      if (bits[b] === 1) {
        const mid = Math.round((startS + endS) / 2);
        for (let i = startS; i < mid && i < n; i++) out[i] = level * amp;
        level = -level;                     // transición extra a mitad: es un '1'
        for (let i = mid; i < endS && i < n; i++) out[i] = level * amp;
      } else {
        for (let i = startS; i < endS && i < n; i++) out[i] = level * amp;
      }
      idx = endS;
    }
  }
  for (let i = idx; i < n; i++) out[i] = 0;
  return { data: out, sr, frames };
}

/** Decodifica el LTC generado para comprobar que es válido. */
function verifyLtc(signal, sr, fps) {
  const perBit = sr / fps / 80;
  // detectar transiciones
  const trans = [];
  for (let i = 1; i < signal.length; i++) {
    if ((signal[i - 1] < 0) !== (signal[i] < 0)) trans.push(i);
  }
  // reconstruir bits: una transición por bit = 0, dos = 1
  const bits = [];
  let i = 0;
  while (i < trans.length - 1) {
    const gap = trans[i + 1] - trans[i];
    if (gap < perBit * 0.75) { bits.push(1); i += 2; }
    else { bits.push(0); i += 1; }
  }
  // buscar la palabra de sincronismo y leer el primer timecode completo
  const sync = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1];
  for (let p = 0; p + 80 <= bits.length; p++) {
    let ok = true;
    for (let k = 0; k < 16; k++) if (bits[p + 64 + k] !== sync[k]) { ok = false; break; }
    if (!ok) continue;
    const rd = (st, len) => { let v = 0; for (let k = 0; k < len; k++) v |= bits[p + st + k] << k; return v; };
    const f = rd(0, 4) + rd(8, 2) * 10;
    const s = rd(16, 4) + rd(24, 3) * 10;
    const m = rd(32, 4) + rd(40, 3) * 10;
    const h = rd(48, 4) + rd(56, 2) * 10;
    return { ok: true, first: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`, framesDecoded: Math.floor(bits.length / 80) };
  }
  return { ok: false };
}

// ─────────────────────────── main ───────────────────────────

const shotPath = resolve(process.argv[2] || 'production/ocean-test/shot.json');
const shot = JSON.parse(readFileSync(shotPath, 'utf8'));
const base = dirname(shotPath);

console.log(`AUDIO · ${shot.name} · ${shot.format.duration}s @ ${shot.format.audioSampleRate} Hz`);

const master = synthMaster(shot);
const masterPath = join(base, shot.audio.master);
writeWav(masterPath, [master.L, master.R], master.sr);
console.log(`  master → ${masterPath}`);
console.log(`           pico antes de normalizar ${(20 * Math.log10(master.peak)).toFixed(1)} dBFS → ${shot.audio.peakTarget} dBFS`);
for (const c of shot.cues) {
  console.log(`           cue ${c.number} @ ${c.timecode} (${c.seconds.toFixed(3)}s) — ${c.name}`);
}

const ltc = synthLtc(shot);
const ltcPath = join(base, shot.audio.ltc);
writeWav(ltcPath, [ltc.data], ltc.sr);
const check = verifyLtc(ltc.data, ltc.sr, shot.format.fps);
console.log(`  LTC    → ${ltcPath}`);
console.log(`           SMPTE ${shot.format.fps} fps no-drop · ${ltc.frames} frames · arranca en ${shot.audio.startTimecode}`);
console.log(`           verificación por decodificación: ${check.ok ? `OK, primer timecode leído ${check.first}, ${check.framesDecoded} frames` : 'FALLÓ'}`);
if (!check.ok) process.exitCode = 1;
