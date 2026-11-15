/**
 * MOTOR DE CUES DE ILUMINACIÓN — estado VIRTUAL únicamente.
 *
 * ⚠ NINGÚN DISPOSITIVO FÍSICO ESTÁ CONECTADO. Este módulo produce el estado que
 * dibuja el simulador del panel. Los adaptadores reales (Hue / DMX) están
 * declarados en adapters/ y lanzan NotImplemented hasta validar la integración.
 *
 * Inventario declarado por el usuario:
 *   Hue:       2x Play Bar, 2x GU10, 1x lámpara portátil, 1x Bridge
 *   Escénico:  5x Halo PAR (Super Bright and Loud), 2x Flasher 200 (Litetek)
 *   Haze:      Dark Fazer (OPCIONAL — los visuales no dependen de ella)
 *   Láseres:   fuera de alcance en esta versión
 *
 * Política de seguridad por defecto:
 *   - Los Flasher 200 están EXCLUIDOS de la reproducción automática.
 *   - Sin estrobo. `strobeEnabled` es false y requiere activación manual explícita.
 */
import { clamp, clamp01, lerp, smoothstep } from './easing.js';

export const FIXTURES = {
  hue: [
    { id: 'playbar_l', label: 'Play Bar L',   kind: 'playbar', group: 'hue', pos: [-0.7, 0.35] },
    { id: 'playbar_r', label: 'Play Bar R',   kind: 'playbar', group: 'hue', pos: [0.7, 0.35] },
    { id: 'gu10_l',    label: 'GU10 L',       kind: 'spot',    group: 'hue', pos: [-0.45, 0.08] },
    { id: 'gu10_r',    label: 'GU10 R',       kind: 'spot',    group: 'hue', pos: [0.45, 0.08] },
    { id: 'go',        label: 'Hue Go',       kind: 'portable', group: 'hue', pos: [0, 0.78] }
  ],
  dmx: [
    { id: 'par1', label: 'Halo PAR 1', kind: 'par', group: 'par', ch: 1,  pos: [-0.85, 0.6] },
    { id: 'par2', label: 'Halo PAR 2', kind: 'par', group: 'par', ch: 7,  pos: [-0.42, 0.6] },
    { id: 'par3', label: 'Halo PAR 3', kind: 'par', group: 'par', ch: 13, pos: [0, 0.6] },
    { id: 'par4', label: 'Halo PAR 4', kind: 'par', group: 'par', ch: 19, pos: [0.42, 0.6] },
    { id: 'par5', label: 'Halo PAR 5', kind: 'par', group: 'par', ch: 25, pos: [0.85, 0.6] },
    { id: 'flasher1', label: 'Flasher 200 L', kind: 'flasher', group: 'flasher', ch: 31, pos: [-0.62, 0.9], autoExcluded: true },
    { id: 'flasher2', label: 'Flasher 200 R', kind: 'flasher', group: 'flasher', ch: 33, pos: [0.62, 0.9], autoExcluded: true }
  ],
  haze: [
    { id: 'fazer', label: 'Dark Fazer (haze)', kind: 'haze', group: 'haze', ch: 35, optional: true }
  ]
};

export const ALL_FIXTURE_IDS = [
  ...FIXTURES.hue.map((f) => f.id),
  ...FIXTURES.dmx.map((f) => f.id)
];

/**
 * Receta de cada cue. `targets` admite:
 *   'all' | 'hue' | 'par' | 'flasher' | id concreto | array de ids
 * `sweep` hace un barrido secuencial izquierda→derecha en vez de simultáneo.
 */
export const CUE_LIBRARY = {
  BLACKOUT:       { color: '#000000', intensity: 0,    targets: 'all',  fade: 0.4 },
  LIGHT_FADE_IN:  { color: '#9FD8FF', intensity: 0.06, targets: 'hue',  fade: 7 },
  LIGHT_FADE_OUT: { color: '#000000', intensity: 0,    targets: 'all',  fade: 4 },
  COLOR_CHANGE:   { color: '#FFD9A0', intensity: 0.3,  targets: 'all',  fade: 2 },
  AMBIENCE_IN:    { color: '#0B1020', intensity: 0.02, targets: 'hue',  fade: 10 },

  STAR_BIRTH:     { color: '#FFF6E0', intensity: 0.18, targets: 'hue',  fade: 1.2 },
  STAR_PASSING:   { color: '#9FD8FF', intensity: 0.22, targets: 'hue',  fade: 1.0, sweep: true, sweepDur: 3.2 },
  STAR_DESCENT:   { color: '#BFD9FF', intensity: 0.12, targets: 'hue',  fade: 5 },
  IMPACT:         { color: '#FFE2A8', intensity: 0.45, targets: 'all',  fade: 0.25, decay: 1.6 },

  FOREST_GREEN:   { color: '#7FC79A', intensity: 0.35, targets: 'all',  fade: 8 },
  SUN_RAYS:       { color: '#FFD98A', intensity: 0.30, targets: 'par',  fade: 10 },

  MEMORY_IN:      { color: '#FFD98A', intensity: 0.35, targets: 'hue',  fade: 3 },
  MEMORY_CHORUS:  { color: '#FFD9A0', intensity: 0.45, targets: 'all',  fade: 4 },

  BUTTERFLY:      { color: '#FFE6B8', intensity: 0.25, targets: 'go',   fade: 2 },
  WATER_TOUCH:    { color: '#7FE3FF', intensity: 0.30, targets: 'hue',  fade: 2 },
  OCEAN_BLUE:     { color: '#0A6E8C', intensity: 0.30, targets: 'all',  fade: 6 },
  WHALE_PASS:     { color: '#7FE3FF', intensity: 0.22, targets: 'hue',  fade: 3, sweep: true, sweepDur: 6 },
  ASCEND:         { color: '#9FDCF0', intensity: 0.25, targets: 'all',  fade: 4 },

  SURFACE_BREAK:  { color: '#E8F7FF', intensity: 0.40, targets: 'all',  fade: 1.5 },
  SUNSET_AMBER:   { color: '#FFD9A0', intensity: 0.42, targets: 'all',  fade: 9 },
  PLANE:          { color: '#FFE9C8', intensity: 0.18, targets: 'go',   fade: 2 },
  NIGHT_FALL:     { color: '#2A3B6B', intensity: 0.15, targets: 'all',  fade: 8 },

  GALAXY_PURPLE:  { color: '#B06BFF', intensity: 0.12, targets: 'all',  fade: 8 },
  STAR_RETURN:    { color: '#FFF6E0', intensity: 0.22, targets: 'hue',  fade: 3 },
  FINAL_REVEAL:   { color: '#FFD9A0', intensity: 0.60, targets: 'all',  fade: 5 },
  RED_ROOM:       { color: '#8E1226', intensity: 0.35, targets: 'all',  fade: 6 },
  IDLE_INTERACTIVE: { color: '#FFD9A0', intensity: 0.25, targets: 'all', fade: 6 }
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

export function rgbToHex([r, g, b]) {
  const c = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

class Fixture {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.rgb = [0, 0, 0];
    this.dim = 0;
    this._from = { rgb: [0, 0, 0], dim: 0 };
    this._to = { rgb: [0, 0, 0], dim: 0 };
    this._t = 1;
    this._dur = 1;
    this._delay = 0;
    this._decay = 0;
    this._decayT = 0;
  }
  setTarget(rgb, dim, fade, delay = 0, decay = 0) {
    this._from = { rgb: [...this.rgb], dim: this.dim };
    this._to = { rgb, dim };
    this._dur = Math.max(0.016, fade);
    this._t = -delay;
    this._decay = decay;
    this._decayT = 0;
  }
  update(dt) {
    if (this._t < this._dur) {
      this._t += dt;
      const k = smoothstep(0, 1, clamp01(this._t / this._dur));
      this.rgb = [
        lerp(this._from.rgb[0], this._to.rgb[0], k),
        lerp(this._from.rgb[1], this._to.rgb[1], k),
        lerp(this._from.rgb[2], this._to.rgb[2], k)
      ];
      this.dim = lerp(this._from.dim, this._to.dim, k);
    } else if (this._decay > 0) {
      // Cues de impacto: suben rápido y decaen
      this._decayT += dt;
      const k = Math.exp(-this._decayT / this._decay);
      this.dim = this._to.dim * k;
      if (k < 0.01) { this._decay = 0; this.dim = 0; }
    }
  }
  get state() {
    return { id: this.id, r: this.rgb[0], g: this.rgb[1], b: this.rgb[2], dim: this.dim, hex: rgbToHex(this.rgb), label: this.def.label, kind: this.def.kind, group: this.def.group, pos: this.def.pos };
  }
}

export class LightingEngine {
  constructor(opts = {}) {
    this.strobeEnabled = false;                    // nunca por defecto
    this.flasherAuto = opts.flasherAuto ?? false;  // Flasher fuera de auto
    this.masterDim = 1;
    this.fixtures = new Map();
    for (const def of [...FIXTURES.hue, ...FIXTURES.dmx]) {
      this.fixtures.set(def.id, new Fixture(def));
    }
    this.log = [];
    this.hazeLevel = 0;
  }

  resolveTargets(targets) {
    if (!targets || targets === 'all') {
      return ALL_FIXTURE_IDS.filter((id) => this.flasherAuto || !this._isFlasher(id));
    }
    if (Array.isArray(targets)) return targets.filter((id) => this.fixtures.has(id));
    if (targets === 'hue') return FIXTURES.hue.map((f) => f.id);
    if (targets === 'par') return FIXTURES.dmx.filter((f) => f.group === 'par').map((f) => f.id);
    if (targets === 'flasher') return this.flasherAuto ? FIXTURES.dmx.filter((f) => f.group === 'flasher').map((f) => f.id) : [];
    return this.fixtures.has(targets) ? [targets] : [];
  }

  _isFlasher(id) { return this.fixtures.get(id)?.def.group === 'flasher'; }

  /** Dispara un cue. `cue` viene del timeline o del panel. */
  fire(cue) {
    const recipe = CUE_LIBRARY[cue.type];
    if (!recipe) { console.warn('[lighting] cue desconocido:', cue.type); return; }
    const color = cue.color || recipe.color;
    const intensity = cue.intensity !== undefined ? cue.intensity : recipe.intensity;
    const fade = cue.dur !== undefined && cue.dur > 0 ? cue.dur : recipe.fade;
    const targets = this.resolveTargets(cue.group || recipe.targets);
    const rgb = hexToRgb(color);
    const sweep = cue.sweep ?? recipe.sweep;
    const sweepDur = recipe.sweepDur ?? 3;

    // Barrido: ordena por posición X para que la luz recorra la sala
    const ordered = sweep
      ? [...targets].sort((a, b) => (this.fixtures.get(a).def.pos?.[0] ?? 0) - (this.fixtures.get(b).def.pos?.[0] ?? 0))
      : targets;

    ordered.forEach((id, i) => {
      const delay = sweep ? (i / Math.max(1, ordered.length - 1)) * sweepDur : 0;
      this.fixtures.get(id).setTarget(rgb, intensity * this.masterDim, fade, delay, recipe.decay || 0);
    });

    this.log.unshift({ t: Date.now(), type: cue.type, color, intensity, fade, targets: ordered.length, sweep: !!sweep });
    if (this.log.length > 60) this.log.pop();
  }

  update(dt) {
    for (const f of this.fixtures.values()) f.update(dt);
  }

  /** Estado completo para el simulador del panel. */
  get state() {
    const hue = {}, dmx = {};
    for (const f of FIXTURES.hue) hue[f.id] = this.fixtures.get(f.id).state;
    for (const f of FIXTURES.dmx) dmx[f.id] = this.fixtures.get(f.id).state;
    return { hue, dmx, haze: this.hazeLevel, strobeEnabled: this.strobeEnabled, flasherAuto: this.flasherAuto, masterDim: this.masterDim, connected: false };
  }

  allOff(fade = 1) {
    this.fire({ type: 'BLACKOUT', dur: fade });
  }

  /** Control manual desde el panel. */
  setFixture(id, hex, dim, fade = 0.5) {
    const f = this.fixtures.get(id);
    if (f) f.setTarget(hexToRgb(hex), clamp(dim, 0, 1), fade);
  }
}

export default LightingEngine;
