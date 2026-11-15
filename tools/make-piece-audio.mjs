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

// ───────────────────── paletas sonoras por mundo ─────────────────────

/**
 * Cada mundo tiene su acorde, su textura y su "evento" ocasional. Lo que los
 * une es que todos están construidos igual: acordes que cruzan muy lento,
 * una capa de ruido filtrado con movimiento propio, y algo que pasa cada
 * tanto para que el oído no se duerma.
 */
const ESTILOS = {
  'ocean-ambient': {
    acordes: [[55, 82.5, 110, 164.7], [49, 73.4, 98, 146.8], [58.3, 87.3, 116.5, 174.6], [49, 65.4, 98, 130.8]],
    compas: 48, ruido: { lento: 0.0085, medio: 0.02, rapido: 0.12, ganancia: 7.5, aire: 0.5 },
    sub: [48, 62], subGan: 0.5,
    evento: { cada: 74, dur: 5.5, f0: 150, f1: 62, gan: 0.055, armonico: 1.5 },
    destellos: { cada: 11.3, dur: 2.2, gan: 0.026, parciales: [1568, 2093, 2637, 3136] }
  },
  'clouds-ambient': {
    acordes: [[65.4, 98, 130.8, 196], [73.4, 110, 146.8, 220], [61.7, 92.5, 123.5, 185], [55, 82.5, 110, 164.7]],
    compas: 54, ruido: { lento: 0.004, medio: 0.012, rapido: 0.07, ganancia: 4.2, aire: 1.1 },
    sub: [41, 55], subGan: 0.3,
    evento: null,
    destellos: { cada: 9.1, dur: 3.4, gan: 0.034, parciales: [1046, 1318, 1760, 2093] }
  },
  'jungle-ambient': {
    acordes: [[49, 73.4, 98, 130.8], [55, 82.5, 110, 146.8], [43.7, 65.4, 87.3, 116.5], [49, 65.4, 98, 123.5]],
    compas: 42, ruido: { lento: 0.012, medio: 0.035, rapido: 0.2, ganancia: 5.5, aire: 0.8 },
    sub: [43.7, 58.3], subGan: 0.34,
    // "pájaro": dos notas cortas, cada cierto tiempo
    evento: { cada: 23, dur: 0.9, f0: 2200, f1: 1600, gan: 0.022, armonico: 1.0 },
    destellos: { cada: 6.7, dur: 1.4, gan: 0.018, parciales: [2349, 2794, 3520] }
  },
  'galaxy-ambient': {
    acordes: [[41.2, 61.7, 82.4, 123.5], [36.7, 55, 73.4, 110], [43.7, 65.4, 87.3, 130.8], [38.9, 58.3, 77.8, 116.5]],
    compas: 62, ruido: { lento: 0.003, medio: 0.008, rapido: 0.05, ganancia: 3.0, aire: 1.4 },
    sub: [32.7, 43.7], subGan: 0.62,
    evento: null,
    destellos: { cada: 7.9, dur: 4.2, gan: 0.03, parciales: [1760, 2349, 3136, 4186] }
  },
  'redroom-ambient': {
    acordes: [[49, 58.3, 73.4, 98], [43.7, 55, 65.4, 87.3], [46.2, 58.3, 69.3, 92.5], [41.2, 49, 61.7, 82.4]],
    compas: 38, ruido: { lento: 0.006, medio: 0.016, rapido: 0.09, ganancia: 2.4, aire: 0.35 },
    sub: [41.2, 49], subGan: 0.56,
    evento: null,
    destellos: { cada: 14.6, dur: 2.8, gan: 0.014, parciales: [880, 1174, 1568] }
  }
};

function ambienteDeMundo(seconds, opts = {}, estilo = 'ocean-ambient') {
  const E = ESTILOS[estilo] || ESTILOS['ocean-ambient'];
  const n = Math.round(SR * seconds);
  const L = new Float32Array(n), R = new Float32Array(n);
  const noise = mulberry(0x0cea17);
  const rollHz = opts.bassRolloffHz ?? 45;

  let lpA = 0, lpB = 0, lpC = 0, prev = 0, hpState = 0;
  const hpK = Math.exp(-2 * Math.PI * rollHz / SR);

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let l = 0, r = 0;

    // ── pad armónico: cruza entre acordes sin que se note el cambio
    const ci = t / E.compas;
    const c0 = E.acordes[Math.floor(ci) % 4], c1 = E.acordes[(Math.floor(ci) + 1) % 4];
    const k = smooth(0, 1, ci % 1);
    for (let h = 0; h < 4; h++) {
      const f = c0[h] * (1 - k) + c1[h] * k;
      const det = Math.sin(2 * Math.PI * (0.013 + h * 0.007) * t) * 1.6;
      const amp = 0.17 / (h * 0.65 + 1);
      const pan = h % 2 === 0 ? -0.22 : 0.22;
      const v = (Math.sin(2 * Math.PI * (f + det) * t + h)
               + Math.sin(2 * Math.PI * (f - det * 0.6) * t + h * 2.1)) * 0.5;
      l += v * amp * (1 - pan); r += v * amp * (1 + pan);
    }

    // ── textura: ruido filtrado con dos movimientos lentos distintos
    const w = noise();
    lpA += (w - lpA) * E.ruido.lento;
    lpB += (lpA - lpB) * E.ruido.medio;
    lpC += (w - lpC) * E.ruido.rapido;
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * t / 31.0);
    const hiss = 0.35 + 0.3 * Math.sin(2 * Math.PI * t / 19.0 + 1.1);
    const textura = lpB * E.ruido.ganancia * swell + lpC * E.ruido.aire * hiss;
    l += textura * 0.34; r += textura * 0.31 + lpC * 0.05;

    // ── presencia grave, contenida para Bluetooth
    const sub = Math.sin(2 * Math.PI * E.sub[0] * t) * 0.1 + Math.sin(2 * Math.PI * E.sub[1] * t + 1.4) * 0.06;
    const subEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / 26.0);
    l += sub * subEnv * E.subGan; r += sub * subEnv * E.subGan;

    // ── lo que pasa cada tanto: es lo que impide que el oído se duerma
    if (E.evento) {
      const wp = t % E.evento.cada;
      if (wp < E.evento.dur) {
        const u = wp / E.evento.dur;
        const e = Math.pow(Math.sin(Math.PI * u), 1.6);
        const f1 = E.evento.f0 - (E.evento.f0 - E.evento.f1) * Math.pow(u, 0.8);
        const v = Math.sin(2 * Math.PI * f1 * t)
                + Math.sin(2 * Math.PI * f1 * E.evento.armonico * t + 1) * 0.3;
        l += v * e * E.evento.gan; r += v * e * E.evento.gan * 0.88;
      }
    }

    // ── destellos agudos, escasos
    if (E.destellos) {
      const sp = t % E.destellos.cada;
      if (sp < E.destellos.dur) {
        const u = sp / E.destellos.dur;
        const e = Math.exp(-u * 4.5) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / 53));
        let s2 = 0;
        for (let p = 0; p < E.destellos.parciales.length; p++) {
          s2 += Math.sin(2 * Math.PI * E.destellos.parciales[p] * t + p) / (p + 2);
        }
        const pan = Math.sin(2 * Math.PI * t / 17);
        l += s2 * e * E.destellos.gan * (1 - pan * 0.4);
        r += s2 * e * E.destellos.gan * (1 + pan * 0.4);
      }
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

console.log(`AUDIO · ${piece.id} ${piece.name} · ${piece.audio.style || 'ocean-ambient'} · ${loopSec}s`);
let { L, R } = ambienteDeMundo(loopSec + overlapSec, piece.audio, piece.audio.style || 'ocean-ambient');
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
