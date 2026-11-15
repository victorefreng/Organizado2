/**
 * AGUA: superficie del lago y techo del océano.
 *
 * El lago cumple un papel narrativo concreto (escena 005): al tocarlo, su
 * superficie deja de reflejar el cielo y empieza a reflejar galaxias. Eso está en
 * un uniform (`uGalaxy`), así que la transición es continua y dirigible desde el
 * timeline, no un cambio de material.
 */
import * as THREE from 'three';
import { softSprite } from './common.js';
import { clamp01 } from '../core/easing.js';
import { PALETTE } from '../config/palette.js';

const WATER_VS = /* glsl */`
  uniform float uTime, uAmp, uChop;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vN;

  void main(){
    vUv = uv;
    vec3 p = position;
    // suma de olas cruzadas (Gerstner simplificado)
    float w = 0.0;
    w += sin(p.x * 0.16 + uTime * 0.9) * 0.5;
    w += sin(p.y * 0.21 - uTime * 1.1) * 0.4;
    w += sin((p.x + p.y) * 0.33 + uTime * 1.7) * 0.22 * uChop;
    w += sin((p.x - p.y) * 0.47 - uTime * 2.3) * 0.12 * uChop;
    p.z += w * uAmp;

    // normal analítica aproximada
    float dx = cos(p.x * 0.16 + uTime * 0.9) * 0.16 * 0.5
             + cos((p.x + p.y) * 0.33 + uTime * 1.7) * 0.33 * 0.22 * uChop;
    float dy = cos(p.y * 0.21 - uTime * 1.1) * 0.21 * 0.4
             + cos((p.x + p.y) * 0.33 + uTime * 1.7) * 0.33 * 0.22 * uChop;
    vN = normalize(vec3(-dx * uAmp, -dy * uAmp, 1.0));
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WATER_FS = /* glsl */`
  uniform vec3 uShallow, uDeep, uSky, uGalaxyA, uGalaxyB;
  uniform float uTime, uGalaxy, uOpacity, uRipple, uRippleT;
  uniform vec2 uRippleCenter;
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vN;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
  }
  float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=noise(p)*a; p*=2.07; a*=0.5;} return s; }

  void main(){
    vec3 n = normalize(vN);
    float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);

    vec3 base = mix(uDeep, uShallow, clamp(n.z, 0.0, 1.0));

    // reflejo del cielo
    vec3 refl = uSky * (0.4 + fres * 0.8);

    // reflejo de galaxias: aparece cuando uGalaxy sube
    vec2 gp = vPos.xy * 0.035 + vec2(uTime * 0.01, -uTime * 0.008);
    float neb = fbm(gp * 2.0);
    float arms = sin(length(gp) * 7.0 - atan(gp.y, gp.x) * 2.4 + uTime * 0.05);
    vec3 gal = mix(uGalaxyA, uGalaxyB, clamp(neb * 1.6, 0.0, 1.0));
    gal *= 0.35 + pow(clamp(arms, 0.0, 1.0), 2.2) * 1.5;
    // estrellas puntuales en el reflejo
    float st = step(0.9965, hash(floor(vPos.xy * 7.0)));
    gal += vec3(1.0, 0.95, 0.85) * st * 1.4;

    vec3 c = base + mix(refl, gal, clamp(uGalaxy, 0.0, 1.0));

    // onda expansiva en el punto de contacto
    if (uRipple > 0.001) {
      float d = length(vPos.xy - uRippleCenter);
      float ring = sin(d * 2.4 - uRippleT * 7.0) * exp(-d * 0.1) * exp(-uRippleT * 0.7);
      c += vec3(0.6, 0.85, 1.0) * max(0.0, ring) * uRipple * 1.6;
    }

    gl_FragColor = vec4(c, uOpacity);
  }
`;

export class WaterSurface {
  constructor({ size = 240, segments = 180, palette = PALETTE.ocean, amp = 0.5, chop = 1 } = {}) {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: amp },
        uChop: { value: chop },
        uShallow: { value: new THREE.Color(palette.surface || '#0A6E8C') },
        uDeep: { value: new THREE.Color(palette.abyss || '#01121C') },
        uSky: { value: new THREE.Color('#2A3B6B') },
        uGalaxyA: { value: new THREE.Color(PALETTE.cosmos.nebulaCold) },
        uGalaxyB: { value: new THREE.Color(PALETTE.cosmos.nebulaMagenta) },
        uGalaxy: { value: 0 },
        uOpacity: { value: 1 },
        uRipple: { value: 0 },
        uRippleT: { value: 0 },
        uRippleCenter: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: WATER_VS,
      fragmentShader: WATER_FS,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.name = 'water-surface';
    this._rippleT = 0;
    this._rippleActive = false;
  }

  /** Contacto de la mariposa / del dedo. Dispara la onda. */
  ripple(x, z) {
    this.mat.uniforms.uRippleCenter.value.set(x, -z);
    this._rippleT = 0;
    this._rippleActive = true;
  }

  update({ ambientTime = 0, dt = 0.016, galaxy = 0, opacity = 1, amp = null, chop = null }) {
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uGalaxy.value = clamp01(galaxy);
    this.mat.uniforms.uOpacity.value = opacity;
    if (amp !== null) this.mat.uniforms.uAmp.value = amp;
    if (chop !== null) this.mat.uniforms.uChop.value = chop;
    if (this._rippleActive) {
      this._rippleT += dt;
      this.mat.uniforms.uRippleT.value = this._rippleT;
      this.mat.uniforms.uRipple.value = Math.max(0, 1 - this._rippleT / 4);
      if (this._rippleT > 4) { this._rippleActive = false; this.mat.uniforms.uRipple.value = 0; }
    }
  }

  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

/** Cáusticas proyectadas en el fondo: el detalle que vende "estar bajo el agua". */
export class Caustics {
  constructor({ size = 160, palette = PALETTE.ocean }) {
    const geo = new THREE.PlaneGeometry(size, size, 1, 1);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(palette.caustic || '#7FE3FF') },
        uOpacity: { value: 0.25 }
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `
        uniform float uTime, uOpacity; uniform vec3 uColor; varying vec2 vUv;
        // cáusticas por interferencia de ondas: barato y convincente
        float caustic(vec2 p, float t){
          float v = 0.0;
          for (int i = 0; i < 4; i++) {
            float fi = float(i);
            vec2 q = p * (3.0 + fi * 2.1) + vec2(sin(t * 0.3 + fi), cos(t * 0.26 - fi));
            v += abs(sin(q.x + sin(q.y + t * 0.5)));
          }
          return pow(1.0 - v / 4.0, 3.5);
        }
        void main(){
          float c = caustic(vUv * 6.0, uTime);
          float vig = 1.0 - smoothstep(0.3, 0.72, length(vUv - 0.5));
          gl_FragColor = vec4(uColor, c * uOpacity * vig);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
  }
  update({ ambientTime = 0, intensity = 0.25 }) {
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uOpacity.value = intensity;
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.mesh.parent?.remove(this.mesh); }
}

export default WaterSurface;
