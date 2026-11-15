/**
 * Genera imágenes PNG de placeholder para /public/assets/memories/.
 * Sin dependencias: escribe PNG de 8 bits RGBA a mano con zlib de Node.
 *
 * Son claramente identificables como placeholders (marca "PLACEHOLDER", número y
 * rejilla). NO son fotografías reales y el motor las marca como tal.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/assets/memories');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Glifos 5x7 para la marca de agua
const FONT = {
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  C: ['01110','10001','10000','10000','10000','10001','01110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00110','01000','10000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['10010','10010','10010','11111','00010','00010','00010'],
  '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '6': ['01110','10000','11110','10001','10001','10001','01110'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '/': ['00001','00010','00010','00100','01000','01000','10000']
};

function drawText(set, text, x0, y0, scale, w, h) {
  let cx = x0;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r][c] === '1') {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const px = cx + c * scale + sx, py = y0 + r * scale + sy;
                if (px >= 0 && px < w && py >= 0 && py < h) set(px, py);
              }
            }
          }
        }
      }
    }
    cx += 6 * scale;
  }
  return cx;
}

// Seis placeholders con relaciones de aspecto distintas a propósito, para
// comprobar que el motor nunca deforma la imagen.
const SPECS = [
  { n: 1, w: 1280, h: 853, hue: [0.52, 0.35, 0.28] },  // 3:2 horizontal
  { n: 2, w: 900,  h: 1200, hue: [0.30, 0.42, 0.52] }, // 3:4 vertical
  { n: 3, w: 1200, h: 1200, hue: [0.50, 0.40, 0.25] }, // 1:1
  { n: 4, w: 1440, h: 810, hue: [0.26, 0.40, 0.46] },  // 16:9
  { n: 5, w: 1000, h: 1250, hue: [0.48, 0.30, 0.38] }, // 4:5
  { n: 6, w: 1280, h: 960, hue: [0.34, 0.44, 0.40] }   // 4:3
];

mkdirSync(OUT, { recursive: true });
if (!existsSync(resolve(OUT, '.gitkeep'))) writeFileSync(resolve(OUT, '.gitkeep'), '');

for (const s of SPECS) {
  const { w, h } = s;
  const buf = Buffer.alloc(w * h * 4);
  const cxp = w / 2, cyp = h / 2;
  const maxr = Math.hypot(cxp, cyp);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = Math.hypot(x - cxp, y - cyp) / maxr;
      // degradado radial suave + rejilla técnica
      const vig = 1 - 0.55 * r * r;
      const grid = (x % 80 === 0 || y % 80 === 0) ? 0.12 : 0;
      const diag = ((x + y) % 160 < 2) ? 0.06 : 0;
      const base = 0.10 + 0.22 * vig + grid + diag;
      buf[i]     = Math.min(255, Math.round(255 * base * (0.7 + s.hue[0])));
      buf[i + 1] = Math.min(255, Math.round(255 * base * (0.7 + s.hue[1])));
      buf[i + 2] = Math.min(255, Math.round(255 * base * (0.7 + s.hue[2])));
      buf[i + 3] = 255;
    }
  }
  const set = (x, y) => {
    const i = (y * w + x) * 4;
    buf[i] = 236; buf[i + 1] = 228; buf[i + 2] = 206; buf[i + 3] = 255;
  };
  const scale = Math.max(2, Math.round(w / 300));
  drawText(set, 'PLACEHOLDER', Math.round(w * 0.08), Math.round(h * 0.42), scale, w, h);
  drawText(set, `0${s.n}`, Math.round(w * 0.08), Math.round(h * 0.42) + 11 * scale, scale, w, h);
  drawText(set, `${w}/${h}`, Math.round(w * 0.08), Math.round(h * 0.42) + 21 * scale, Math.max(1, Math.round(scale * 0.6)), w, h);
  const file = resolve(OUT, `placeholder-0${s.n}.png`);
  writeFileSync(file, png(w, h, buf));
  console.log(`placeholder: ${file} (${w}x${h})`);
}
console.log('Listo. Sustituir por fotografías reales y poner placeholder:false en src/config/memories.js');
