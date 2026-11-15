/**
 * Arma un capítulo a partir de su módulo (engine2/shows/<id>.mjs): escribe su
 * piece.json desde PIECE, compone el audio con score() y empaqueta.
 * Los tres vídeos tienen que estar ya renderizados (bash engine2/capitulo.sh ID).
 *
 * Uso: node tools/build-chapter.mjs SH-002 [--meta-only] [--bump]
 *   --meta-only  reescribe solo experience.json, cue sheet y notas: no toca vídeo, audio ni tríptico
 *   --bump       sube la versión del paquete
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mix } from './lib/synth.mjs';

const id = process.argv[2];
const metaOnly = process.argv.includes('--meta-only');
const mod = await import(`../engine2/shows/${id.toLowerCase().replace('-', '')}.mjs`);
// La versión se conserva de la entrega anterior; --bump la sube (el brief pide subirla en cada entrega).
const prev = `dist/packages/${id}/experience.json`;
let version = existsSync(prev) ? JSON.parse(readFileSync(prev, 'utf8')).version : '1.0.0';
if (process.argv.includes('--bump')) { const v = version.split('.').map(Number); v[2]++; version = v.join('.'); }
const piece = { type: 'cinematic', version, testMaterial: true, durationSeconds: mod.DURATION,
  audio: { style: 'score', peakTargetDb: -1.0, bassRolloffHz: 45 }, ...mod.PIECE };
mkdirSync(`production/pieces/${id}`, { recursive: true });
writeFileSync(`production/pieces/${id}/piece.json`, JSON.stringify(piece, null, 2) + '\n');
if (!metaOnly) { const m = mix(mod.DURATION, id); mod.score(m); m.write(`dist/packages/${id}/audio.wav`); }
execFileSync('node', ['tools/build-cinematic-package.mjs', id, ...(metaOnly ? ['--meta-only'] : [])], { stdio: 'inherit' });
