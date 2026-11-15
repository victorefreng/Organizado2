/**
 * Presets de calidad. Escalan partículas, geometría, resolución de render y post.
 * El presupuesto de cada superficie se multiplica por `PROJECTORS[s].budget`.
 */

export const QUALITY_PRESETS = {
  low: {
    label: 'Low',
    pixelRatio: 0.75,
    antialias: false,
    bloom: false,
    bloomStrength: 0,
    particleBudget: 14000,
    instanceBudget: 1200,
    plantSegments: 5,
    starCount: 4000,
    shadows: false,
    fogSteps: 8
  },
  balanced: {
    label: 'Balanced',
    pixelRatio: 1.0,
    antialias: false,
    bloom: true,
    bloomStrength: 0.55,
    particleBudget: 40000,
    instanceBudget: 3500,
    plantSegments: 8,
    starCount: 12000,
    shadows: false,
    fogSteps: 12
  },
  high: {
    label: 'High',
    pixelRatio: 1.0,
    antialias: true,
    bloom: true,
    bloomStrength: 0.7,
    particleBudget: 90000,
    instanceBudget: 7000,
    plantSegments: 12,
    starCount: 26000,
    shadows: false,
    fogSteps: 18
  },
  ultra: {
    label: 'Ultra',
    pixelRatio: Math.min(1.5, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1.5),
    antialias: true,
    bloom: true,
    bloomStrength: 0.85,
    particleBudget: 180000,
    instanceBudget: 14000,
    plantSegments: 16,
    starCount: 45000,
    shadows: true,
    fogSteps: 24
  }
};

export const DEFAULT_QUALITY = 'balanced';

/** Devuelve el preset ya escalado por el presupuesto de la superficie. */
export function resolveQuality(name, surfaceBudget = 1) {
  const p = QUALITY_PRESETS[name] || QUALITY_PRESETS[DEFAULT_QUALITY];
  const k = Math.max(0.15, surfaceBudget * 2); // budget 0.5 -> 1.0x, 0.2 -> 0.4x
  return {
    ...p,
    name: name || DEFAULT_QUALITY,
    particleBudget: Math.round(p.particleBudget * k),
    instanceBudget: Math.round(p.instanceBudget * k),
    starCount: Math.round(p.starCount * k)
  };
}

export default QUALITY_PRESETS;
