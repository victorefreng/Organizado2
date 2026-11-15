/**
 * WORLD G: OUR MEMORIES — mundo dedicado a fotografías y mensajes.
 * Cambia de estilo según la temática: nature | stars | gallery.
 */
import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { applyFog, softSprite } from '../fx/common.js';
import { MemoryGarden, PhotoFrame } from '../fx/PhotoFrame.js';
import { StarField, Nebula } from '../fx/Cosmos.js';
import { Fireflies } from '../fx/Plants.js';
import { MEMORIES } from '../config/memories.js';
import { clamp01, smoothstep, lerp } from '../core/easing.js';

const VARIANTS = {
  nature:  { palette: PALETTE.garden,   stars: 0.2, fireflies: 1,   radius: 9,  rows: 1 },
  stars:   { palette: PALETTE.cosmos,   stars: 1,   fireflies: 0.3, radius: 13, rows: 2 },
  gallery: { palette: PALETTE.memories, stars: 0.35, fireflies: 0.5, radius: 11, rows: 2 }
};

export default {
  id: 'memories',
  label: 'OUR MEMORIES',
  palette: PALETTE.memories,
  params: { variant: 'nature', autoAdvance: true, dwell: 9 },

  build({ scene, surface, quality, rng, assets, variant = 'nature' }) {
    const h = { surface, variant };
    const V = VARIANTS[variant] || VARIANTS.nature;
    h.V = V;
    scene.background = new THREE.Color(V.palette.base);
    h.fog = applyFog(scene, V.palette);

    h.stars = new StarField({ rng, count: Math.round(quality.starCount * 0.6), radius: 700, palette: PALETTE.cosmos });
    scene.add(h.stars.points);

    if (variant === 'stars') {
      h.nebula = new Nebula({ rng, patches: Math.round(quality.instanceBudget / 70), radius: 400, palette: PALETTE.cosmos });
      scene.add(h.nebula.mesh);
    }

    h.fireflies = new Fireflies({
      rng, count: Math.round(quality.particleBudget * 0.01), radius: 18, height: 8,
      color: V.palette.accent, size: 1.3
    });
    scene.add(h.fireflies.points);

    // galería tridimensional: los recuerdos en círculo (o doble anillo)
    h.frames = [];
    const all = [...MEMORIES].sort((a, b) => a.order - b.order);
    h.group = new THREE.Group();
    scene.add(h.group);

    (async () => {
      for (let i = 0; i < all.length; i++) {
        const m = all[i];
        const info = await assets.loadTexture(m.src);
        const perRow = Math.ceil(all.length / V.rows);
        const row = Math.floor(i / perRow);
        const idx = i % perRow;
        const a = (idx / perRow) * Math.PI * 2;
        const R = V.radius + row * 4.5;
        const placed = {
          ...m,
          position: [Math.sin(a) * R, 1.8 + row * 2.6, Math.cos(a) * R],
          rotation: [0, a + Math.PI, 0],
          animation: variant === 'stars' ? 'star-window' : variant === 'gallery' ? 'light-frame' : m.animation
        };
        const f = new PhotoFrame({
          memory: placed, textureInfo: info, palette: V.palette, rng,
          maxSize: [3.2, 2.4], flowers: variant === 'nature' ? 22 : 10
        });
        h.frames.push(f);
        h.group.add(f.group);
      }
      h.ready = true;
    })();

    h.ambient = new THREE.AmbientLight(new THREE.Color(V.palette.accent), 0.2);
    scene.add(h.ambient);
    h.focusIndex = 0;
    return h;
  },

  update({ handles: h, showTime, ambientTime, dt, params = {}, focus = 14 }) {
    const V = h.V;
    h.stars.update({ ambientTime, intensity: V.stars });
    h.nebula?.update({ ambientTime, intensity: 0.8 });
    h.fireflies.update({ ambientTime, intensity: V.fireflies, focus });

    const dwell = params.dwell ?? 9;
    // todos revelados; el "actual" brilla más
    const current = params.autoAdvance === false
      ? (params.index ?? h.focusIndex)
      : Math.floor(ambientTime / dwell) % Math.max(1, h.frames.length);
    h.focusIndex = current;

    for (let i = 0; i < h.frames.length; i++) {
      const f = h.frames[i];
      const isCurrent = i === current;
      f.update({
        p: 1,
        ambientTime,
        chorus: isCurrent ? 1 : 0.12,
        focus
      });
      // el actual se adelanta ligeramente hacia la cámara
      const target = isCurrent ? 1.08 : 1.0;
      f.group.scale.setScalar(lerp(f.group.scale.x, target * (f.memory.scale ?? 1), Math.min(1, dt * 2.6)));
    }
    h.group.rotation.y = ambientTime * 0.012;
  },

  interact(h, { type, index }) {
    if (type === 'pick-memory' && h.frames[index]) {
      h.focusIndex = index;
      return h.frames[index].cameraTarget;
    }
    return null;
  },

  cameraRig({ ambientTime, handles: h }) {
    const V = h?.V || VARIANTS.nature;
    const i = h?.focusIndex ?? 0;
    const n = Math.max(1, h?.frames?.length || 6);
    const perRow = Math.ceil(n / V.rows);
    const a = ((i % perRow) / perRow) * Math.PI * 2;
    const R = V.radius + Math.floor(i / perRow) * 4.5;
    const fx = Math.sin(a) * R, fz = Math.cos(a) * R;
    const fy = 1.8 + Math.floor(i / perRow) * 2.6;
    // la cámara se sitúa frente al recuerdo actual, con deriva mínima
    const k = 0.62;
    return {
      position: [fx * k + Math.sin(ambientTime * 0.1) * 0.4, fy + 0.3, fz * k + Math.cos(ambientTime * 0.1) * 0.4],
      target: [fx, fy, fz],
      fov: 40
    };
  },

  dispose(h) {
    h.stars?.dispose(); h.nebula?.dispose(); h.fireflies?.dispose();
    h.frames?.forEach((f) => f.dispose());
    h.group?.parent?.remove(h.group);
  }
};
