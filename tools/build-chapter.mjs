/**
 * Arma un capítulo a partir de su módulo (engine2/shows/<id>.mjs): escribe su
 * piece.json desde PIECE, compone el audio con score() y empaqueta.
 * Los tres vídeos tienen que estar ya renderizados (bash engine2/capitulo.sh ID).
 *
 * Uso: node tools/build-chapter.mjs SH-002
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { mix } from './lib/synth.mjs';

const id = process.argv[2];
const mod = await import(`../engine2/shows/${id.toLowerCase().replace('-', '')}.mjs`);
const piece = { type: 'cinematic', version: '1.0.0', testMaterial: true, durationSeconds: mod.DURATION,
  audio: { style: 'score', peakTargetDb: -1.0, bassRolloffHz: 45 }, ...mod.PIECE };
mkdirSync(`production/pieces/${id}`, { recursive: true });
writeFileSync(`production/pieces/${id}/piece.json`, JSON.stringify(piece, null, 2) + '\n');
const m = mix(mod.DURATION, id); mod.score(m); m.write(`dist/packages/${id}/audio.wav`);
execFileSync('node', ['tools/build-cinematic-package.mjs', id], { stdio: 'inherit' });
