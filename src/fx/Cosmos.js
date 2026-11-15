/**
 * COSMOS: campo de estrellas, nebulosas, planetas, nave y viaje a alta velocidad.
 *
 * La nebulosa NO es una textura: son capas de parches de ruido con color por
 * profundidad, que es lo que hace que al atravesarla se sienta como neblina de
 * color y no como un fondo pintado (docs/01-direccion-creativa.md §2).
 */
import * as THREE from 'three';
import { softSprite, flareSprite, cloudSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { clamp01, lerp } from '../core/easing.js';
import { PALETTE } from '../config/palette.js';

export class StarField {
  /** @param o.warp 0 = estrellas quietas, 1 = estiradas por velocidad */
  constructor({ rng, count = 12000, radius = 900, palette = PALETTE.cosmos, sizeScale = 1 }) {
    this.count = count;
    this.radius = radius;
    this.arr = allocParticles(count);
    const cols = [
      new THREE.Color(palette.stars || '#FFE9B0'),
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#BFD9FF'),
      new THREE.Color('#FFD2A0')
    ];
    for (let i = 0; i < count; i++) {
      // distribución en esfera, con más densidad hacia el plano galáctico
      const u = rng() * 2 - 1;
      const a = rng() * Math.PI * 2;
      const r = radius * Math.pow(rng(), 0.35);
      const flat = 0.42;
      this.arr.position[i * 3] = Math.sqrt(1 - u * u) * Math.cos(a) * r;
      this.arr.position[i * 3 + 1] = u * r * flat;
      this.arr.position[i * 3 + 2] = Math.sqrt(1 - u * u) * Math.sin(a) * r;
      // ley de luminosidad: muchas débiles, pocas brillantes
      const mag = Math.pow(rng(), 3.2);
      this.arr.aSize[i] = 0.3 + mag * 4.2;
      this.arr.aAlpha[i] = 0.25 + mag * 0.75;
      this.arr.aPhase[i] = rng();
      setColorAt(this.arr.aColor, i, cols[Math.floor(rng() * (rng() < 0.75 ? 2 : 4))]);
    }
    this.geo = buildParticleGeometry(count, this.arr);
    this.mat = makeParticleMaterial({
      map: softSprite(128, 2.6), size: 1.6 * sizeScale, color: 0xffffff
    });
    // las estrellas no deben desenfocarse: están en el infinito
    this.mat.uniforms.uBokeh.value = 0.08;
    this.mat.uniforms.uFocusRange.value = 9000;
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = -1;
  }
  update({ ambientTime = 0, intensity = 1 }) {
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uOpacity.value = intensity;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.points.parent?.remove(this.points); }
}

/** Nebulosa por capas. Lo que da el "dentro de" en vez del "delante de". */
export class Nebula {
  constructor({ rng, patches = 110, radius = 460, palette = PALETTE.cosmos }) {
    const positions = [], uvs = [], idx = [], offs = [], scales = [], phases = [], tints = [], opac = [];
    const cMag = new THREE.Color(palette.nebulaMagenta || '#B06BFF');
    const cCyan = new THREE.Color(palette.nebulaCyan || '#5FD8FF');
    const cCold = new THREE.Color(palette.nebulaCold || '#2B1B4D');
    const cDust = new THREE.Color(palette.dust || '#1A0F2E');
    let q = 0;
    for (let i = 0; i < patches; i++) {
      // estructura filamentosa: dos brazos + halo
      const arm = rng() < 0.6;
      let x, y, z;
      if (arm) {
        const t = rng();
        const a = t * Math.PI * 2.4 + (rng() < 0.5 ? 0 : Math.PI);
        const rr = 60 + t * radius * 0.85;
        x = Math.cos(a) * rr + rng.gauss(0, 42);
        y = rng.gauss(0, 54);
        z = Math.sin(a) * rr + rng.gauss(0, 42);
      } else {
        const [dx, dz] = rng.disk(radius);
        x = dx; y = rng.gauss(0, 110); z = dz;
      }
      const s = rng.range(90, 330);
      const which = rng();
      const tint = which < 0.38 ? cMag : which < 0.68 ? cCyan : which < 0.88 ? cCold : cDust;
      const op = (which > 0.88 ? rng.range(0.16, 0.3) : rng.range(0.05, 0.17));
      positions.push(-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let v = 0; v < 4; v++) {
        offs.push(x, y, z);
        scales.push(s);
        phases.push(rng());
        tints.push(tint.r, tint.g, tint.b);
        opac.push(op);
      }
      const b = q * 4;
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      q++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('aOffset', new THREE.Float32BufferAttribute(offs, 3));
    g.setAttribute('aScale', new THREE.Float32BufferAttribute(scales, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(tints, 3));
    g.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opac, 1));
    g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: cloudSprite(256, 23) },
        uTime: { value: 0 },
        uGlobal: { value: 1 }
      },
      vertexShader: `
        attribute vec3 aOffset; attribute float aScale, aPhase, aOpacity; attribute vec3 aTint;
        uniform float uTime;
        varying vec2 vUv; varying vec3 vTint; varying float vOp;
        void main(){
          vUv = uv; vTint = aTint; vOp = aOpacity;
          vec3 c = aOffset;
          c += vec3(sin(uTime*0.02+aPhase*6.28), cos(uTime*0.016+aPhase*4.1), sin(uTime*0.014+aPhase*5.2)) * 9.0;
          vec3 right = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
          vec3 up    = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);
          vec3 p = c + (right * position.x + up * position.y) * aScale;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uGlobal;
        varying vec2 vUv; varying vec3 vTint; varying float vOp;
        void main(){
          vec4 t = texture2D(uMap, vUv);
          if (t.a < 0.003) discard;
          gl_FragColor = vec4(vTint, t.a * vOp * uGlobal);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
    this.stats = { patches: q, drawCalls: 1 };
  }
  update({ ambientTime = 0, intensity = 1 }) {
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uGlobal.value = intensity;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

/** Planeta con anillo. Procedural; acepta GLB del manifiesto. */
export class Planet {
  constructor({ rng, radius = 26, ring = true, palette = PALETTE.cosmos, seed = 1, model = null }) {
    this.group = new THREE.Group();
    this.group.name = 'planet';
    this.radius = radius;
    if (model?.scene) { this.group.add(model.scene); this.usingModel = true; return; }

    const geo = new THREE.SphereGeometry(radius, 48, 32);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: seed },
        uC1: { value: new THREE.Color(palette.nebulaCold || '#2B1B4D') },
        uC2: { value: new THREE.Color(palette.nebulaMagenta || '#B06BFF') },
        uC3: { value: new THREE.Color(palette.stars || '#FFE9B0') },
        uSunDir: { value: new THREE.Vector3(1, 0.4, 0.6).normalize() },
        uOpacity: { value: 1 }
      },
      vertexShader: `
        varying vec3 vN; varying vec3 vPos; varying vec3 vView;
        void main(){
          vN = normalize(normalMatrix * normal);
          vPos = position;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime, uSeed, uOpacity;
        uniform vec3 uC1, uC2, uC3, uSunDir;
        varying vec3 vN; varying vec3 vPos; varying vec3 vView;

        float hash(vec3 p){ return fract(sin(dot(p + uSeed, vec3(127.1,311.7,74.7)))*43758.5453); }
        float noise(vec3 p){
          vec3 i = floor(p), f = fract(p);
          f = f*f*(3.0-2.0*f);
          float n = mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                        mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
          return n;
        }
        float fbm(vec3 p){
          float s=0.0, a=0.5;
          for(int i=0;i<5;i++){ s += noise(p)*a; p*=2.07; a*=0.5; }
          return s;
        }

        void main(){
          vec3 n = normalize(vN);
          // bandas atmosféricas deformadas por turbulencia
          float band = sin(vPos.y * 0.26 + fbm(vPos * 0.06 + uTime * 0.01) * 3.4);
          float turb = fbm(vPos * 0.09 + vec3(uTime * 0.012, 0.0, 0.0));
          vec3 c = mix(uC1, uC2, smoothstep(-0.4, 0.6, band));
          c = mix(c, uC3, pow(turb, 2.6) * 0.5);
          // terminador: iluminación de un solo sol
          float lit = clamp(dot(n, normalize(uSunDir)), 0.0, 1.0);
          c *= 0.12 + pow(lit, 0.8) * 1.15;
          // atmósfera en el borde
          float fres = pow(1.0 - clamp(dot(n, normalize(vView)), 0.0, 1.0), 3.0);
          c += uC2 * fres * 0.7 * (0.3 + lit);
          gl_FragColor = vec4(c, uOpacity);
        }
      `,
      transparent: true
    });
    this.body = new THREE.Mesh(geo, this.mat);
    this.group.add(this.body);

    if (ring) {
      const rg = new THREE.RingGeometry(radius * 1.45, radius * 2.5, 128, 1);
      this.ringMat = new THREE.ShaderMaterial({
        uniforms: {
          uC: { value: new THREE.Color(palette.stars || '#FFE9B0') },
          uOpacity: { value: 0.55 },
          uSeed: { value: seed }
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `
          uniform vec3 uC; uniform float uOpacity, uSeed; varying vec2 vUv;
          float h(float x){ return fract(sin((x+uSeed)*91.7)*43758.5453); }
          void main(){
            // huecos tipo división de Cassini
            float r = vUv.y;
            float bands = 0.4 + 0.6 * h(floor(r * 42.0));
            float gap = smoothstep(0.02,0.06,abs(fract(r*7.0)-0.5));
            float a = bands * gap * (1.0 - smoothstep(0.85,1.0,r)) * smoothstep(0.0,0.08,r);
            gl_FragColor = vec4(uC * (0.6 + bands*0.5), a * uOpacity);
          }
        `,
        transparent: true, depthWrite: false, side: THREE.DoubleSide
      });
      this.ring = new THREE.Mesh(rg, this.ringMat);
      this.ring.rotation.x = Math.PI / 2 - 0.32;
      this.group.add(this.ring);
    }
  }
  update({ ambientTime = 0, opacity = 1 }) {
    if (this.mat) {
      this.mat.uniforms.uTime.value = ambientTime;
      this.mat.uniforms.uOpacity.value = opacity;
    }
    this.group.rotation.y = ambientTime * 0.013;
    if (this.ringMat) this.ringMat.uniforms.uOpacity.value = 0.55 * opacity;
  }
  dispose() {
    this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.group.parent?.remove(this.group);
  }
}

/** Nave espacial en silueta. Escala del cosmos: se lee por contraste, no por detalle. */
export class Starship {
  constructor({ scale = 1, model = null, palette = PALETTE.cosmos } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'starship';
    if (model?.scene) { this.group.add(model.scene); this.usingModel = true; }
    else {
      const dark = new THREE.MeshBasicMaterial({ color: 0x0a0a14 });
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.1 * scale, 9 * scale, 4, 10), dark);
      hull.rotation.z = Math.PI / 2;
      this.group.add(hull);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2 * scale, 0.22 * scale, 7.4 * scale), dark);
      this.group.add(wing);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 1.5 * scale, 1.4 * scale), dark);
      tower.position.set(-1.5 * scale, 1.0 * scale, 0);
      this.group.add(tower);
      // motores
      for (const s of [-1, 1]) {
        const e = new THREE.Sprite(new THREE.SpriteMaterial({
          map: softSprite(128, 1.8), color: new THREE.Color(palette.nebulaCyan || '#5FD8FF'),
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        e.scale.setScalar(3.2 * scale);
        e.position.set(-5.4 * scale, 0, s * 1.6 * scale);
        this.group.add(e);
      }
      // ventanas
      for (let i = 0; i < 9; i++) {
        const w = new THREE.Sprite(new THREE.SpriteMaterial({
          map: softSprite(32, 2), color: new THREE.Color(palette.stars || '#FFE9B0'),
          transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        w.scale.setScalar(0.3 * scale);
        w.position.set((i - 4) * 0.9 * scale, 0.55 * scale, 1.15 * scale);
        this.group.add(w);
      }
    }
  }
  /** Paso lento y lejano: lo que da la escala del cosmos. */
  update({ t = 0, opacity = 1, distance = 240, speed = 1 }) {
    const u = ((t * speed * 0.02) % 1);
    this.group.position.set(lerp(-420, 420, u), 40 + Math.sin(t * 0.03) * 14, -distance);
    this.group.rotation.y = -Math.PI / 2;
    this.group.rotation.z = 0.1;
    this.group.visible = opacity > 0.02;
    this.group.traverse((o) => { if (o.material && 'opacity' in o.material) o.material.opacity = Math.min(1, opacity); });
  }
  dispose() {
    this.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    this.group.parent?.remove(this.group);
  }
}

/** Viaje a velocidad extrema: estrellas estiradas. Portal intergaláctico. */
export class WarpStreaks {
  constructor({ rng, count = 1800, radius = 90, length = 520, color = '#BFD9FF' }) {
    this.count = count;
    const pos = [], idx = [], along = [], seeds = [];
    for (let i = 0; i < count; i++) {
      const [x, y] = rng.disk(radius);
      const z0 = rng.range(-length, length);
      pos.push(x, y, z0, x, y, z0 + rng.range(6, 34));
      along.push(0, 1);
      const s = rng();
      seeds.push(s, s);
      idx.push(i * 2, i * 2 + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    g.setIndex(idx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0 },
        uLength: { value: length }
      },
      vertexShader: `
        attribute float aAlong, aSeed;
        uniform float uTime, uSpeed, uLength;
        varying float vA; varying float vS;
        void main(){
          vA = aAlong; vS = aSeed;
          vec3 p = position;
          // avance + estiramiento proporcional a la velocidad
          p.z = mod(p.z + uTime * uSpeed * (0.6 + aSeed * 0.8) + uLength, uLength * 2.0) - uLength;
          p.z += aAlong * uSpeed * 0.9;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity;
        varying float vA; varying float vS;
        void main(){
          float a = (1.0 - vA) * uOpacity * (0.4 + vS * 0.6);
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
  }
  update({ ambientTime = 0, speed = 0, opacity = 0 }) {
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uSpeed.value = speed;
    this.mat.uniforms.uOpacity.value = opacity;
    this.lines.visible = opacity > 0.01;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.lines.parent?.remove(this.lines); }
}

export default { StarField, Nebula, Planet, Starship, WarpStreaks };
