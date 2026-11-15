/**
 * Configuración de las tres salidas de proyección.
 *
 * Cada superficie es una CÁMARA dentro del stage virtual compartido, no un recorte
 * de un video. `offset` y `euler` se aplican RELATIVOS al masterRig que mueve el
 * CameraDirector, así que un objeto del stage es visto por las tres cámaras a la vez
 * desde sus propios ángulos: por eso una ballena puede cruzar de STORY a CEILING.
 *
 * Cuando tengamos las dimensiones reales de la habitación se ajustan `euler`,
 * `offset`, `fov` y `keystone`. Nada más hay que cambiar.
 */

export const SURFACES = ['story', 'environment', 'ceiling'];

export const PROJECTORS = {
  story: {
    id: 'story',
    label: 'P3 — STORY WORLD',
    role: 'Narrativa, fotografías, título, interacción',
    order: 3,
    // Peso de presupuesto de render (suma 1.0). Ver docs/02-storyboard.md
    budget: 0.5,
    resolution: { width: 1920, height: 1080 },
    fov: 42,
    // Desplazamiento de la cámara respecto al masterRig, en metros
    offset: { x: 0, y: 0, z: 0 },
    // Orientación relativa en grados: yaw (izq/der), pitch (arriba/abajo), roll
    euler: { yaw: 0, pitch: 0, roll: 0 },
    orientation: 'landscape',
    flipH: false,
    flipV: false,
    // Calibración: se completará con el mapping físico real
    keystone: { tl: [0, 0], tr: [1, 0], br: [1, 1], bl: [0, 1] },
    edgeBlend: { left: 0, right: 0, top: 0, bottom: 0 },
    brightness: 1.0,
    gamma: 1.0,
    allowText: true
  },
  environment: {
    id: 'environment',
    label: 'P2 — ENVIRONMENT WORLD',
    role: 'Continuidad del paisaje, segundo punto de vista',
    order: 2,
    budget: 0.3,
    resolution: { width: 1920, height: 1080 },
    fov: 52,
    offset: { x: -1.2, y: 0, z: 0.4 },
    euler: { yaw: -52, pitch: -2, roll: 0 },
    orientation: 'landscape',
    flipH: false,
    flipV: false,
    keystone: { tl: [0, 0], tr: [1, 0], br: [1, 1], bl: [0, 1] },
    edgeBlend: { left: 0, right: 0, top: 0, bottom: 0 },
    brightness: 1.0,
    gamma: 1.0,
    allowText: false
  },
  ceiling: {
    id: 'ceiling',
    label: 'P1 — CEILING WORLD',
    role: 'El mundo sobre nosotros: ballenas, dosel, galaxias, aves',
    order: 1,
    budget: 0.2,
    resolution: { width: 1920, height: 1080 },
    fov: 66,
    offset: { x: 0, y: 0.6, z: 0 },
    euler: { yaw: 8, pitch: 56, roll: 0 },
    orientation: 'landscape',
    flipH: false,
    // El techo normalmente se proyecta invertido según la colocación del proyector.
    // Se activa en la instalación real.
    flipV: false,
    keystone: { tl: [0, 0], tr: [1, 0], br: [1, 1], bl: [0, 1] },
    edgeBlend: { left: 0, right: 0, top: 0, bottom: 0 },
    brightness: 0.92,
    gamma: 1.0,
    allowText: false
  }
};

/** Orden de degradación si el hardware sufre: primero CEILING, nunca STORY. */
export const DEGRADE_ORDER = ['ceiling', 'environment', 'story'];

export function getProjector(surface) {
  return PROJECTORS[surface] || PROJECTORS.story;
}

export default PROJECTORS;
