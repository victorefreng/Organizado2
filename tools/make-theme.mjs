/**
 * EL MOTIVO DE UNIVERSO 1/1 y sus arreglos.
 *
 * El brief lo pide explícito: un motivo melódico que aparece en el opening y
 * vuelve transformado en cada capítulo, en cada transición y en la música de los
 * mundos. Se compone UNA vez y se reutiliza, igual que la estrella dorada.
 *
 * Esto es la MAQUETA: síntesis, no instrumentos reales. Sirve para fijar la
 * melodía, los tiempos y el carácter de cada arreglo, y para montar los
 * capítulos con audio de verdad mientras tanto.
 *
 * Uso: node tools/make-theme.mjs [carpeta-de-salida]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SR = 48000;
const OUT = resolve(process.argv[2] || 'production/assets/theme');

// ───────────────────────── el motivo ─────────────────────────

/**
 * Nueve notas. Forma: salto a la quinta, llegada a la octava, y un descenso
 * que no resuelve hasta la última. Es lo que le da el carácter de "asombro
 * que se vuelve ternura".
 *
 * Semitonos sobre la tónica, y duración en pulsos.
 */
const MOTIF = [
  { n: 0,  d: 1 },    // tónica
  { n: 7,  d: 1 },    // quinta: se abre
  { n: 12, d: 2 },    // octava: el asombro
  { n: 11, d: 1 },    // séptima mayor: tensión dulce
  { n: 7,  d: 1 },    // vuelve a la quinta
  { n: 9,  d: 2 },    // sexta: la pregunta
  { n: 7,  d: 1 },
  { n: 4,  d: 1 },    // tercera
  { n: 2,  d: 4 }     // segunda, suspendida: no cierra del todo
];

/** Acordes de acompañamiento, un semitono-conjunto por compás. */
const PROGRESSION = [
  [0, 7, 16],        // I
  [-3, 4, 12],       // vi
  [-7, 0, 9],        // IV
  [5, 12, 16]        // V sus
];

const ROOT = 146.83; // Re3
const semi = (n) => ROOT * Math.pow(2, n / 12);

// ───────────────────────── instrumentos ─────────────────────────

/** Piano: ataque rápido, caída exponencial, armónicos que decaen antes. */
function piano(buf, t0, freq, dur, amp, pan = 0) {
  const n = Math.round(dur * SR);
  const start = Math.round(t0 * SR);
  const partials = [1, 2, 3, 4, 5.1, 6.2];
  const weights = [1, 0.42, 0.22, 0.11, 0.05, 0.03];
  for (let i = 0; i < n && start + i < buf.L.length; i++) {
    const t = i / SR;
    // golpe: subida de 4 ms y caída exponencial
    const atk = Math.min(1, t / 0.004);
    let v = 0;
    for (let p = 0; p < partials.length; p++) {
      const decay = Math.exp(-t * (1.6 + p * 1.5));
      v += Math.sin(2 * Math.PI * freq * partials[p] * t) * weights[p] * decay;
    }
    // ruido del martillo, muy corto
    if (t < 0.012) v += (Math.random() * 2 - 1) * 0.12 * (1 - t / 0.012);
    v *= atk * amp;
    buf.L[start + i] += v * (1 - pan * 0.5);
    buf.R[start + i] += v * (1 + pan * 0.5);
  }
}

/** Cuerdas: entrada lenta, vibrato, filtro suave por suma de armónicos. */
function strings(buf, t0, freq, dur, amp, pan = 0) {
  const n = Math.round(dur * SR);
  const start = Math.round(t0 * SR);
  for (let i = 0; i < n && start + i < buf.L.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.35) * Math.min(1, (dur - t) / 0.5);
    const vib = 1 + Math.sin(2 * Math.PI * 4.6 * t) * 0.004;
    let v = 0;
    for (let p = 1; p <= 7; p++) {
      v += Math.sin(2 * Math.PI * freq * p * vib * t + p * 0.7) / (p * 1.5);
    }
    // dos secciones ligeramente desafinadas: suena a grupo, no a un oscilador
    v += Math.sin(2 * Math.PI * freq * 1.003 * t) * 0.3;
    v *= env * amp * 0.5;
    buf.L[start + i] += v * (1 - pan * 0.5);
    buf.R[start + i] += v * (1 + pan * 0.5);
  }
}

/** Caja de música / celesta: parciales inarmónicos y caída larga. */
function bells(buf, t0, freq, dur, amp, pan = 0) {
  const n = Math.round(dur * SR);
  const start = Math.round(t0 * SR);
  const ratios = [1, 2.76, 5.4, 8.9];
  const w = [1, 0.5, 0.26, 0.12];
  for (let i = 0; i < n && start + i < buf.L.length; i++) {
    const t = i / SR;
    let v = 0;
    for (let p = 0; p < ratios.length; p++) {
      v += Math.sin(2 * Math.PI * freq * ratios[p] * t) * w[p] * Math.exp(-t * (1.1 + p * 0.9));
    }
    v *= Math.min(1, t / 0.002) * amp;
    buf.L[start + i] += v * (1 - pan * 0.5);
    buf.R[start + i] += v * (1 + pan * 0.5);
  }
}

/** Pad sostenido de fondo. */
function pad(buf, t0, freq, dur, amp) {
  const n = Math.round(dur * SR);
  const start = Math.round(t0 * SR);
  for (let i = 0; i < n && start + i < buf.L.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 1.5);
    const det = Math.sin(2 * Math.PI * 0.08 * t) * 1.2;
    const v = (Math.sin(2 * Math.PI * (freq + det) * t)
             + Math.sin(2 * Math.PI * (freq * 2 - det) * t) * 0.4
             + Math.sin(2 * Math.PI * (freq * 3) * t) * 0.15) * env * amp;
    buf.L[start + i] += v * 0.9;
    buf.R[start + i] += v;
  }
}

/** Sub para los arreglos grandes. */
function sub(buf, t0, freq, dur, amp) {
  const n = Math.round(dur * SR);
  const start = Math.round(t0 * SR);
  for (let i = 0; i < n && start + i < buf.L.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.3) * Math.min(1, (dur - t) / 0.8);
    const v = Math.sin(2 * Math.PI * freq * t) * env * amp;
    buf.L[start + i] += v; buf.R[start + i] += v;
  }
}

// ───────────────────────── arreglos ─────────────────────────

const ARRANGEMENTS = {
  'intimo': {
    label: 'Íntimo — solo piano',
    uso: 'PARA TI · MESSAGES TO THE FUTURE · momentos de calma',
    bpm: 58, bars: 4, transpose: 0,
    render(buf, beat, barSec) {
      playMotif(buf, 0, beat, 0, (b, t, f, d, a) => piano(b, t, f, d, a * 0.9));
      playChords(buf, beat, barSec, 4, -12, (b, t, f, d, a) => pad(b, t, f, d, a * 0.1));
    }
  },
  'emotivo': {
    label: 'Emotivo — piano y cuerdas',
    uso: 'MEMORIES BLOOM · OUR STORY · GRAND FINALE (primera mitad)',
    bpm: 64, bars: 4, transpose: 0,
    render(buf, beat, barSec) {
      playMotif(buf, 0, beat, 0, (b, t, f, d, a) => piano(b, t, f, d, a * 0.75));
      playMotif(buf, 0.02, beat, -12, (b, t, f, d, a) => strings(b, t, f, d * 1.3, a * 0.5, -0.3));
      playChords(buf, beat, barSec, 4, -12, (b, t, f, d, a) => strings(b, t, f, d, a * 0.26, 0.35));
      playChords(buf, beat, barSec, 4, -24, (b, t, f, d, a) => pad(b, t, f, d, a * 0.14));
    }
  },
  'magico': {
    label: 'Mágico — caja de música',
    uso: 'THE MYSTERY BOX · transiciones TR · GALAXY BAR',
    bpm: 72, bars: 4, transpose: 12,
    render(buf, beat, barSec) {
      playMotif(buf, 0, beat, 0, (b, t, f, d, a) => bells(b, t, f, Math.max(d, 1.6), a * 0.6));
      playMotif(buf, beat * 0.5, beat, 12, (b, t, f, d, a) => bells(b, t, f, 1.2, a * 0.2, 0.4));
      playChords(buf, beat, barSec, 4, -24, (b, t, f, d, a) => pad(b, t, f, d, a * 0.12));
    }
  },
  'epico': {
    label: 'Épico — la revelación',
    uso: 'THE REVEAL de SH-001 · clímax de GRAND FINALE',
    bpm: 68, bars: 4, transpose: 0,
    render(buf, beat, barSec) {
      playMotif(buf, 0, beat, 0, (b, t, f, d, a) => strings(b, t, f, d * 1.2, a * 0.6, -0.25));
      playMotif(buf, 0, beat, 12, (b, t, f, d, a) => strings(b, t, f, d * 1.2, a * 0.3, 0.25));
      playMotif(buf, 0, beat, 0, (b, t, f, d, a) => piano(b, t, f, d, a * 0.5));
      playChords(buf, beat, barSec, 4, -12, (b, t, f, d, a) => strings(b, t, f, d, a * 0.3));
      playChords(buf, beat, barSec, 4, -24, (b, t, f, d, a) => sub(b, t, f, d, a * 0.22));
      playChords(buf, beat, barSec, 4, -36, (b, t, f, d, a) => pad(b, t, f, d, a * 0.1));
    }
  }
};

let CTX = { beat: 0.9, transpose: 0 };

function playMotif(buf, offset, beat, transpose, voice) {
  let t = offset;
  for (const note of MOTIF) {
    const f = semi(note.n + transpose + CTX.transpose);
    const d = note.d * beat;
    voice(buf, t, f, d * 0.98, 0.5);
    t += d;
  }
}

function playChords(buf, beat, barSec, bars, transpose, voice) {
  for (let b = 0; b < bars; b++) {
    const ch = PROGRESSION[b % PROGRESSION.length];
    for (const n of ch) voice(buf, b * barSec, semi(n + transpose + CTX.transpose), barSec * 0.97, 0.5);
  }
}

// ───────────────────────── WAV ─────────────────────────

function writeWav(path, L, R) {
  const n = L.length, bytes = n * 4;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), o); o += 2;
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), o); o += 2;
  }
  writeFileSync(path, buf);
}

// ───────────────────────── main ─────────────────────────

mkdirSync(OUT, { recursive: true });
console.log('MOTIVO DE UNIVERSO 1/1 · maqueta sintetizada\n');
console.log(`  melodía: ${MOTIF.map((m) => m.n).join(' ')}  (semitonos sobre la tónica)`);
console.log(`  tónica: Re3 ${ROOT} Hz · ${MOTIF.reduce((a, m) => a + m.d, 0)} pulsos\n`);

for (const [key, arr] of Object.entries(ARRANGEMENTS)) {
  const beat = 60 / arr.bpm;
  const barSec = beat * 4;
  const total = Math.max(arr.bars * barSec, MOTIF.reduce((a, m) => a + m.d, 0) * beat) + 3.5;
  const n = Math.round(total * SR);
  const buf = { L: new Float32Array(n), R: new Float32Array(n) };
  CTX = { beat, transpose: arr.transpose };
  arr.render(buf, beat, barSec);

  // normalizar a −1 dBFS
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(buf.L[i]), Math.abs(buf.R[i]));
  const g = peak > 0 ? Math.pow(10, -1 / 20) / peak : 1;
  // cola de salida para que no corte
  for (let i = 0; i < n; i++) {
    const fade = i > n - SR ? (n - i) / SR : 1;
    buf.L[i] *= g * fade; buf.R[i] *= g * fade;
  }

  const file = join(OUT, `tema-${key}.wav`);
  writeWav(file, buf.L, buf.R);
  console.log(`  ${arr.label.padEnd(34)} ${total.toFixed(1)}s  ${arr.bpm} bpm`);
  console.log(`  ${''.padEnd(34)} ${arr.uso}`);
  console.log(`  → ${file}\n`);
}
console.log('Maqueta: síntesis, no instrumentos reales. Fija melodía, tiempos y carácter.');
