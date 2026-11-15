/**
 * REVELACIÓN FINAL: la estrella estalla y sus partículas forman el título.
 *
 * El texto se muestrea de un canvas y cada píxel con tinta se convierte en una
 * partícula con destino propio. Las partículas vienen de una explosión esférica,
 * así que la lectura es "la estrella se convirtió en el nombre", no "apareció un
 * texto". Al terminar, las mismas partículas se dispersan y se convierten en el
 * campo de estrellas del mundo explorable (sin corte a negro).
 */
import * as THREE from 'three';
import { softSprite, makeParticleMaterial, allocParticles, buildParticleGeometry, setColorAt } from './common.js';
import { clamp01, ease, lerp } from '../core/easing.js';
import { STARLIGHT, TYPE } from '../config/palette.js';

/** Muestrea un texto y devuelve posiciones normalizadas de los píxeles con tinta. */
function sampleText(text, {
  fontSize = 150,
  weight = 200,
  tracking = 0.42,
  step = 3,
  canvasW = 2048,
  canvasH = 420
} = {}) {
  const c = document.createElement('canvas');
  c.width = canvasW; c.height = canvasH;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, canvasW, canvasH);
  g.fillStyle = '#fff';
  g.font = `${weight} ${fontSize}px ${TYPE.family}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // tracking manual: letra a letra
  const chars = [...text];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const extra = fontSize * tracking;
  const total = widths.reduce((a, b) => a + b, 0) + extra * (chars.length - 1);
  let x = canvasW / 2 - total / 2;
  for (let i = 0; i < chars.length; i++) {
    g.textAlign = 'left';
    g.fillText(chars[i], x, canvasH / 2);
    x += widths[i] + extra;
  }
  const data = g.getImageData(0, 0, canvasW, canvasH).data;
  const pts = [];
  for (let y = 0; y < canvasH; y += step) {
    for (let xx = 0; xx < canvasW; xx += step) {
      if (data[(y * canvasW + xx) * 4] > 128) {
        pts.push([(xx / canvasW - 0.5), -(y / canvasH - 0.5) * (canvasH / canvasW)]);
      }
    }
  }
  return { points: pts, aspect: canvasW / canvasH };
}

export class TitleReveal {
  constructor({
    text = 'UNIVERSO 1/1',
    message = 'Este universo existe solo para ti.',
    rng,
    width = 26,
    step = 3,
    color = STARLIGHT.amber,
    coreColor = STARLIGHT.core
  } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'title-reveal';

    const { points } = sampleText(text, { step, fontSize: 150, weight: TYPE.titleWeight, tracking: TYPE.titleTracking });
    const n = points.length;
    this.count = n;

    this.arr = allocParticles(n);
    this._from = new Float32Array(n * 3);   // origen: explosión esférica
    this._to = new Float32Array(n * 3);     // destino: el texto
    this._away = new Float32Array(n * 3);   // dispersión final hacia el campo de estrellas
    this._delay = new Float32Array(n);

    const cA = new THREE.Color(color), cC = new THREE.Color(coreColor);
    for (let i = 0; i < n; i++) {
      const [nx, ny] = points[i];
      this._to[i * 3] = nx * width;
      this._to[i * 3 + 1] = ny * width;
      this._to[i * 3 + 2] = (rng() - 0.5) * 0.5;

      // origen: cáscara esférica, como la explosión de la estrella
      const u = rng() * 2 - 1, a = rng() * Math.PI * 2;
      const r = 2.5 + rng() * 5;
      this._from[i * 3] = Math.sqrt(1 - u * u) * Math.cos(a) * r;
      this._from[i * 3 + 1] = u * r;
      this._from[i * 3 + 2] = Math.sqrt(1 - u * u) * Math.sin(a) * r;

      // destino final: lejos, para convertirse en estrellas
      const u2 = rng() * 2 - 1, a2 = rng() * Math.PI * 2;
      const r2 = 180 + rng() * 420;
      this._away[i * 3] = Math.sqrt(1 - u2 * u2) * Math.cos(a2) * r2;
      this._away[i * 3 + 1] = u2 * r2 * 0.5;
      this._away[i * 3 + 2] = Math.sqrt(1 - u2 * u2) * Math.sin(a2) * r2;

      // retardo: el nombre se escribe de izquierda a derecha
      this._delay[i] = clamp01((nx + 0.5)) * 0.42 + rng() * 0.1;

      this.arr.position[i * 3] = this._from[i * 3];
      this.arr.position[i * 3 + 1] = this._from[i * 3 + 1];
      this.arr.position[i * 3 + 2] = this._from[i * 3 + 2];
      this.arr.aSize[i] = 0.28 + rng() * 0.5;
      this.arr.aAlpha[i] = 0;
      this.arr.aPhase[i] = rng();
      setColorAt(this.arr.aColor, i, rng() < 0.22 ? cC : cA);
    }

    this.geo = buildParticleGeometry(n, this.arr);
    // Partículas finas: el título debe leerse como puntos de luz con tracking
    // amplio, no como letras de burbuja. El bloom hace el resto.
    this.mat = makeParticleMaterial({ map: softSprite(128, 3.2), size: 0.62, color: 0xffffff });
    this.mat.uniforms.uBokeh.value = 0.12;
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    // mensaje: plano con textura de canvas (tipografía nítida, elegante, editable)
    this.message = message;
    this._buildMessage(message, width);

    this.group.visible = false;
  }

  _buildMessage(text, width) {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 220;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(255,246,224,0.92)';
    g.font = `${TYPE.bodyWeight} 62px ${TYPE.family}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // tracking amplio también en el mensaje
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width);
    const extra = 62 * 0.12;
    const total = widths.reduce((a, b) => a + b, 0) + extra * (chars.length - 1);
    let x = c.width / 2 - total / 2;
    g.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      g.fillText(chars[i], x, c.height / 2);
      x += widths[i] + extra;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (this.msgMesh) {
      this.msgMesh.material.map?.dispose();
      this.msgMesh.material.map = tex;
      this.msgMesh.material.needsUpdate = true;
      return;
    }
    const h = width * (220 / 2048);
    this.msgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.msgMesh.position.y = -width * 0.115;
    this.group.add(this.msgMesh);
  }

  /** Cambiar el mensaje en caliente desde el panel. */
  setMessage(text, width = 26) {
    this.message = text;
    this._buildMessage(text, width);
  }

  /**
   * @param p  0 → nada. 0..0.55 las partículas convergen al texto.
   *           0.55..0.8 el mensaje aparece. 0.8..1 todo se dispersa en estrellas.
   */
  update({ p = 0, ambientTime = 0, focus = 24 } = {}) {
    const k = clamp01(p);
    this.group.visible = k > 0.001;
    if (k <= 0.001) return;

    const pos = this.arr.position, alp = this.arr.aAlpha;
    const gather = clamp01(k / 0.5);
    const scatter = clamp01((k - 0.78) / 0.22);

    for (let i = 0; i < this.count; i++) {
      const d = this._delay[i];
      const g = ease('easeOutQuart', clamp01((gather - d) / (1 - d + 0.001)));
      let x = lerp(this._from[i * 3], this._to[i * 3], g);
      let y = lerp(this._from[i * 3 + 1], this._to[i * 3 + 1], g);
      let z = lerp(this._from[i * 3 + 2], this._to[i * 3 + 2], g);

      // flotación mínima una vez formado: el título respira
      const ph = this.arr.aPhase[i] * 6.2831;
      x += Math.sin(ambientTime * 0.7 + ph) * 0.06 * g;
      y += Math.sin(ambientTime * 0.9 + ph * 1.4) * 0.06 * g;

      if (scatter > 0) {
        const s = ease('easeInCubic', scatter);
        x = lerp(x, this._away[i * 3], s);
        y = lerp(y, this._away[i * 3 + 1], s);
        z = lerp(z, this._away[i * 3 + 2], s);
      }

      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      alp[i] = g * (0.55 + 0.3 * Math.sin(ambientTime * 1.6 + ph));
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.mat.uniforms.uTime.value = ambientTime;
    this.mat.uniforms.uFocus.value = focus;

    if (this.msgMesh) {
      const mk = clamp01((k - 0.52) / 0.2) * (1 - scatter);
      this.msgMesh.material.opacity = ease('easeOutCubic', mk) * 0.95;
    }
  }

  dispose() {
    this.geo.dispose(); this.mat.dispose();
    this.msgMesh?.geometry.dispose();
    this.msgMesh?.material.map?.dispose();
    this.msgMesh?.material.dispose();
    this.group.parent?.remove(this.group);
  }
}

export default TitleReveal;
