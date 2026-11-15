/**
 * LA ESTRELLA FUGAZ — personaje principal del show.
 *
 * No es una línea blanca. Son cinco sistemas superpuestos:
 *   1. Núcleo sobreexposto (billboard con destello de púas).
 *   2. Corona ámbar que respira.
 *   3. Estela de partículas con inercia (cada una recuerda dónde estaba el núcleo).
 *   4. Fragmentos brillantes que se desprenden con velocidad propia y mueren.
 *   5. Luz ambiental real que ilumina lo que la estrella pasa cerca.
 *
 * La trayectoria es una curva Catmull-Rom en el stage virtual compartido, así que
 * la estrella atraviesa las tres superficies: no se replica, es el mismo objeto
 * visto por tres cámaras.
 */
import * as THREE from 'three';
import { softSprite, flareSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { clamp01, ease, lerp, pulse } from '../core/easing.js';
import { STARLIGHT } from '../config/palette.js';

/**
 * Trayectoria del opening. Pensada para que la estrella:
 *   - nazca lejos y centrada (visible en STORY),
 *   - suba y cruce a la izquierda (entra en ENVIRONMENT),
 *   - pase alta por encima (entra en CEILING),
 *   - y descienda al suelo frente a la cámara (impacto en STORY).
 */
export const OPENING_PATH = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-14, 6, -16),
  new THREE.Vector3(-26, 16, -34),
  new THREE.Vector3(-8, 26, -46),
  new THREE.Vector3(18, 22, -38),
  new THREE.Vector3(26, 10, -18),
  new THREE.Vector3(14, 2, -4),
  new THREE.Vector3(2, 0.6, 2),
  new THREE.Vector3(0, 0.05, 0)
];

export class ShootingStar {
  /**
   * @param opts.trailCount número de partículas de estela
   * @param opts.path array de Vector3
   * @param opts.scale escala general (la estrella del cosmos es más pequeña)
   */
  constructor(opts = {}) {
    const {
      trailCount = 2200,
      fragmentCount = 160,
      path = OPENING_PATH,
      scale = 1,
      color = STARLIGHT.amber,
      coreColor = STARLIGHT.core,
      rng = Math.random
    } = opts;

    this.scale = scale;
    this.group = new THREE.Group();
    this.group.name = 'shooting-star';
    this.curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.4);
    this.progress = 0;
    this.visible = false;
    this._prevPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.speed = 0;

    // ── 1. núcleo ──────────────────────────────────────────────────────────
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareSprite(256),
      color: new THREE.Color(coreColor),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.core.scale.setScalar(2.4 * scale);
    this.group.add(this.core);

    // ── 2. corona ──────────────────────────────────────────────────────────
    this.corona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softSprite(256, 1.6),
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.corona.scale.setScalar(7 * scale);
    this.group.add(this.corona);

    // ── 3. estela con inercia ──────────────────────────────────────────────
    this.trailCount = trailCount;
    this._trail = allocParticles(trailCount);
    this._trailVel = new Float32Array(trailCount * 3);
    this._trailLife = new Float32Array(trailCount);
    this._trailMax = new Float32Array(trailCount);
    this._trailCursor = 0;
    const cAmber = new THREE.Color(color);
    const cCore = new THREE.Color(coreColor);
    for (let i = 0; i < trailCount; i++) {
      this._trailLife[i] = 0;
      this._trail.aAlpha[i] = 0;
      this._trail.aSize[i] = 0;
      this._trail.aPhase[i] = rng();
      setColorAt(this._trail.aColor, i, cAmber);
    }
    this.trailGeo = buildParticleGeometry(trailCount, this._trail);
    this.trailMat = makeParticleMaterial({
      map: softSprite(128, 2.6),
      size: 1.6 * scale,
      color: 0xffffff,
      opacity: 1
    });
    this.trail = new THREE.Points(this.trailGeo, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.renderOrder = 2;

    // ── 4. fragmentos ──────────────────────────────────────────────────────
    this.fragCount = fragmentCount;
    this._frag = allocParticles(fragmentCount);
    this._fragVel = new Float32Array(fragmentCount * 3);
    this._fragLife = new Float32Array(fragmentCount);
    this._fragCursor = 0;
    for (let i = 0; i < fragmentCount; i++) {
      this._frag.aAlpha[i] = 0;
      this._frag.aSize[i] = 0;
      this._frag.aPhase[i] = rng();
      setColorAt(this._frag.aColor, i, cCore);
    }
    this.fragGeo = buildParticleGeometry(fragmentCount, this._frag);
    this.fragMat = makeParticleMaterial({
      map: flareSprite(128),
      size: 2.6 * scale,
      color: 0xffffff
    });
    this.fragments = new THREE.Points(this.fragGeo, this.fragMat);
    this.fragments.frustumCulled = false;

    // ── 5. luz real ────────────────────────────────────────────────────────
    this.light = new THREE.PointLight(new THREE.Color(color), 0, 42, 2);
    this.group.add(this.light);

    this._rng = rng;
    this._emitAcc = 0;
  }

  /** Añade todos los nodos a la escena (la estela va en el espacio del mundo). */
  addTo(scene) {
    scene.add(this.group);
    scene.add(this.trail);
    scene.add(this.fragments);
    return this;
  }

  /** Posiciona la estrella en un punto fijo (fase "semilla" de la escena 001). */
  setSeed(position, intensity = 1) {
    this.group.position.copy(position);
    this.visible = true;
    this.group.visible = true;
    const s = 0.14 + intensity * 0.5;
    this.core.scale.setScalar(s * this.scale);
    this.corona.scale.setScalar(s * 3.1 * this.scale);
    this.core.material.opacity = intensity;
    this.corona.material.opacity = 0.35 * intensity;
    this.light.intensity = intensity * 2.2;
  }

  /** Coloca la estrella en `u` ∈ [0,1] de la curva. */
  setProgress(u, dt = 0.016) {
    this.progress = clamp01(u);
    const p = this.curve.getPointAt(this.progress);
    if (dt > 0) {
      this.velocity.copy(p).sub(this._prevPos).divideScalar(Math.max(dt, 0.001));
      this.speed = this.velocity.length();
    }
    this._prevPos.copy(p);
    this.group.position.copy(p);
    this.visible = true;
    this.group.visible = true;
    return p;
  }

  /**
   * @param o.t              tiempo de escena normalizado o absoluto (solo para fase)
   * @param o.intensity      0..1 brillo general
   * @param o.emit           true si debe emitir estela
   * @param o.ambientTime    para la vibración (no se congela en HOLD)
   * @param o.dt             delta
   * @param o.focus          distancia de foco de la cámara (rack-focus)
   */
  update({ dt = 0.016, intensity = 1, emit = true, ambientTime = 0, focus = 14 } = {}) {
    const sc = this.scale;

    // vibración del núcleo: respiración, no parpadeo
    const vib = 1 + Math.sin(ambientTime * 3.7) * 0.05 + Math.sin(ambientTime * 9.1) * 0.02;
    const baseCore = 1.6 + Math.min(this.speed, 60) * 0.028;
    this.core.scale.setScalar(baseCore * vib * intensity * sc);
    this.corona.scale.setScalar(baseCore * 3.4 * (2 - vib) * intensity * sc);
    this.core.material.opacity = intensity;
    this.corona.material.opacity = 0.5 * intensity;
    this.light.intensity = intensity * (3 + Math.min(this.speed, 50) * 0.08);

    // ── emisión de estela: 1 partícula por cada tramo recorrido ──
    if (emit && intensity > 0.02) {
      const want = Math.min(90, 14 + this.speed * 1.6);
      this._emitAcc += want * dt;
      const n = Math.floor(this._emitAcc);
      this._emitAcc -= n;
      for (let k = 0; k < n; k++) {
        const i = this._trailCursor;
        this._trailCursor = (this._trailCursor + 1) % this.trailCount;
        // nace ligeramente detrás del núcleo, con dispersión
        const back = this.velocity.clone().normalize().multiplyScalar(-this._rng() * 0.6 * sc);
        const jitter = 0.22 * sc;
        this._trail.position[i * 3]     = this.group.position.x + back.x + (this._rng() - 0.5) * jitter;
        this._trail.position[i * 3 + 1] = this.group.position.y + back.y + (this._rng() - 0.5) * jitter;
        this._trail.position[i * 3 + 2] = this.group.position.z + back.z + (this._rng() - 0.5) * jitter;
        // hereda parte de la velocidad: inercia real
        const inh = 0.12 + this._rng() * 0.18;
        this._trailVel[i * 3]     = this.velocity.x * inh + (this._rng() - 0.5) * 1.1;
        this._trailVel[i * 3 + 1] = this.velocity.y * inh + (this._rng() - 0.5) * 1.1 + 0.25;
        this._trailVel[i * 3 + 2] = this.velocity.z * inh + (this._rng() - 0.5) * 1.1;
        const life = 1.1 + this._rng() * 2.4;
        this._trailLife[i] = life;
        this._trailMax[i] = life;
        this._trail.aSize[i] = (0.35 + this._rng() * 0.9) * sc;
        this._trail.aAlpha[i] = 0.9;
      }

      // fragmentos: escasos, brillantes, con trayectoria propia
      if (this.speed > 6 && this._rng() < dt * 22) {
        const i = this._fragCursor;
        this._fragCursor = (this._fragCursor + 1) % this.fragCount;
        this._frag.position[i * 3]     = this.group.position.x;
        this._frag.position[i * 3 + 1] = this.group.position.y;
        this._frag.position[i * 3 + 2] = this.group.position.z;
        const spread = 3.4;
        this._fragVel[i * 3]     = this.velocity.x * 0.3 + (this._rng() - 0.5) * spread;
        this._fragVel[i * 3 + 1] = this.velocity.y * 0.3 + (this._rng() - 0.5) * spread;
        this._fragVel[i * 3 + 2] = this.velocity.z * 0.3 + (this._rng() - 0.5) * spread;
        this._fragLife[i] = 1.4 + this._rng() * 1.6;
        this._frag.aSize[i] = (0.8 + this._rng() * 1.5) * sc;
        this._frag.aAlpha[i] = 1;
      }
    }

    // ── integración de la estela ──
    const drag = Math.pow(0.52, dt);
    for (let i = 0; i < this.trailCount; i++) {
      if (this._trailLife[i] <= 0) continue;
      this._trailLife[i] -= dt;
      const k = clamp01(this._trailLife[i] / this._trailMax[i]);
      this._trail.position[i * 3]     += this._trailVel[i * 3] * dt;
      this._trail.position[i * 3 + 1] += this._trailVel[i * 3 + 1] * dt;
      this._trail.position[i * 3 + 2] += this._trailVel[i * 3 + 2] * dt;
      this._trailVel[i * 3]     *= drag;
      this._trailVel[i * 3 + 1] = this._trailVel[i * 3 + 1] * drag + 0.12 * dt; // flotan
      this._trailVel[i * 3 + 2] *= drag;
      // se apagan en curva, no linealmente
      this._trail.aAlpha[i] = Math.pow(k, 1.7) * 0.95 * intensity;
      if (this._trailLife[i] <= 0) this._trail.aAlpha[i] = 0;
    }

    const fdrag = Math.pow(0.78, dt);
    for (let i = 0; i < this.fragCount; i++) {
      if (this._fragLife[i] <= 0) continue;
      this._fragLife[i] -= dt;
      this._frag.position[i * 3]     += this._fragVel[i * 3] * dt;
      this._frag.position[i * 3 + 1] += this._fragVel[i * 3 + 1] * dt;
      this._frag.position[i * 3 + 2] += this._fragVel[i * 3 + 2] * dt;
      this._fragVel[i * 3] *= fdrag;
      this._fragVel[i * 3 + 1] = this._fragVel[i * 3 + 1] * fdrag - 1.1 * dt; // gravedad leve
      this._fragVel[i * 3 + 2] *= fdrag;
      this._frag.aAlpha[i] = clamp01(this._fragLife[i] / 1.6) * intensity;
      if (this._fragLife[i] <= 0) this._frag.aAlpha[i] = 0;
    }

    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.aAlpha.needsUpdate = true;
    this.trailGeo.attributes.aSize.needsUpdate = true;
    this.fragGeo.attributes.position.needsUpdate = true;
    this.fragGeo.attributes.aAlpha.needsUpdate = true;
    this.fragGeo.attributes.aSize.needsUpdate = true;

    this.trailMat.uniforms.uTime.value = ambientTime;
    this.trailMat.uniforms.uFocus.value = focus;
    this.fragMat.uniforms.uTime.value = ambientTime;
    this.fragMat.uniforms.uFocus.value = focus;
  }

  hide() {
    this.group.visible = false;
    this.visible = false;
    this.light.intensity = 0;
  }

  /** Apaga la estela de golpe (al cambiar de mundo). */
  clearTrail() {
    for (let i = 0; i < this.trailCount; i++) { this._trailLife[i] = 0; this._trail.aAlpha[i] = 0; }
    for (let i = 0; i < this.fragCount; i++) { this._fragLife[i] = 0; this._frag.aAlpha[i] = 0; }
    this.trailGeo.attributes.aAlpha.needsUpdate = true;
    this.fragGeo.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.trailGeo.dispose(); this.trailMat.dispose();
    this.fragGeo.dispose(); this.fragMat.dispose();
    this.core.material.dispose(); this.corona.material.dispose();
    this.group.parent?.remove(this.group);
    this.trail.parent?.remove(this.trail);
    this.fragments.parent?.remove(this.fragments);
  }
}

/**
 * ONDA DE ENERGÍA — el recurso que justifica cada transición.
 * Anillo que corre por una superficie deformándola, con borde luminoso.
 */
export class EnergyWave {
  constructor({ color = STARLIGHT.amber, segments = 96, maxRadius = 40 } = {}) {
    this.maxRadius = maxRadius;
    const geo = new THREE.RingGeometry(0.9, 1, segments, 1);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
        uWidth: { value: 0.28 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity, uWidth;
        varying vec2 vUv;
        void main(){
          float d = abs(vUv.y - 0.5) * 2.0;
          float a = smoothstep(1.0, 1.0 - uWidth, d);
          gl_FragColor = vec4(uColor, a * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.active = false;
    this.t = 0;
    this.duration = 2.6;
  }

  trigger(position, duration = 2.6) {
    this.mesh.position.copy(position);
    this.duration = duration;
    this.t = 0;
    this.active = true;
    this.mesh.visible = true;
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const k = clamp01(this.t / this.duration);
    const r = ease('easeOutQuart', k) * this.maxRadius;
    this.mesh.scale.setScalar(Math.max(0.01, r));
    this.mat.uniforms.uOpacity.value = (1 - k) * 0.85;
    this.mat.uniforms.uWidth.value = lerp(0.5, 0.06, k);
    if (k >= 1) { this.active = false; this.mesh.visible = false; }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}

export default ShootingStar;
