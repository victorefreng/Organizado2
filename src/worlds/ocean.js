/**
 * WORLD: DEEP OCEAN — escena 006 y WORLD B.
 *
 * La ballena del techo y la de la pantalla principal son DOS objetos distintos en
 * el MISMO stage virtual: la primera cruza a y≈0, la segunda a y≈+17. Cada cámara
 * ve la que entra en su frustum. Eso es lo que hace que "parezca que están ahí".
 */
import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { applyFog } from '../fx/common.js';
import { Whale, FishSchool, LightShafts, Jellyfish, SuspendedParticles } from '../fx/Marine.js';
import { WaterSurface, Caustics } from '../fx/Water.js';
import { clamp01, smoothstep, lerp } from '../core/easing.js';

const VARIANTS = {
  shallow: { depth: -4,  fogDensity: 0.02,  lum: 1.0, shafts: 1.0 },
  deep:    { depth: -14, fogDensity: 0.035, lum: 0.7, shafts: 0.7 },
  abyss:   { depth: -34, fogDensity: 0.055, lum: 0.35, shafts: 0.25 }
};

export default {
  id: 'ocean',
  label: 'DEEP OCEAN',
  palette: PALETTE.ocean,
  /** Parámetros editables en vivo, como pide el brief. */
  params: { fishDensity: 1, luminosity: 1, depth: 1, speed: 1, variant: 'deep' },

  build({ scene, surface, quality, rng, assets, variant = 'deep' }) {
    const h = { surface, variant };
    const V = VARIANTS[variant] || VARIANTS.deep;
    h.V = V;
    scene.background = new THREE.Color(PALETTE.ocean.base);
    h.fog = applyFog(scene, { ...PALETTE.ocean, fogDensity: V.fogDensity });

    // techo del océano: lo vemos desde abajo
    h.surfaceWater = new WaterSurface({ size: 320, segments: 120, palette: PALETTE.ocean, amp: 0.8, chop: 1.2 });
    h.surfaceWater.mesh.position.y = 26;
    h.surfaceWater.mesh.rotation.x = Math.PI / 2; // visible desde abajo
    scene.add(h.surfaceWater.mesh);

    // fondo con cáusticas
    h.caustics = new Caustics({ size: 220, palette: PALETTE.ocean });
    h.caustics.mesh.position.y = -42;
    scene.add(h.caustics.mesh);

    // El fondo usa el color de la niebla: así se funde con la distancia en vez
    // de recortarse como una silueta negra con un borde poligonal visible.
    const floorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.ocean.abyss) });
    floorMat.fog = true;
    h.floor = new THREE.Mesh(new THREE.CircleGeometry(220, 96), floorMat);
    h.floor.rotation.x = -Math.PI / 2;
    h.floor.position.y = -44;
    scene.add(h.floor);

    // rayos de luz atravesando el agua
    h.shafts = new LightShafts({
      rng, count: Math.max(5, Math.round(quality.instanceBudget / 420)),
      height: 96, radius: 40, color: PALETTE.ocean.rays,
      spreadTop: 1.2, spreadBottom: 5
    });
    h.shafts.group.position.y = -4;
    scene.add(h.shafts.group);

    // partículas en suspensión: el "estar dentro del medio"
    h.plankton = new SuspendedParticles({
      rng, count: Math.round(quality.particleBudget * 0.07),
      radius: 55, height: 70, color: PALETTE.ocean.rays, size: 0.5
    });
    scene.add(h.plankton.points);

    // bancos de peces: tres, a distintas profundidades y velocidades
    h.schools = [];
    const schoolSizes = [0.55, 0.3, 0.15];
    for (let i = 0; i < 3; i++) {
      const s = new FishSchool({
        rng,
        count: Math.max(60, Math.round(quality.instanceBudget * 0.09 * schoolSizes[i] * 3)),
        spread: [7, 4.5, 11][i],
        palette: PALETTE.ocean,
        center: [[-4, -3, -14], [10, 2, -26], [-16, -9, -34]][i],
        scale: [1, 0.7, 1.4][i],
        speed: [1, 1.35, 0.7][i]
      });
      scene.add(s.mesh);
      h.schools.push(s);
    }

    // medusas
    h.jellies = new Jellyfish({
      rng, count: Math.max(8, Math.round(quality.instanceBudget / 260)),
      radius: 40, palette: PALETTE.ocean
    });
    h.jellies.group.position.y = -12;
    scene.add(h.jellies.group);

    // corales: conos y toros apilados, barato y legible en silueta
    h.corals = new THREE.Group();
    const coralCount = Math.max(14, Math.round(quality.instanceBudget / 90));
    const coralMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#0a3245'), fog: true });
    for (let i = 0; i < coralCount; i++) {
      const [x, z] = rng.disk(90);
      const g = new THREE.Group();
      const nBr = rng.int(2, 5);
      for (let b = 0; b < nBr; b++) {
        const hh = rng.range(1.4, 5.5);
        const m = new THREE.Mesh(new THREE.ConeGeometry(rng.range(0.25, 0.8), hh, 6), coralMat);
        m.position.set(rng.range(-1, 1), hh / 2, rng.range(-1, 1));
        m.rotation.z = rng.range(-0.3, 0.3);
        g.add(m);
      }
      g.position.set(x, -44, z);
      g.scale.setScalar(rng.range(0.6, 1.8));
      h.corals.add(g);
    }
    scene.add(h.corals);

    // ── las dos ballenas ──
    h.whaleMain = new Whale({ length: 15, palette: PALETTE.ocean, segments: quality.plantSegments * 5 });
    scene.add(h.whaleMain.group);
    h.whaleCeiling = new Whale({ length: 12, palette: PALETTE.ocean, segments: quality.plantSegments * 4 });
    scene.add(h.whaleCeiling.group);

    // delfines y tortuga para el modo biblioteca
    h.dolphins = [];
    for (let i = 0; i < 3; i++) {
      const d = new Whale({ length: 2.6, palette: PALETTE.ocean, segments: 26 });
      d.group.visible = false;
      scene.add(d.group);
      h.dolphins.push(d);
    }

    h.ambient = new THREE.HemisphereLight(
      new THREE.Color(PALETTE.ocean.rays), new THREE.Color(PALETTE.ocean.abyss), 0.5 * V.lum
    );
    scene.add(h.ambient);

    return h;
  },

  update({ handles: h, showTime, ambientTime, dt, params = {}, focus = 14, mode = 'show' }) {
    const t = showTime;
    const V = h.V;
    const density = params.fishDensity ?? 1;
    const lum = (params.luminosity ?? 1) * V.lum;
    const speed = params.speed ?? 1;
    const depthK = params.depth ?? 1;

    h.surfaceWater.update({ ambientTime, dt, galaxy: 0, opacity: 0.9 });
    h.caustics.update({ ambientTime, intensity: 0.3 * lum });
    h.shafts.update({ ambientTime, intensity: V.shafts * lum });
    h.plankton.update({ dt, ambientTime, intensity: 0.7 * lum, focus });
    h.jellies.update({ ambientTime, intensity: lum });
    h.ambient.intensity = 0.5 * lum;

    for (let i = 0; i < h.schools.length; i++) {
      h.schools[i].update({
        t: ambientTime,
        density: clamp01(density),
        speed: [1, 1.35, 0.7][i] * speed,
        spread: [7, 4.5, 11][i],
        opacity: lum
      });
    }

    if (mode === 'library') {
      // las ballenas aparecen OCASIONALMENTE, no en bucle constante
      const cycle = 95;                       // cada ~95 s
      const phase = (ambientTime % cycle) / cycle;
      const show = phase < 0.34;              // visibles un tercio del ciclo
      h.whaleMain.setVisible(show);
      if (show) {
        h.whaleMain.update({
          t: (ambientTime % cycle) * speed, dt, path: 'cross',
          depth: -6 * depthK, opacity: smoothstep(0, 0.06, phase) * (1 - smoothstep(0.28, 0.34, phase))
        });
      }
      const phase2 = ((ambientTime + 47) % cycle) / cycle;
      const show2 = phase2 < 0.3;
      h.whaleCeiling.setVisible(show2);
      if (show2) {
        h.whaleCeiling.update({
          t: ((ambientTime + 47) % cycle) * speed, dt, path: 'ceiling',
          depth: 0, opacity: smoothstep(0, 0.06, phase2) * (1 - smoothstep(0.24, 0.3, phase2))
        });
      }
      for (let i = 0; i < h.dolphins.length; i++) {
        const dp = ((ambientTime + i * 31) % 140) / 140;
        const vis = dp < 0.2;
        h.dolphins[i].setVisible(vis);
        if (vis) h.dolphins[i].update({ t: ambientTime * 2.2 + i * 9, dt, path: 'orbit', depth: -2 - i * 3, opacity: 0.9 });
      }
      return;
    }

    // ── ESCENA 006: 215→250 ──
    // la ballena principal cruza entre 232 y 248
    const mainOp = smoothstep(230, 236, t) * (1 - smoothstep(247, 250, t));
    h.whaleMain.setVisible(mainOp > 0.01);
    if (mainOp > 0.01) {
      // 236-246 cruza; desde 246 asciende (cue ASCEND)
      const ascending = t >= 246;
      h.whaleMain.update({
        t: ascending ? (t - 246) : (t - 220),
        dt,
        path: ascending ? 'ascend' : 'cross',
        offset: ascending ? 0 : 8,
        depth: ascending ? -2 : -2,
        speed,
        opacity: mainOp
      });
    }

    // la del techo cruza un poco antes, desfasada
    const ceilOp = smoothstep(228, 234, t) * (1 - smoothstep(248, 251, t));
    h.whaleCeiling.setVisible(ceilOp > 0.01);
    if (ceilOp > 0.01) {
      h.whaleCeiling.update({
        t: t - 222, dt, path: 'ceiling', offset: 0, depth: 0, speed, opacity: ceilOp
      });
    }
  },

  interact(h, { type }) {
    if (type === 'whale-cross') {
      h._forceWhale = true;
      return true;
    }
    return null;
  },

  cameraRig({ ambientTime }) {
    const a = ambientTime * 0.016;
    return {
      position: [Math.sin(a) * 22, -3 + Math.sin(ambientTime * 0.05) * 2.4, Math.cos(a) * 22],
      target: [Math.sin(a + 2.4) * 8, -4, Math.cos(a + 2.4) * 8],
      fov: 48
    };
  },

  dispose(h) {
    h.whaleMain?.dispose(); h.whaleCeiling?.dispose();
    h.dolphins?.forEach((d) => d.dispose());
    h.schools?.forEach((s) => s.dispose());
    h.jellies?.dispose(); h.shafts?.dispose(); h.plankton?.dispose();
    h.surfaceWater?.dispose(); h.caustics?.dispose();
    h.floor?.geometry.dispose(); h.floor?.material.dispose();
    h.corals?.traverse((o) => { o.geometry?.dispose?.(); });
    h.corals?.parent?.remove(h.corals);
  }
};
