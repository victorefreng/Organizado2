/**
 * GESTOR DE ASSETS.
 *
 * Reglas:
 *  - Nunca bloquea el arranque: si un asset falta, se usa un placeholder funcional
 *    y se REGISTRA en `missing` para que el panel lo muestre y se sepa exactamente
 *    qué hay que reemplazar.
 *  - Las imágenes conservan su relación de aspecto: `aspect` se guarda al cargar y
 *    los marcos la respetan (encaje `cover`, nunca estiramiento).
 *  - Los modelos GLB/GLTF se cargan por el manifiesto; si no están, el mundo usa su
 *    versión procedural. Añadir un GLB no requiere tocar código de escena.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Manifiesto de modelos externos. `procedural: true` = hoy existe una versión
 * generada por código que funciona; el GLB la mejorará cuando llegue.
 */
export const MODEL_MANIFEST = {
  whale:    { url: '/assets/models/whale.glb',    procedural: true, scale: 1,    note: 'Ballena jorobada. Rig opcional; si trae animación "swim" se usa.' },
  dolphin:  { url: '/assets/models/dolphin.glb',  procedural: true, scale: 1,    note: 'Delfín.' },
  turtle:   { url: '/assets/models/turtle.glb',   procedural: true, scale: 1,    note: 'Tortuga marina.' },
  fish:     { url: '/assets/models/fish.glb',     procedural: true, scale: 1,    note: 'Pez tropical para instanciado (low-poly, <800 tris).' },
  jellyfish:{ url: '/assets/models/jellyfish.glb', procedural: true, scale: 1,   note: 'Medusa bioluminiscente.' },
  plane:    { url: '/assets/models/plane.glb',    procedural: true, scale: 1,    note: 'Avión comercial en silueta.' },
  ship:     { url: '/assets/models/ship.glb',     procedural: true, scale: 1,    note: 'Nave espacial, silueta contra nebulosa.' },
  bird:     { url: '/assets/models/bird.glb',     procedural: true, scale: 1,    note: 'Ave para bandadas instanciadas.' },
  butterfly:{ url: '/assets/models/butterfly.glb', procedural: true, scale: 1,   note: 'Mariposa con alas animables.' },
  tree:     { url: '/assets/models/tree.glb',     procedural: true, scale: 1,    note: 'Árbol grande del jardín/selva.' },
  fern:     { url: '/assets/models/fern.glb',     procedural: true, scale: 1,    note: 'Helecho para sotobosque instanciado.' },
  coral:    { url: '/assets/models/coral.glb',    procedural: true, scale: 1,    note: 'Formación de coral.' },
  planet:   { url: '/assets/models/planet.glb',   procedural: true, scale: 1,    note: 'Planeta con anillo (o esfera + anillo procedural).' }
};

export class AssetManager {
  constructor() {
    this.textures = new Map();
    this.models = new Map();
    this.missing = [];
    this.loaded = [];
    this.gltf = new GLTFLoader();
    this.texLoader = new THREE.TextureLoader();
    this._placeholders = new Map();
  }

  // ───────────────────────────── texturas ─────────────────────────────

  /** Carga una imagen preservando su relación de aspecto. Nunca rechaza. */
  async loadTexture(url, { srgb = true } = {}) {
    if (this.textures.has(url)) return this.textures.get(url);
    const entry = await new Promise((resolve) => {
      this.texLoader.load(
        url,
        (tex) => {
          if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          const w = tex.image?.width || 1, h = tex.image?.height || 1;
          resolve({ texture: tex, aspect: w / h, width: w, height: h, ok: true, url });
        },
        undefined,
        () => {
          this.missing.push({ type: 'texture', url });
          const ph = this.placeholderTexture(url);
          resolve({ texture: ph, aspect: 1.5, width: 768, height: 512, ok: false, url, placeholder: true });
        }
      );
    });
    this.textures.set(url, entry);
    if (entry.ok) this.loaded.push({ type: 'texture', url, size: `${entry.width}x${entry.height}` });
    return entry;
  }

  /** Placeholder dibujado en canvas: visible, etiquetado, nunca una foto inventada. */
  placeholderTexture(label = 'MISSING ASSET') {
    if (this._placeholders.has(label)) return this._placeholders.get(label);
    const c = document.createElement('canvas');
    c.width = 768; c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 768, 512);
    grad.addColorStop(0, '#15181f');
    grad.addColorStop(1, '#232834');
    g.fillStyle = grad; g.fillRect(0, 0, 768, 512);
    g.strokeStyle = 'rgba(255,217,160,0.18)'; g.lineWidth = 1;
    for (let x = 0; x < 768; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
    for (let y = 0; y < 512; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(768, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,217,160,0.5)'; g.lineWidth = 3;
    g.strokeRect(12, 12, 744, 488);
    g.fillStyle = '#FFD9A0';
    g.font = '300 34px Inter, Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillText('PLACEHOLDER', 384, 240);
    g.font = '300 18px Inter, Helvetica, Arial, sans-serif';
    g.fillStyle = 'rgba(255,246,224,0.6)';
    const short = String(label).split('/').pop().slice(0, 40);
    g.fillText(short, 384, 278);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._placeholders.set(label, tex);
    return tex;
  }

  // ───────────────────────────── modelos ─────────────────────────────

  /**
   * Intenta cargar un modelo del manifiesto. Devuelve null si no existe,
   * y el mundo usa su versión procedural. No lanza.
   */
  async loadModel(key) {
    if (this.models.has(key)) return this.models.get(key);
    const def = MODEL_MANIFEST[key];
    if (!def) return null;
    const result = await new Promise((resolve) => {
      this.gltf.load(
        def.url,
        (g) => resolve({ scene: g.scene, animations: g.animations, ok: true, def }),
        undefined,
        () => {
          this.missing.push({ type: 'model', key, url: def.url, note: def.note, hasProcedural: def.procedural });
          resolve(null);
        }
      );
    });
    this.models.set(key, result);
    if (result) this.loaded.push({ type: 'model', url: def.url });
    return result;
  }

  /** Precarga en paralelo sin bloquear si faltan. */
  async preload({ textures = [], models = [] } = {}) {
    await Promise.all([
      ...textures.map((u) => this.loadTexture(u)),
      ...models.map((k) => this.loadModel(k))
    ]);
    return { missing: this.missing, loaded: this.loaded };
  }

  /** Informe para el panel: qué falta y qué hay que producir. */
  get report() {
    const models = Object.entries(MODEL_MANIFEST).map(([k, d]) => ({
      key: k,
      url: d.url,
      present: !!this.models.get(k),
      procedural: d.procedural,
      note: d.note
    }));
    return { models, missing: this.missing, loaded: this.loaded.length };
  }

  dispose() {
    for (const e of this.textures.values()) e.texture?.dispose?.();
    this.textures.clear();
    for (const t of this._placeholders.values()) t.dispose?.();
    this._placeholders.clear();
  }
}

let shared = null;
export function getAssets() {
  if (!shared) shared = new AssetManager();
  return shared;
}

export default AssetManager;
