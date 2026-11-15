/**
 * MARIPOSA LUMINOSA — hereda el ámbar de la estrella y guía la escena 005.
 * Trayectoria analítica por spline: determinista en las tres superficies.
 */
import * as THREE from 'three';
import { softSprite, flareSprite } from './common.js';
import { clamp01, ease } from '../core/easing.js';
import { STARLIGHT } from '../config/palette.js';

const WING_VS = /* glsl */`
  attribute float aSide;    // -1 izquierda, +1 derecha
  attribute float aSpan;    // 0 en el cuerpo, 1 en la punta del ala
  uniform float uTime, uFlap;
  varying float vSpan;
  void main(){
    vSpan = aSpan;
    vec3 p = position;
    // aleteo: la punta sube más que la base, con ligero retardo (flexión del ala)
    float a = sin(uTime * uFlap - aSpan * 0.9) * 1.15;
    float ca = cos(a), sa = sin(a);
    float x = p.x, y = p.y;
    p.x = x * ca - y * sa * aSide * 0.0 + x * 0.0;
    p.y = y * ca + abs(x) * sa * 0.9;
    p.z += abs(x) * (1.0 - ca) * 0.35;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const WING_FS = /* glsl */`
  uniform vec3 uInner, uOuter;
  uniform float uOpacity;
  varying float vSpan;
  void main(){
    vec3 c = mix(uInner, uOuter, pow(vSpan, 0.8));
    float a = (1.0 - pow(vSpan, 2.6) * 0.55) * uOpacity;
    gl_FragColor = vec4(c, a);
  }
`;

export class Butterfly {
  constructor({ path = null, scale = 1, color = STARLIGHT.amber, rng = Math.random } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'butterfly';
    this.scale = scale;

    // alas: 4 triángulos por lado, con atributo de envergadura
    const pos = [], side = [], span = [], idx = [];
    let v = 0;
    const wing = (s) => {
      // ala delantera y trasera
      const pts = [
        [0, 0, 0], [s * 1.0, 0.75, 0], [s * 1.15, 0.05, 0],   // delantera
        [0, 0, 0], [s * 1.15, 0.05, 0], [s * 0.78, -0.72, 0]  // trasera
      ];
      const spans = [0, 1, 1, 0, 1, 0.85];
      for (let i = 0; i < pts.length; i++) {
        pos.push(pts[i][0] * scale, pts[i][1] * scale, pts[i][2] * scale);
        side.push(s);
        span.push(spans[i]);
        idx.push(v++);
      }
    };
    wing(-1); wing(1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    g.setAttribute('aSpan', new THREE.Float32BufferAttribute(span, 1));
    g.setIndex(idx);
    this.wingMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlap: { value: 11 },
        uInner: { value: new THREE.Color(STARLIGHT.core) },
        uOuter: { value: new THREE.Color(color) },
        uOpacity: { value: 1 }
      },
      vertexShader: WING_VS,
      fragmentShader: WING_FS,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.wings = new THREE.Mesh(g, this.wingMat);
    this.group.add(this.wings);

    // núcleo luminoso: es la misma energía de la estrella
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareSprite(128), color: new THREE.Color(color),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.core.scale.setScalar(0.9 * scale);
    this.group.add(this.core);

    this.light = new THREE.PointLight(new THREE.Color(color), 0, 9, 2);
    this.group.add(this.light);

    // trayectoria por defecto: de la flor al lago
    this.curve = new THREE.CatmullRomCurve3(path || [
      new THREE.Vector3(0.4, 1.4, 2.0),
      new THREE.Vector3(1.6, 2.4, 0.5),
      new THREE.Vector3(-0.8, 3.1, -2.5),
      new THREE.Vector3(1.2, 2.6, -6.0),
      new THREE.Vector3(-0.4, 2.0, -10.0),
      new THREE.Vector3(0.6, 1.2, -14.0),
      new THREE.Vector3(0, 0.35, -16.5)
    ], false, 'catmullrom', 0.5);

    this._prev = new THREE.Vector3();
    this.group.visible = false;
  }

  /** @param p 0..1 recorrido de la trayectoria */
  update({ p = 0, ambientTime = 0, opacity = 1, dt = 0.016 } = {}) {
    const k = clamp01(p);
    const pos = this.curve.getPointAt(k);
    // vuelo errático superpuesto a la trayectoria: nunca va en línea recta
    pos.x += Math.sin(ambientTime * 2.3) * 0.22 + Math.sin(ambientTime * 5.1) * 0.07;
    pos.y += Math.sin(ambientTime * 3.1) * 0.18 + Math.sin(ambientTime * 7.3) * 0.05;
    pos.z += Math.cos(ambientTime * 2.7) * 0.15;

    this.group.position.copy(pos);
    const dir = pos.clone().sub(this._prev);
    if (dir.lengthSq() > 1e-6) {
      this.group.lookAt(pos.clone().add(dir.normalize()));
      this.group.rotateX(-Math.PI / 2 + 0.3);
    }
    this._prev.copy(pos);

    this.wingMat.uniforms.uTime.value = ambientTime;
    this.wingMat.uniforms.uOpacity.value = opacity;
    this.core.material.opacity = opacity;
    this.core.scale.setScalar((0.8 + Math.sin(ambientTime * 4) * 0.08) * this.scale);
    this.light.intensity = opacity * 1.6;
    this.group.visible = opacity > 0.01;
    return pos;
  }

  get position() { return this.group.position; }

  dispose() {
    this.wings.geometry.dispose(); this.wingMat.dispose();
    this.core.material.dispose();
    this.group.parent?.remove(this.group);
  }
}

export default Butterfly;
