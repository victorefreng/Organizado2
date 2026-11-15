/**
 * AUDIO DE UNA PIEZA — Brief Maestro V3.2 §5.3.
 *
 * WAV 48 kHz estéreo PCM 16 bits, desde el tiempo cero, 1 dB de margen de pico.
 * SIN LTC ni timecode: ese lo genera UNIVERSO CONTROL.
 *
 * Mezclado pensando para una Sonos por Bluetooth: graves contenidos con corte
 * bajo, nada que dependa de un estéreo muy abierto (la información importante
 * sobrevive en mono) y sin transitorios que el códec de Bluetooth embarre.
 *
 * Los mundos salen en bucle perfecto: se sintetiza con solape y se cruza el
 * final sobre el principio, igual que el vídeo.
 *
 * Uso: node tools/make-piece-audio.mjs production/pieces/AMBIENT-002/piece.json salida.wav
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SR = 48000;

// ─────────────────────────── WAV ───────────────────────────
function writeWav(path, chans, sr = SR) {
  const n = chans[0].length, ch = chans.length, bytes = n * ch * 2;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(ch, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * ch * 2, 28); buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, chans[c][i])) * 32767), o); o += 2;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
}

const mulberry = (seed) => { let a = seed >>> 0; return () => {
  a = (a + 0x6d2b79f5) >>> 0; let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1; }; };

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ───────────────────── ambiente de océano ─────────────────────

function oceanAmbient(seconds, opts = {}) {
  const n = Math.round(SR * seconds);
  const L = new Float32Array(n), R = new Float32Array(n);
  const noise = mulberry(0x0cea17);
  const rollHz = opts.bassRolloffHz ?? 45;

  // acordes muy lentos: cuatro estados, 48 s cada uno
  const CHORDS = [
    [55, 82.5, 110, 164.7],      // La  suspendido
    [49, 73.4, 98, 146.8],       // Sol
    [58.3, 87.3, 116.5, 174.6],  // Si bemol
    [49, 65.4, 98, 130.8]        // Sol con sexta
  ];
  const CHORD_SEC = 48;

  let lpA = 0, lpB = 0, lpC = 0, prev = 0, hpState = 0;
  // coeficiente del paso alto para contener graves en Bluetooth
  const hpK = Math.exp(-2 * Math.PI * rollHz / SR);

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let l = 0, r = 0;

    // ── pad armónico: cruza entre acordes sin que se note el cambio
    const ci = (t / CHORD_SEC);
    const c0 = CHORDS[Math.floor(ci) % 4], c1 = CHORDS[(Math.floor(ci) + 1) % 4];
    const k = smooth(0, 1, (ci % 1));
    for (let h = 0; h < 4; h++) {
      const f = c0[h] * (1 - k) + c1[h] * k;
      const det = Math.sin(2 * Math.PI * (0.013 + h * 0.007) * t) * 1.6;
      const amp = 0.17 / (h * 0.65 + 1);
      const pan = h % 2 === 0 ? -0.22 : 0.22;
      // dos osciladores ligeramente desafinados: el pad respira solo
      const v = (Math.sin(2 * Math.PI * (f + det) * t + h)
               + Math.sin(2 * Math.PI * (f - det * 0.6) * t + h * 2.1)) * 0.5;
      l += v * amp * (1 - pan); r += v * amp * (1 + pan);
    }

    // ── agua: tres capas de ruido filtrado con movimientos distintos
    const w = noise();
    lpA += (w - lpA) * 0.0085;
    lpB += (lpA - lpB) * 0.02;
    lpC += (w - lpC) * 0.12;
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * t / 31.0);
    const hiss = 0.35 + 0.3 * Math.sin(2 * Math.PI * t / 19.0 + 1.1);
    const water = lpB * 7.5 * swell + lpC * 0.5 * hiss;
    // descorrelación suave entre canales: ancho sin romper el mono
    l += water * 0.34; r += water * 0.31 + lpC * 0.05;

    // ── presión: sub muy contenido
    const sub = Math.sin(2 * Math.PI * 48 * t) * 0.1 + Math.sin(2 * Math.PI * 62 * t + 1.4) * 0.06;
    const subEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 26.0);
    l += sub * subEnv * 0.5; r += sub * subEnv * 0.5;

    // ── canto de ballena lejano cada ~74 s: la única cosa que "pasa"
    const wp = t % 74;
    if (wp < 5.5) {
      const u = wp / 5.5;
      const e = Math.sin(Math.PI * u) ** 1.6;
      const f1 = 150 - 62 * Math.pow(u, 0.8);
      const v = Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f1 * 1.5 * t + 1) * 0.3;
      l += v * e * 0.055; r += v * e * 0.048;
    }

    // ── bioluminiscencia: destellos escasos y agudos
    const sp = t % 11.3;
    if (sp < 2.2) {
      const u = sp / 2.2;
      const e = Math.exp(-u * 4.5) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / 53));
      let s = 0;
      for (let p = 0; p < 4; p++) {
        s += Math.sin(2 * Math.PI * [1568, 2093, 2637, 3136][p] * t + p) / (p + 2);
      }
      const pan = Math.sin(2 * Math.PI * t / 17);
      l += s * e * 0.026 * (1 - pan * 0.4); r += s * e * 0.026 * (1 + pan * 0.4);
    }

    // ── corte de graves para Bluetooth
    hpState = hpK * (hpState + l - prev); prev = l;
    l = l * 0.35 + hpState * 0.65;

    L[i] = l; R[i] = r;
  }
  return { L, R };
}

// ───────────────────── bucle perfecto por solape ─────────────────────

function makeLoop(L, R, loopSec, overlapSec) {
  const loopN = Math.round(loopSec * SR), ovN = Math.round(overlapSec * SR);
  const outL = new Float32Array(loopN), outR = new Float32Array(loopN);
  for (let i = 0; i < loopN; i++) { outL[i] = L[i]; outR[i] = R[i]; }
  // la cola (loopN..loopN+ovN) se cruza sobre la cabeza
  for (let i = 0; i < ovN; i++) {
    const a = i / ovN;                 // 0 → cola, 1 → cabeza
    const fade = a * a * (3 - 2 * a);
    const tail = loopN + i;
    outL[i] = L[tail] * (1 - fade) + L[i] * fade;
    outR[i] = R[tail] * (1 - fade) + R[i] * fade;
  }
  return { L: outL, R: outR };
}

// ───────────────────── main ─────────────────────

const piecePath = resolve(process.argv[2]);
const outPath = resolve(process.argv[3]);
const piece = JSON.parse(readFileSync(piecePath, 'utf8'));
const isAmbient = piece.type === 'ambient';

const loopSec = isAmbient ? (piece.audio.minutes || 8) * 60 : piece.durationSeconds;
const overlapSec = isAmbient ? 12 : 0;

console.log(`AUDIO · ${piece.id} ${piece.name} · ${isAmbient ? 'mundo en bucle' : 'show'} · ${loopSec}s`);
let { L, R } = oceanAmbient(loopSec + overlapSec, piece.audio);
if (isAmbient) {
  ({ L, R } = makeLoop(L, R, loopSec, overlapSec));
  console.log(`  bucle perfecto por solape de ${overlapSec}s`);
}

// normalización al pico objetivo
let peak = 0;
for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const target = Math.pow(10, (piece.audio.peakTargetDb ?? -1) / 20);
const g = peak > 0 ? target / peak : 1;
for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }

// comprobación de mono: lo importante debe sobrevivir sumado
let sumMono = 0, sumStereo = 0;
for (let i = 0; i < L.length; i += 97) {
  sumMono += Math.abs((L[i] + R[i]) * 0.5);
  sumStereo += Math.abs(L[i]) * 0.5 + Math.abs(R[i]) * 0.5;
}
const monoRatio = sumMono / Math.max(1e-9, sumStereo);

writeWav(outPath, [L, R]);
console.log(`  → ${outPath}`);
console.log(`  pico original ${(20 * Math.log10(peak)).toFixed(1)} dBFS → ${piece.audio.peakTargetDb ?? -1} dBFS`);
console.log(`  compatibilidad mono ${(monoRatio * 100).toFixed(0)} %  (Sonos por Bluetooth)`);
console.log(`  corte de graves por debajo de ${piece.audio.bassRolloffHz ?? 45} Hz`);
if (monoRatio < 0.8) console.log(`  ⚠ demasiada información depende del estéreo`);
