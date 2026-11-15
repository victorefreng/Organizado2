/**
 * ENSAMBLADOR DE PAQUETES DE MUNDO — Brief Maestro V3.2 §5.
 *
 * Toma los tres bucles ya renderizados con Remotion y el audio sintetizado, y
 * deja la carpeta exactamente como la espera el importador:
 *
 *   AMBIENT-00X/
 *     experience.json
 *     main.mp4  ceiling.mp4  side.mp4      sin audio, 30 fps, GOP 30, faststart
 *     audio.wav                            48 kHz estéreo, 8 min en bucle
 *     extras/
 *       cue-sheet.csv                      el look de reposo del mundo
 *       preview-triptico.mp4               las tres juntas, para revisar
 *       production-notes.md
 *       licenses.md
 *
 * Al terminar pasa el validador. Si no valida, no se entrega.
 *
 * Uso: node tools/build-ambient-package.mjs AMBIENT-002
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { CONTRACT, RIG, CUE_SHEET_COLUMNS } from './lib/contract.mjs';

const id = process.argv[2];
if (!id) { console.error('Uso: node tools/build-ambient-package.mjs AMBIENT-002'); process.exit(1); }

const root = resolve('.');
const piecePath = join(root, 'production/pieces', id, 'piece.json');
if (!existsSync(piecePath)) { console.error(`No existe ${piecePath}`); process.exit(1); }
const piece = JSON.parse(readFileSync(piecePath, 'utf8'));
const pkg = join(root, 'dist/packages', id);
const extras = join(pkg, 'extras');
mkdirSync(extras, { recursive: true });

const ff = (args, label) => {
  try { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { console.error(`✗ ffmpeg (${label}):\n${e.stderr?.toString().slice(0, 900)}`); process.exit(1); }
};
const probe = (f) => {
  const o = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=width,height,r_frame_rate:format=duration', '-of', 'default=nw=1', f]).toString();
  const g = (k) => (o.match(new RegExp('^' + k + '=([^\\n]+)', 'm')) || [])[1];
  const fr = (g('r_frame_rate') || '0/1').split('/').map(Number);
  return { width: +g('width'), height: +g('height'), fps: fr[1] ? fr[0] / fr[1] : 0, duration: parseFloat(g('duration')) };
};

console.log(`\n━━ ${id} · ${piece.name} ━━\n`);

// ───────────────────── 1. los tres vídeos ─────────────────────

const durations = {};
for (const screen of CONTRACT.screens) {
  const dst = join(pkg, `${screen}.mp4`);
  if (!existsSync(dst)) {
    console.error(`✗ Falta ${screen}.mp4. Renderízalo primero:`);
    console.error(`    cd remotion && npx remotion render src/index.jsx ${piece.screens[screen].remotionId} ../dist/packages/${id}/${screen}.mp4 --browser-executable=/opt/pw-browsers/chromium`);
    process.exit(1);
  }
  const i = probe(dst);
  durations[screen] = i.duration;
  console.log(`  ${screen.padEnd(9)} ${i.width}x${i.height} ${i.fps.toFixed(0)} fps  ${i.duration.toFixed(1)}s  ${piece.screens[screen].role}`);
}
const iguales = new Set(Object.values(durations).map((d) => d.toFixed(0))).size === 1;
if (iguales) console.log(`  ⚠ los tres bucles duran lo mismo: el conjunto se repetirá igual`);

// ───────────────────── 2. audio ─────────────────────

const audioDst = join(pkg, 'audio.wav');
if (!existsSync(audioDst)) {
  console.log(`\n  sintetizando audio…`);
  execFileSync('node', [join(root, 'tools/make-piece-audio.mjs'), piecePath, audioDst], { stdio: 'inherit' });
} else {
  const a = probe(audioDst);
  console.log(`\n  audio.wav    ${(a.duration / 60).toFixed(1)} min en bucle`);
}

// ───────────────────── 3. experience.json ─────────────────────

const exp = {
  formatVersion: CONTRACT.formatVersion,
  id,
  name: piece.name,
  description: piece.description,
  type: 'ambient',
  version: piece.version || '1.0.0',
  testMaterial: piece.testMaterial !== false,
  durationMs: 0,
  frameRate: CONTRACT.timecodeFps,
  media: { main: 'main.mp4', ceiling: 'ceiling.mp4', side: 'side.mp4', audio: 'audio.wav' },
  transition: { in: { type: 'crossfade', ms: 1500 }, out: { type: 'crossfade', ms: 2000 } },
  onError: { nodeLost: 'continue', playbackStalled: 'continue', audioFail: 'continue' },
  cues: []
};
writeFileSync(join(pkg, 'experience.json'), JSON.stringify(exp, null, 2) + '\n');
console.log(`  experience.json  type ambient · durationMs 0 · sin cues`);

// ───────────────────── 4. cue-sheet del look de reposo ─────────────────────

const look = piece.lightLook || {};
const par = look.halo_par || { color: '#FFFFFF', intensity: 0.2 };
const filas = [
  [id, '001', '', '0', 'AMBIENT_FADE', 'entrada del mundo',
   `look de reposo de ${piece.name}`, `3x PAR ${par.color} al ${Math.round(par.intensity * 100)}%`,
   'sin uso', 'sin uso', 'sin uso', par.color, par.intensity, '6.0'],
  [id, '002', '', '0', 'AMBIENT_FADE', 'sostenido',
   par.movement || 'movimiento muy lento', `3x PAR ${par.color}`,
   'sin uso', 'sin uso', 'sin uso', par.color, par.intensity, '40.0']
];
writeFileSync(join(extras, 'cue-sheet.csv'),
  CUE_SHEET_COLUMNS.join(',') + '\n' +
  filas.map((f) => f.map((v) => (String(v).includes(',') ? `"${v}"` : v)).join(',')).join('\n') + '\n');

// ───────────────────── 5. tríptico de revisión ─────────────────────

const trip = join(extras, 'preview-triptico.mp4');
const corto = Math.min(...Object.values(durations), 60);
const etiqueta = (t) => `drawtext=text='${t}':x=14:y=12:fontsize=18:fontcolor=0xFFD9A0@0.9:box=1:boxcolor=0x05070D@0.45:boxborderw=6`;
ff(['-t', String(corto), '-i', join(pkg, 'ceiling.mp4'),
    '-t', String(corto), '-i', join(pkg, 'side.mp4'),
    '-t', String(corto), '-i', join(pkg, 'main.mp4'),
    '-t', String(corto), '-i', audioDst,
    '-filter_complex',
    `[0:v]scale=640:360,${etiqueta('P1 CEILING')}[a];` +
    `[1:v]scale=640:360,${etiqueta('P2 SIDE')}[b];` +
    `[2:v]scale=640:360,${etiqueta('P3 MAIN')}[c];` +
    `[a][b][c]vstack=inputs=3[v]`,
    '-map', '[v]', '-map', '3:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', trip], 'tríptico');
console.log(`  extras/preview-triptico.mp4  ${corto.toFixed(0)}s de las tres juntas, con audio`);

// ───────────────────── 6. notas y licencias ─────────────────────

writeFileSync(join(extras, 'production-notes.md'), `# ${id} · ${piece.name}

${piece.description}

## Cómo está hecho

Composiciones de Remotion renderizadas a ${CONTRACT.video.width}x${CONTRACT.video.height}
a ${CONTRACT.video.fps} fps. Ningún metraje externo: todo es procedural.

**Bucle perfecto por construcción.** Cada capa se anima con funciones periódicas
cuyo ciclo divide exactamente la duración de la composición, así que el último
fotograma y el primero son el mismo por matemática. No hay solape ni fundido que
pueda dejar rastro, que es lo que importa en algo que va a estar en pantalla
horas.

Las tres pantallas duran distinto a propósito (${CONTRACT.screens.map((s) => `${s} ${durations[s]?.toFixed(0)}s`).join(', ')}):
así el conjunto no vuelve a coincidir nunca.

No hay continuidad geométrica entre pantallas, que sería imposible de sostener.
Comparten paleta, profundidad y ritmo, que es lo que hace que se lean como el
mismo sitio.

## Look de reposo

${par.movement || 'Movimiento muy lento.'}

- **Halo PAR (3):** ${par.color} al ${Math.round(par.intensity * 100)} %
- **Flasher 200:** sin uso
- **Láser:** sin uso
- **Haze:** sin uso

Nivel REPOSO del brief §9: un solo estado, sin golpes, que no compita con los
proyectores.

## Audio

Sintetizado, ${(piece.audio.minutes || 8)} minutos en bucle sin corte audible.
Mezclado para una Sonos por Bluetooth: corte de graves por debajo de
${piece.audio.bassRolloffHz || 45} Hz, ${piece.audio.peakTargetDb || -1} dBFS de pico,
y la información importante sobrevive en mono.

**Es maqueta.** Fija el carácter y la duración; conviene sustituirlo por música
con licencia cuando esté disponible. Las pistas se regeneran con:

    node tools/make-piece-audio.mjs production/pieces/${id}/piece.json dist/packages/${id}/audio.wav

## Regenerar

    cd remotion
    npx remotion render src/index.jsx ${piece.screens.main.remotionId} ../dist/packages/${id}/main.mp4 --browser-executable=/opt/pw-browsers/chromium
    node ../tools/build-ambient-package.mjs ${id}
`);

writeFileSync(join(extras, 'licenses.md'), `# Origen del material · ${id}

Todo el contenido visual y sonoro de este paquete es **original**, generado
proceduralmente con Remotion (vídeo) y síntesis propia (audio).

- Sin metraje de stock.
- Sin música de terceros.
- Sin modelos de IA generativa.
- Sin tipografías de pago: se usa la pila del sistema.

No hay licencias de terceros que respetar en este paquete.
`);
console.log(`  extras/  cue-sheet.csv · production-notes.md · licenses.md`);

// ───────────────────── 7. validar ─────────────────────

console.log(`\n━━ validando ━━`);
try {
  execFileSync('node', [join(root, 'tools/validate-package.mjs'), pkg], { stdio: 'inherit' });
  console.log(`✓ ${id} listo en dist/packages/${id}\n`);
} catch (e) {
  console.error(`✗ ${id} NO valida. No se entrega así.\n`);
  process.exit(1);
}
