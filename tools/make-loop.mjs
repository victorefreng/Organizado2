/**
 * CONVERTIR UN CLIP EN BUCLE PERFECTO.
 *
 * Dos métodos, y la elección importa:
 *
 *  · pingpong — reproduce hacia delante y después hacia atrás. El enlace es
 *    matemáticamente perfecto: el último fotograma ES el primero. Funciona con
 *    cualquier clip, incluso si la cámara viaja. Dura el doble que el original,
 *    que para nosotros es una ventaja.
 *
 *    Su límite: el movimiento con dirección física delata la marcha atrás. Las
 *    burbujas bajarían, los pétalos subirían, los peces nadarían de espaldas.
 *    Sirve para deriva, humo, telas, luz, nebulosas, nubes. No sirve para nada
 *    que caiga, suba o avance de forma reconocible.
 *
 *  · crossfade — solapa el final sobre el principio. El movimiento nunca se
 *    invierte, así que vale para todo, pero pierde los segundos del solape y
 *    exige que el clip no viaje.
 *
 * Y una opción que ahorra créditos de verdad: `--speed 0.5` ralentiza con
 * interpolación de fotogramas, así que un clip de 5 s se convierte en un bucle
 * de 20 s con pingpong. Cuatro segundos de uso por cada segundo generado.
 *
 * Uso:
 *   node tools/make-loop.mjs entrada.mp4 salida.mp4 --mode pingpong --speed 0.5
 *   node tools/make-loop.mjs entrada.mp4 salida.mp4 --mode crossfade --overlap 1.5
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { videoEncodeArgs, CONTRACT } from './lib/contract.mjs';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };

const input = resolve(process.argv[2] || '');
const output = resolve(process.argv[3] || '');
const mode = arg('mode', 'pingpong');
const speed = parseFloat(arg('speed', '1'));
const overlap = parseFloat(arg('overlap', '1.5'));
const fps = parseInt(arg('fps', String(CONTRACT.video.fps)), 10);
const W = parseInt(arg('width', String(CONTRACT.video.width)), 10);
const H = parseInt(arg('height', String(CONTRACT.video.height)), 10);

if (!existsSync(input)) { console.error(`No existe: ${input}`); process.exit(1); }

const probe = (f) => {
  const o = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=width,height,r_frame_rate:format=duration', '-of', 'default=nw=1', f]).toString();
  const g = (k) => (o.match(new RegExp(k + '=([^\\n]+)')) || [])[1];
  return { width: +g('width'), height: +g('height'), duration: +g('duration') };
};
const src = probe(input);
console.log(`BUCLE · ${mode}`);
console.log(`  origen ${src.width}x${src.height} · ${src.duration.toFixed(2)}s`);

// Encaje al formato de entrega, y ralentizado si se pide
const fit = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${fps}`;
// minterpolate genera fotogramas intermedios: ralentizar sin que se vea a saltos
const slow = speed !== 1
  ? `,setpts=${(1 / speed).toFixed(4)}*PTS,minterpolate=fps=${fps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1`
  : '';

let filter, outDur;

if (mode === 'pingpong') {
  // ida + vuelta. Se quita el primer fotograma de la vuelta para que el del
  // giro no se repita y el movimiento no "tropiece" en el extremo.
  filter =
    `[0:v]${fit}${slow},split[a][b];` +
    `[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];` +
    `[a][r]concat=n=2:v=1:a=0[v]`;
  outDur = (src.duration / speed) * 2;
  console.log(`  ida y vuelta${speed !== 1 ? ` · ralentizado a ${speed}×` : ''}`);
} else if (mode === 'crossfade') {
  const d = src.duration / speed;
  const loop = d - overlap;
  if (loop <= overlap) { console.error(`El clip es muy corto para un solape de ${overlap}s.`); process.exit(1); }
  filter =
    `[0:v]${fit}${slow},split=3[x][y][z];` +
    `[x]trim=0:${overlap},setpts=PTS-STARTPTS[head];` +
    `[y]trim=${loop}:${d},setpts=PTS-STARTPTS[tail];` +
    `[z]trim=${overlap}:${loop},setpts=PTS-STARTPTS[mid];` +
    `[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[cf];` +
    `[cf][mid]concat=n=2:v=1:a=0[v]`;
  outDur = loop;
  console.log(`  solape de ${overlap}s${speed !== 1 ? ` · ralentizado a ${speed}×` : ''}`);
} else {
  console.error(`Modo desconocido: ${mode}. Usa pingpong o crossfade.`);
  process.exit(1);
}

execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-i', input, '-filter_complex', filter, '-map', '[v]',
  ...videoEncodeArgs({ fps }), output], { stdio: 'inherit' });

const out = probe(output);
console.log(`  → ${output}`);
console.log(`  ${out.width}x${out.height} · ${out.duration.toFixed(2)}s  (de ${src.duration.toFixed(1)}s generados)`);
console.log(`  rendimiento: ${(out.duration / src.duration).toFixed(1)}× segundos de uso por segundo generado`);

// Comprobación del enlace: el último fotograma contra el primero
const tmp = '/tmp/_loopcheck';
execFileSync('mkdir', ['-p', tmp]);
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', output,
  '-vf', 'select=eq(n\\,0)', '-frames:v', '1', `${tmp}/first.png`]);
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-sseof', '-0.05', '-i', output,
  '-frames:v', '1', `${tmp}/last.png`]);
try {
  const r = execFileSync('ffmpeg', ['-hide_banner', '-i', `${tmp}/first.png`, '-i', `${tmp}/last.png`,
    '-filter_complex', 'ssim', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (e) {
  const m = e.stderr?.toString().match(/All:([0-9.]+)/);
  if (m) {
    const ssim = parseFloat(m[1]);
    const verdict = ssim > 0.97 ? 'enlace perfecto' : ssim > 0.9 ? 'enlace bueno' : 'SE VA A NOTAR EL SALTO';
    console.log(`  enlace primer/último fotograma: ${(ssim * 100).toFixed(1)} %  → ${verdict}`);
  }
}
