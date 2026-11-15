/**
 * Paleta maestra de UNIVERSO 1/1.
 * Ver docs/01-direccion-creativa.md §3. Editable sin tocar el motor.
 * El ámbar `starlight` es el hilo conductor: aparece en todos los mundos.
 */

export const STARLIGHT = {
  core: '#FFF6E0',
  amber: '#FFD9A0',
  void: '#05070D'
};

export const PALETTE = {
  void: {
    name: 'VOID',
    base: '#05070D',
    haze: '#0B1020',
    cold: '#9FD8FF',
    light: '#FFF6E0',
    accent: '#FFD9A0',
    fog: [0.02, 0.028, 0.05],
    fogDensity: 0.012
  },
  garden: {
    name: 'GARDEN',
    base: '#07150F',
    soil: '#0B1A12',
    foliageDark: '#1C4433',
    foliage: '#2F6B4F',
    foliageLit: '#8FD6A8',
    sprout: '#A8E6A1',
    flower: '#F2B6C6',
    sun: '#FFD98A',
    accent: '#FFD9A0',
    fog: [0.035, 0.075, 0.062],
    fogDensity: 0.028
  },
  ocean: {
    name: 'OCEAN',
    base: '#021E2E',
    abyss: '#01121C',
    mid: '#063D56',
    surface: '#0A6E8C',
    caustic: '#7FE3FF',
    biolum: '#6AFFD8',
    rays: '#E8F7FF',
    accent: '#FFD9A0',
    fog: [0.012, 0.09, 0.14],
    fogDensity: 0.035
  },
  sky: {
    name: 'SKY',
    base: '#6FB4E8',
    dawn: '#FFB27A',
    gold: '#FFD9A0',
    day: '#6FB4E8',
    dusk: '#2A3B6B',
    night: '#141B33',
    cloudLit: '#E6EEF8',
    accent: '#FFD9A0',
    fog: [0.45, 0.62, 0.8],
    fogDensity: 0.008
  },
  cosmos: {
    name: 'COSMOS',
    base: '#06060F',
    nebulaCold: '#2B1B4D',
    nebulaMagenta: '#B06BFF',
    nebulaCyan: '#5FD8FF',
    stars: '#FFE9B0',
    dust: '#1A0F2E',
    accent: '#FFD9A0',
    fog: [0.02, 0.018, 0.045],
    fogDensity: 0.006
  },
  redroom: {
    name: 'RED ROOM',
    base: '#0A0507',
    shadow: '#2B060D',
    wine: '#4A0D16',
    crimson: '#8E1226',
    velvet: '#C9435A',
    amber: '#D98B3A',
    accent: '#D98B3A',
    fog: [0.07, 0.012, 0.024],
    fogDensity: 0.014
  },
  memories: {
    name: 'OUR MEMORIES',
    base: '#080A12',
    frame: '#FFD9A0',
    glow: '#FFF6E0',
    accent: '#FFD9A0',
    fog: [0.03, 0.035, 0.055],
    fogDensity: 0.015
  }
};

/** Tipografía: una sola familia, peso ligero, tracking amplio. */
export const TYPE = {
  family: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  titleWeight: 200,
  titleTracking: 0.42,
  bodyWeight: 300
};

export default PALETTE;
