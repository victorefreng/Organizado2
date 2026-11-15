/**
 * WORLD: VOID — escenas 001 y 002.
 * Oscuridad absoluta → nace un punto de luz → la estrella fugaz cruza el universo.
 */
import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { applyFog, softSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from '../fx/common.js';
import { ShootingStar, EnergyWave, OPENING_PATH } from '../fx/ShootingStar.js';
import { StarField } from '../fx/Cosmos.js';
import { clamp01, ease, pulse, smoothstep } from '../core/easing.js';

export default {
  id: 'void',
  label: 'VOID',
  palette: PALETTE.void,

  build({ scene, surface, quality, rng }) {
    const h = {};
    scene.background = new THREE.Color(PALETTE.void.base);
    h.fog = applyFog(scene, PALETTE.void);

    // campo de estrellas muy tenue: el vacío no está vacío, solo oscuro
    h.stars = new StarField({
      rng, count: Math.round(quality.starCount * 0.35), radius: 700, palette: PALETTE.cosmos, sizeScale: 0.8
    });
    scene.add(h.stars.points);

    // la estrella
    h.star = new ShootingStar({
      rng,
      trailCount: Math.min(3600, Math.round(quality.particleBudget * 0.09)),
      fragmentCount: Math.min(260, Math.round(quality.particleBudget * 0.006)),
      path: OPENING_PATH
    });
    h.star.addTo(scene);

    // zonas de luz que la estrella despierta al pasar
    const nodeCount = 46;
    h.nodes = [];
    h.nodeArr = allocParticles(nodeCount);
    const cAccent = new THREE.Color(PALETTE.void.accent);
    for (let i = 0; i < nodeCount; i++) {
      const u = i / nodeCount;
      // repartidos cerca de la trayectoria: la estrella los "enciende" al pasar
      const p = h.star.curve.getPointAt(Math.min(0.999, u * 0.92 + 0.04));
      const off = 6;
      const x = p.x + rng.gauss(0, off), y = p.y + rng.gauss(0, off * 0.6), z = p.z + rng.gauss(0, off);
      h.nodeArr.position[i * 3] = x;
      h.nodeArr.position[i * 3 + 1] = y;
      h.nodeArr.position[i * 3 + 2] = z;
      h.nodeArr.aSize[i] = rng.range(0.8, 2.6);
      h.nodeArr.aAlpha[i] = 0;
      h.nodeArr.aPhase[i] = rng();
      setColorAt(h.nodeArr.aColor, i, cAccent);
      h.nodes.push({ u: u * 0.92 + 0.04, x, y, z });
    }
    h.nodeGeo = buildParticleGeometry(nodeCount, h.nodeArr);
    h.nodeMat = makeParticleMaterial({ map: softSprite(128, 2.0), size: 2.4, color: 0xffffff });
    h.nodePoints = new THREE.Points(h.nodeGeo, h.nodeMat);
    h.nodePoints.frustumCulled = false;
    scene.add(h.nodePoints);

    // bruma: lo que hace que la luz de la estrella "ilumine aire"
    h.haze = new THREE.Mesh(
      new THREE.SphereGeometry(140, 24, 18),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(PALETTE.void.haze) },
          uOpacity: { value: 0.03 },
          uTime: { value: 0 }
        },
        vertexShader: `varying vec3 vN; void main(){ vN=normalize(normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `
          uniform vec3 uColor; uniform float uOpacity, uTime; varying vec3 vN;
          void main(){
            float band = 0.5 + 0.5 * sin(vN.y * 3.0 + uTime * 0.05);
            gl_FragColor = vec4(uColor, uOpacity * (0.4 + band * 0.6));
          }
        `,
        side: THREE.BackSide, transparent: true, depthWrite: false
      })
    );
    scene.add(h.haze);

    h.wave = new EnergyWave({ color: PALETTE.void.accent, maxRadius: 30 });
    scene.add(h.wave.mesh);

    h.surface = surface;
    return h;
  },

  /**
   * @param showTime  absoluto (0..300 en el opening)
   * @param scene     definición de la escena actual (src/config/show.js)
   */
  update({ handles: h, showTime, ambientTime, dt, scene, focus = 14 }) {
    const t = showTime;

    // ── ESCENA 001: 0→35. El punto nace y vibra. ──
    if (t < 35) {
      // 0-8: negro absoluto de verdad (ni la estrella)
      const birth = smoothstep(8, 20, t);
      const grow = smoothstep(18, 35, t);
      h.star.setSeed(new THREE.Vector3(0, 0, 0), birth * (0.25 + grow * 0.55));
      h.star.update({ dt, intensity: birth * (0.3 + grow * 0.7), emit: t > 18, ambientTime, focus });
      h.stars.update({ ambientTime, intensity: smoothstep(14, 34, t) * 0.25 });
      h.haze.material.uniforms.uOpacity.value = 0.004 + birth * 0.022;
    }
    // ── ESCENA 002: 35→75. Nacimiento y viaje. ──
    else if (t < 75) {
      const local = t - 35;
      // 35-42: estalla en el sitio
      if (local < 7) {
        const k = local / 7;
        h.star.setSeed(new THREE.Vector3(0, 0, 0), 0.8 + ease('easeOutExpo', k) * 0.9);
        h.star.update({ dt, intensity: 1, emit: true, ambientTime, focus });
        if (local > 0.1 && !h._burst) {
          h._burst = true;
          h.wave.trigger(new THREE.Vector3(0, 0, 0), 2.2);
        }
      } else {
        // 42-75: recorre la curva. Velocidad no uniforme: acelera y frena.
        const k = clamp01((local - 7) / 33);
        const u = ease('easeInOutCubic', k) * 0.92;
        h.star.setProgress(u, dt);
        h.star.update({ dt, intensity: 1, emit: true, ambientTime, focus });
      }
      h.stars.update({ ambientTime, intensity: 0.3 });
      h.haze.material.uniforms.uOpacity.value = 0.026;

      // los nodos se encienden cuando la estrella los pasa
      const sp = h.star.progress;
      const a = h.nodeArr.aAlpha;
      for (let i = 0; i < h.nodes.length; i++) {
        const d = sp - h.nodes[i].u;
        if (d > 0) {
          const blink = 0.55 + 0.45 * Math.sin(ambientTime * 1.4 + h.nodeArr.aPhase[i] * 6.2831);
          a[i] = Math.min(1, d * 7) * blink * 0.85;
        } else a[i] = 0;
      }
      h.nodeGeo.attributes.aAlpha.needsUpdate = true;
      h.nodeMat.uniforms.uTime.value = ambientTime;
      h.nodeMat.uniforms.uFocus.value = focus;
    }
    // ── después de 75 la estrella ya impactó: este mundo se apaga ──
    else {
      h.star.update({ dt, intensity: 0, emit: false, ambientTime, focus });
      h.star.hide();
    }

    h.wave.update(dt);
    h.haze.material.uniforms.uTime.value = ambientTime;
  },

  /** Nodos que la estrella despertó: los usa GARDEN para germinar ahí. */
  getNodes(h) { return h.nodes; },

  dispose(h) {
    h.star?.dispose();
    h.stars?.dispose();
    h.wave?.dispose();
    h.nodeGeo?.dispose(); h.nodeMat?.dispose();
    h.haze?.geometry.dispose(); h.haze?.material.dispose();
  }
};
