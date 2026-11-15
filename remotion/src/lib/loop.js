/**
 * BUCLE PERFECTO POR CONSTRUCCIÓN.
 *
 * La clave de todo este mundo: en vez de cerrar el bucle con un solape al final
 * —que siempre deja un rastro—, cada capa se anima con una función periódica
 * cuyo ciclo DIVIDE exactamente la duración de la composición. Así el fotograma
 * final y el inicial son idénticos por matemática, no por aproximación.
 *
 * `cycles` es cuántas vueltas completas da esa capa en todo el bucle: siempre
 * un entero, y por eso siempre cierra.
 */

/** Seno que completa `cycles` vueltas enteras en `total` fotogramas. */
export const loopSin = (frame, total, cycles = 1, phase = 0) =>
  Math.sin(((frame / total) * cycles + phase) * Math.PI * 2);

export const loopCos = (frame, total, cycles = 1, phase = 0) =>
  Math.cos(((frame / total) * cycles + phase) * Math.PI * 2);

/** Progreso 0→1 que vuelve a 0 justo al final, `cycles` veces. */
export const loopRamp = (frame, total, cycles = 1, phase = 0) =>
  (((frame / total) * cycles + phase) % 1 + 1) % 1;

/**
 * Deriva de un clip de vídeo que cierra: va y vuelve.
 * Devuelve el fotograma del clip origen que toca mostrar.
 */
export function pingPongFrame(frame, total, clipFrames, cycles = 1) {
  const t = loopRamp(frame, total, cycles);
  const tri = t < 0.5 ? t * 2 : (1 - t) * 2;   // triángulo 0→1→0
  return Math.min(clipFrames - 1, Math.floor(tri * (clipFrames - 1)));
}
