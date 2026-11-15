/**
 * CIELO: nubes volumétricas por capas, bandadas, avión y gradiente de hora del día.
 *
 * Las nubes son "volumétricas por impostores": muchas capas de parches de ruido
 * con parallax propio. A 1080p y con niebla leen como cúmulos reales y cuestan
 * una fracción de un raymarch de verdad, que en tres salidas simultáneas no es
 * viable en un PC de escritorio.
 */
import * as THREE from 'three';
import { cloudSprite, softSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { clamp01, lerp, smoothstep } from '../core/easing.js';
import { PALETTE } from '../config/palette.js';

/** Gradiente de cielo con sol direccional. Domo interior. */
export class SkyDome {
  constructor({ radius = 900, palette = PALETTE.sky }) {
    const geo = new THREE.SphereGeometry(radius, 32, 24);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(palette.dusk || '#2A3B6B') },
        uHorizon: { value: new THREE.Color(palette.gold || '#FFD9A0') },
        uBottom: { value: new THREE.Color(palette.dawn || '#FFB27A') },
        uSunDir: { value: new THREE.Vector3(0.4, 0.12, -0.9).normalize() },
        uSunColor: { value: new THREE.Color('#FFF3D6') },
        uSunIntensity: { value: 1 },
        uStars: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor;
        uniform float uSunIntensity, uStars, uTime;
        varying vec3 vDir;

        float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }

        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          // tres bandas: cenit, horizonte, bajo el horizonte
          vec3 c = mix(uBottom, uHorizon, smoothstep(-0.25, 0.08, h));
          c = mix(c, uTop, smoothstep(0.04, 0.62, h));

          // sol y su halo atmosférico
          float sd = max(0.0, dot(d, normalize(uSunDir)));
          c += uSunColor * pow(sd, 220.0) * 2.4 * uSunIntensity;
          c += uSunColor * pow(sd, 7.0) * 0.26 * uSunIntensity;

          // estrellas al caer la noche
          if (uStars > 0.001) {
            vec3 q = floor(d * 420.0);
            float s = hash(q);
            float star = step(0.9975, s) * (0.55 + 0.45 * sin(uTime * 2.0 + s * 90.0));
            c += vec3(1.0, 0.95, 0.86) * star * uStars * smoothstep(-0.05, 0.3, h);
          }
          gl_FragColor = vec4(c, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.name = 'sky-dome';
  }

  /** @param tod 0 = amanecer, 0.5 = dorado, 1 = noche */
  setTimeOfDay(tod, palette = PALETTE.sky) {
    const dawn = new THREE.Color(palette.dawn), gold = new THREE.Color(palette.gold);
    const day = new THREE.Color(palette.day), dusk = new THREE.Color(palette.dusk);
    const night = new THREE.Color(palette.night);
    const u = this.mat.uniforms;
    if (tod < 0.34) {
      const k = tod / 0.34;
      u.uTop.value.copy(dusk).lerp(day, k);
      u.uHorizon.value.copy(dawn).lerp(gold, k);
      u.uBottom.value.copy(dawn);
      u.uSunIntensity.value = lerp(0.6, 1.0, k);
      u.uSunDir.value.set(0.5, lerp(0.02, 0.4, k), -0.86).normalize();
      u.uStars.value = lerp(0.25, 0, k);
    } else if (tod < 0.7) {
      const k = (tod - 0.34) / 0.36;
      u.uTop.value.copy(day).lerp(dusk, k);
      u.uHorizon.value.copy(gold);
      u.uBottom.value.copy(gold).lerp(dawn, k);
      u.uSunIntensity.value = lerp(1.0, 0.8, k);
      u.uSunDir.value.set(0.4, lerp(0.4, 0.06, k), -0.9).normalize();
      u.uStars.value = 0;
    } else {
      const k = (tod - 0.7) / 0.3;
      u.uTop.value.copy(dusk).lerp(night, k);
      u.uHorizon.value.copy(gold).lerp(dusk, k);
      u.uBottom.value.copy(dawn).lerp(night, k);
      u.uSunIntensity.value = lerp(0.8, 0.05, k);
      u.uSunDir.value.set(0.3, lerp(0.06, -0.2, k), -0.92).normalize();
      u.uStars.value = smoothstep(0.1, 0.9, k);
    }
  }

  update({ ambientTime = 0 }) { this.mat.uniforms.uTime.value = ambientTime; }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

const CLOUD_VS = /* glsl */`
  attribute vec3  aOffset;
  attribute float aScale;
  attribute float aPhase;
  attribute float aLayer;
  attribute float aOpacity;
  uniform float uTime, uDrift, uSpread;
  varying vec2 vUv;
  varying float vOpacity;
  varying float vLayer;
  void main(){
    vUv = uv;
    vOpacity = aOpacity;
    vLayer = aLayer;
    vec3 c = aOffset;
    // deriva: las capas lejanas se mueven más despacio (parallax)
    c.x += mod(uTime * uDrift * (0.3 + aLayer * 0.7) + aPhase * uSpread, uSpread * 2.0) - uSpread;
    c.y += sin(uTime * 0.07 + aPhase * 6.2831) * 1.5;
    // billboard hacia la cámara
    vec3 right = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
    vec3 up    = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);
    vec3 p = c + (right * position.x + up * position.y) * aScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const CLOUD_FS = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uLit, uShadow;
  uniform float uGlobal;
  varying vec2 vUv;
  varying float vOpacity;
  varying float vLayer;
  void main(){
    vec4 t = texture2D(uMap, vUv);
    if (t.a < 0.004) discard;
    // las capas altas reciben más luz: da volumen al cúmulo
    vec3 c = mix(uShadow, uLit, pow(vLayer, 0.7));
    gl_FragColor = vec4(c, t.a * vOpacity * uGlobal);
  }
`;

export class CloudField {
  /**
   * @param o.layers  capas de profundidad (parallax)
   * @param o.perLayer parches por capa
   */
  constructor({ rng, layers = 5, perLayer = 26, spread = 420, height = [10, 120], palette = PALETTE.sky, scale = [60, 190] }) {
    const positions = [], uvs = [], idx = [], offs = [], scales = [], phases = [], layerAttr = [], opac = [];
    let q = 0;
    this.spread = spread;
    for (let l = 0; l < layers; l++) {
      const lk = l / Math.max(1, layers - 1);
      for (let i = 0; i < perLayer; i++) {
        const x = rng.range(-spread, spread);
        const y = lerp(height[0], height[1], Math.pow(rng(), 0.8));
        const z = lerp(-spread * 1.4, -40, lk) + rng.range(-40, 40);
        const s = rng.range(scale[0], scale[1]) * (0.5 + lk * 0.8);
        positions.push(-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0);
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        for (let v = 0; v < 4; v++) {
          offs.push(x, y, z);
          scales.push(s);
          phases.push(rng());
          layerAttr.push(lk);
          opac.push(rng.range(0.25, 0.75) * (0.5 + lk * 0.6));
        }
        const b = q * 4;
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        q++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('aOffset', new THREE.Float32BufferAttribute(offs, 3));
    g.setAttribute('aScale', new THREE.Float32BufferAttribute(scales, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    g.setAttribute('aLayer', new THREE.Float32BufferAttribute(layerAttr, 1));
    g.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opac, 1));
    g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: cloudSprite(256, 7) },
        uTime: { value: 0 },
        uDrift: { value: 1.6 },
        uSpread: { value: spread },
        uLit: { value: new THREE.Color(palette.cloudLit || '#E6EEF8') },
        uShadow: { value: new THREE.Color(palette.dusk || '#2A3B6B') },
        uGlobal: { value: 1 }
      },
      vertexShader: CLOUD_VS,
      fragmentShader: CLOUD_FS,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.stats = { patches: q, drawCalls: 1 };
  }
  update({ ambientTime = 0, drift = 1.6, opacity = 1, lit = null, shadow = null }) {
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uDrift.value = drift;
    this.mat.uniforms.uGlobal.value = opacity;
    if (lit) this.mat.uniforms.uLit.value.set(lit);
    if (shadow) this.mat.uniforms.uShadow.value.set(shadow);
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

/** Bandada en V. Movimiento analítico: determinista entre superficies. */
export class BirdFlock {
  constructor({ rng, count = 34, color = '#1A2230', scale = 1 }) {
    this.count = count;
    const positions = [], offs = [], phases = [], scales = [];
    // pájaro = 2 triángulos (alas), la animación es rotación de ala en el shader
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 2), side = i % 2 === 0 ? 1 : -1;
      const ox = side * row * 1.5 * scale, oz = row * 2.1 * scale;
      positions.push(
        0, 0, 0,  1.0 * scale, 0, -0.45 * scale,  0.2 * scale, 0, 0.5 * scale,
        0, 0, 0, -1.0 * scale, 0, -0.45 * scale, -0.2 * scale, 0, 0.5 * scale
      );
      for (let v = 0; v < 6; v++) { offs.push(ox, rng.range(-0.6, 0.6), oz); phases.push(rng()); scales.push(1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('aOffset', new THREE.Float32BufferAttribute(offs, 3));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 1 },
        uPath: { value: new THREE.Vector3(0, 40, -120) },
        uSpeed: { value: 1 }
      },
      vertexShader: `
        attribute vec3 aOffset; attribute float aPhase;
        uniform float uTime, uSpeed; uniform vec3 uPath;
        void main(){
          float t = uTime * uSpeed;
          vec3 c = uPath;
          c.x += mod(t * 7.0, 420.0) - 210.0;
          c.y += sin(t * 0.15) * 6.0;
          c.z += sin(t * 0.1) * 30.0;
          vec3 p = position;
          // aleteo: las alas suben y bajan, con desfase por individuo
          float flap = sin(t * 7.5 + aPhase * 6.2831);
          p.y += abs(p.x) * flap * 0.55;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(c + aOffset + p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity;
        void main(){ gl_FragColor = vec4(uColor, uOpacity); }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
  }
  update({ ambientTime = 0, opacity = 1, speed = 1, path = null }) {
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uOpacity.value = opacity;
    this.mat.uniforms.uSpeed.value = speed;
    if (path) this.mat.uniforms.uPath.value.set(...path);
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

/** Avión: silueta + luces de navegación + estela. Procedural; GLB opcional. */
export class Airplane {
  constructor({ palette = PALETTE.sky, scale = 1, model = null } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'airplane';
    if (model?.scene) {
      this.group.add(model.scene);
    } else {
      const dark = new THREE.MeshBasicMaterial({ color: 0x1b2334, transparent: true, opacity: 0.95 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5 * scale, 6 * scale, 4, 8), dark);
      body.rotation.z = Math.PI / 2;
      this.group.add(body);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale, 0.1 * scale, 9 * scale), dark);
      wing.position.x = -0.3 * scale;
      this.group.add(wing);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.08 * scale, 3.4 * scale), dark);
      tail.position.x = -3.4 * scale;
      this.group.add(tail);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.1 * scale, 1.6 * scale, 0.08 * scale), dark);
      fin.position.set(-3.5 * scale, 0.8 * scale, 0);
      this.group.add(fin);
      // luces de navegación: rojo babor, verde estribor, flash blanco en cola
      const mk = (hex, x, z) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: softSprite(64, 2), color: new THREE.Color(hex),
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        s.scale.setScalar(0.9 * scale);
        s.position.set(x, 0, z);
        this.group.add(s);
        return s;
      };
      this.navL = mk('#ff4444', -0.3 * scale, -4.5 * scale);
      this.navR = mk('#44ff88', -0.3 * scale, 4.5 * scale);
      this.beacon = mk('#ffffff', -3.6 * scale, 0);
    }
    // estela de condensación
    this.trail = new THREE.Mesh(
      new THREE.PlaneGeometry(90 * scale, 1.4 * scale),
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.25 }, uColor: { value: new THREE.Color('#E6EEF8') } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `
          uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
          void main(){
            float a = pow(vUv.x, 2.2) * (1.0 - abs(vUv.y - 0.5) * 2.0);
            gl_FragColor = vec4(uColor, a * uOpacity);
          }
        `,
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
      })
    );
    this.trail.position.x = -46 * scale;
    this.group.add(this.trail);
    this.visible = false;
    this.group.visible = false;
  }

  /** Paso analítico de izquierda a derecha, con leve ascenso. */
  update({ t = 0, ambientTime = 0, speed = 1, altitude = 46, opacity = 1, loop = 300 }) {
    const u = ((t * speed) % loop) / loop;
    this.group.position.set(lerp(-220, 220, u), altitude + Math.sin(t * 0.08) * 2.5, -150 + Math.sin(t * 0.05) * 30);
    this.group.rotation.y = -Math.PI / 2 + 0.06;
    this.group.rotation.z = Math.sin(t * 0.1) * 0.03;
    if (this.beacon) {
      // flash de baliza: 1 Hz, pulso corto, como un avión real
      const f = Math.pow(Math.max(0, Math.sin(ambientTime * Math.PI)), 12);
      this.beacon.material.opacity = f;
      this.navL.material.opacity = 0.85;
      this.navR.material.opacity = 0.85;
    }
    this.trail.material.uniforms.uOpacity.value = 0.22 * opacity;
    this.group.visible = opacity > 0.01;
  }
  dispose() {
    this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.group.parent?.remove(this.group);
  }
}

/** Lluvia de meteoritos para WORLD A. Analítica y periódica. */
export class MeteorShower {
  constructor({ rng, count = 40, color = '#FFE9B0', radius = 300 }) {
    this.count = count;
    this.arr = allocParticles(count * 2); // cabeza + estela corta por meteoro
    this._t0 = new Float32Array(count);
    this._dir = new Float32Array(count * 3);
    this._start = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      this._t0[i] = rng.range(0, 40);
      const [x, z] = rng.disk(radius);
      this._start[i * 3] = x;
      this._start[i * 3 + 1] = rng.range(120, 230);
      this._start[i * 3 + 2] = z;
      const d = new THREE.Vector3(rng.range(-1, 1), -1, rng.range(-1, 1)).normalize().multiplyScalar(rng.range(90, 180));
      this._dir[i * 3] = d.x; this._dir[i * 3 + 1] = d.y; this._dir[i * 3 + 2] = d.z;
      for (let k = 0; k < 2; k++) {
        const j = i * 2 + k;
        this.arr.aSize[j] = k === 0 ? rng.range(1.4, 3) : rng.range(0.6, 1.4);
        this.arr.aAlpha[j] = 0;
        this.arr.aPhase[j] = rng();
        setColorAt(this.arr.aColor, j, c);
      }
    }
    this.geo = buildParticleGeometry(count * 2, this.arr);
    this.mat = makeParticleMaterial({ map: softSprite(128, 2.2), size: 2.2, color: 0xffffff });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }
  update({ ambientTime = 0, rate = 1, intensity = 1, focus = 14 }) {
    const p = this.arr.position, a = this.arr.aAlpha;
    const period = 40 / Math.max(0.05, rate);
    for (let i = 0; i < this.count; i++) {
      const local = ((ambientTime - this._t0[i]) % period + period) % period;
      const life = 2.2;
      if (local > life) { a[i * 2] = 0; a[i * 2 + 1] = 0; continue; }
      const k = local / life;
      for (let s = 0; s < 2; s++) {
        const j = i * 2 + s;
        const back = s * 0.12;
        const kk = Math.max(0, k - back);
        p[j * 3]     = this._start[i * 3]     + this._dir[i * 3] * kk;
        p[j * 3 + 1] = this._start[i * 3 + 1] + this._dir[i * 3 + 1] * kk;
        p[j * 3 + 2] = this._start[i * 3 + 2] + this._dir[i * 3 + 2] * kk;
        a[j] = Math.sin(k * Math.PI) * intensity * (s === 0 ? 1 : 0.45);
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uFocus.value = focus;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.points.parent?.remove(this.points); }
}

/** Aurora: cortinas de luz que ondulan. */
export class Aurora {
  constructor({ rng, bands = 5, color1 = '#6AFFD8', color2 = '#B06BFF' }) {
    this.group = new THREE.Group();
    this.mats = [];
    for (let i = 0; i < bands; i++) {
      const geo = new THREE.PlaneGeometry(520, 150, 64, 8);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uC1: { value: new THREE.Color(color1) },
          uC2: { value: new THREE.Color(color2) },
          uOpacity: { value: rng.range(0.1, 0.24) },
          uPhase: { value: rng() * 10 },
          uSpeed: { value: rng.range(0.1, 0.26) }
        },
        vertexShader: `
          uniform float uTime, uPhase, uSpeed;
          varying vec2 vUv;
          void main(){
            vUv = uv;
            vec3 p = position;
            float t = uTime * uSpeed + uPhase;
            // ondulación de la cortina
            p.z += sin(p.x * 0.012 + t) * 26.0 + sin(p.x * 0.031 - t * 1.7) * 10.0;
            p.y += sin(p.x * 0.02 + t * 0.7) * 8.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uC1, uC2; uniform float uOpacity, uTime, uPhase;
          varying vec2 vUv;
          void main(){
            // rayas verticales que suben, típicas de la aurora
            float stripes = 0.55 + 0.45 * sin(vUv.x * 48.0 + uPhase * 3.0 + uTime * 0.4);
            float vert = pow(1.0 - vUv.y, 1.8) * smoothstep(0.0, 0.18, vUv.y);
            vec3 c = mix(uC1, uC2, vUv.y);
            gl_FragColor = vec4(c, vert * stripes * uOpacity);
          }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(rng.range(-80, 80), 150 + i * 22, -380 - i * 40);
      m.rotation.x = -0.12;
      this.group.add(m);
      this.mats.push(mat);
    }
  }
  update({ ambientTime = 0, intensity = 1 }) {
    for (const m of this.mats) m.uniforms.uTime.value = ambientTime;
    this.group.visible = intensity > 0.01;
    this.group.traverse((o) => { if (o.material?.uniforms) o.material.uniforms.uOpacity && (o.material.uniforms.uOpacity.value = o.material.uniforms.uOpacity.value); });
    this._intensity = intensity;
  }
  setIntensity(v) {
    this.mats.forEach((m, i) => { m.uniforms.uOpacity.value = (0.1 + i * 0.02) * v; });
  }
  dispose() {
    this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.group.parent?.remove(this.group);
  }
}

export default { SkyDome, CloudField, BirdFlock, Airplane, MeteorShower, Aurora };
