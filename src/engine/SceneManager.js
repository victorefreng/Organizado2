/**
 * SCENE MANAGER — monta y desmonta mundos, dirige la cámara y ejecuta transiciones.
 *
 * Vive en cada ventana de proyección. Recibe el estado del show por el bus y lo
 * traduce en: qué mundo está activo, qué tiempo le pasa, qué transición corre y
 * dónde está la cámara de ESTA superficie.
 */
import * as THREE from 'three';
import { getWorld } from '../worlds/index.js';
import { CameraDirector } from './CameraDirector.js';
import { Transition, routeFor, TRANSITIONS } from './Transitions.js';
import { makeRng } from '../core/rng.js';
import { OPENING, sceneAt } from '../config/show.js';
import { getProjector } from '../config/projectors.js';
import { clamp01 } from '../core/easing.js';

export class SceneManager {
  constructor({ stage, surface, assets, quality, seed = 'universo-1-1' }) {
    this.stage = stage;
    this.surface = surface;
    this.assets = assets;
    this.quality = quality;
    this.seed = seed;
    this.projector = getProjector(surface);
    this.director = new CameraDirector(this.projector);

    this.current = null;     // { id, world, scene, handles }
    this.incoming = null;
    this.transition = null;
    this.mode = 'show';      // 'show' | 'library'
    this.worldParams = {};
    this.lastSceneId = null;
    this._voidNodes = null;
    this._pending = new Set();
  }

  /** Semilla por mundo: las tres superficies generan geometría IDÉNTICA. */
  rngFor(worldId, variant = '') {
    return makeRng(`${this.seed}:${worldId}:${variant}`);
  }

  /**
   * Construye un mundo en su propia THREE.Scene.
   * No bloquea: si un asset falta, el mundo se monta con placeholders.
   */
  _mount(worldId, { variant = null, preset = null } = {}) {
    const world = getWorld(worldId);
    const scene = new THREE.Scene();
    const rng = this.rngFor(worldId, variant || '');
    const v = variant || world.params?.variant || undefined;
    const handles = world.build({
      scene,
      surface: this.surface,
      quality: this.quality,
      rng,
      assets: this.assets,
      variant: v,
      preset,
      nodes: worldId === 'garden' ? (this._voidNodes || []) : []
    });
    // VOID expone los nodos que despierta la estrella: GARDEN germina ahí
    if (worldId === 'void' && world.getNodes) this._voidNodes = world.getNodes(handles);
    return { id: worldId, world, scene, handles, variant: v, camera: this._makeCamera() };
  }

  _makeCamera() {
    const c = new THREE.PerspectiveCamera(this.projector.fov, this.stage.camera.aspect, 0.1, 6000);
    return c;
  }

  _unmount(entry) {
    if (!entry) return;
    try { entry.world.dispose?.(entry.handles); } catch (e) { console.warn('[scene] dispose', e); }
    entry.scene.traverse?.((o) => {
      o.geometry?.dispose?.();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
    });
    entry.scene.clear?.();
  }

  /** Cambio inmediato, sin transición (seek del operador, arranque). */
  setWorldImmediate(worldId, opts = {}) {
    if (this.current?.id === worldId && this.current.variant === (opts.variant ?? this.current.variant)) return;
    const next = this._mount(worldId, opts);
    this._unmount(this.incoming);
    this.incoming = null;
    this.transition = null;
    const old = this.current;
    this.current = next;
    this.stage.setScene(next.scene);
    this.stage.prepareTransition(null);
    this.director.snap();
    this._unmount(old);
  }

  /** Cambio con transición justificada. */
  transitionTo(worldId, { via = null, duration = null, variant = null, preset = null, center = [0.5, 0.5] } = {}) {
    if (!this.current) { this.setWorldImmediate(worldId, { variant, preset }); return; }
    if (this.current.id === worldId && (variant ?? this.current.variant) === this.current.variant) return;
    if (this.transition && this.incoming?.id === worldId) return; // ya en curso

    this._unmount(this.incoming);
    this.incoming = this._mount(worldId, { variant, preset });
    const route = via || routeFor(this.current.id, worldId);
    this.transition = new Transition({
      from: this.current.id, to: worldId, via: route, duration, center
    });
    return this.transition;
  }

  /**
   * Tick principal.
   * @param s estado del show (ClockFollower)
   */
  update(s, dt) {
    const showTime = s.showTime;
    const ambientTime = s.ambientTime;

    // ── 1. qué mundo toca según el timeline ──
    if (this.mode === 'show') {
      const sc = sceneAt(showTime, OPENING);
      if (sc.id !== this.lastSceneId) {
        this.lastSceneId = sc.id;
        const wantWorld = sc.world;
        if (!this.current) {
          this.setWorldImmediate(wantWorld);
        } else if (this.current.id !== wantWorld) {
          const tin = sc.transitionIn;
          // el seek del operador no debe disparar transiciones largas
          const seeked = Math.abs(showTime - sc.start) > 1.5;
          if (seeked) this.setWorldImmediate(wantWorld);
          else this.transitionTo(wantWorld, { via: tin?.via, duration: tin?.duration });
        }
      }
      // keyframes de cámara de la escena actual
      this.director.rollEnabled = sc.world === 'cosmos';
      this.director.applyKeyframes(sc.camera, showTime);
      this.sceneParams = sc.params || {};
    } else {
      // modo biblioteca: la cámara la dirige el propio mundo
      const w = this.current?.world;
      if (w?.cameraRig) {
        this.director.applyRig(w.cameraRig({ ambientTime, handles: this.current.handles }));
      }
      this.director.rollEnabled = false;
    }

    // ── 2. transición en curso ──
    let mix = 0;
    if (this.transition) {
      mix = this.transition.update(dt);
      if (this.transition.done) {
        const old = this.current;
        this.current = this.incoming;
        this.incoming = null;
        this.stage.setScene(this.current.scene);
        this.stage.prepareTransition(null);
        this.transition = null;
        this._unmount(old);
      }
    }

    // ── 3. cámara de esta superficie ──
    this.director.update(this.current?.camera || this.stage.camera, dt, ambientTime);
    if (this.current) {
      this.stage.camera.position.copy(this.current.camera.position);
      this.stage.camera.quaternion.copy(this.current.camera.quaternion);
      this.stage.camera.fov = this.current.camera.fov;
      this.stage.camera.updateProjectionMatrix();
    }
    const focus = this.director.focusDistance;

    // ── 4. actualizar mundos ──
    const common = {
      showTime, ambientTime, dt, focus,
      mode: this.mode,
      params: { ...(this.current?.world.params || {}), ...this.sceneParams, ...this.worldParams }
    };
    if (this.current) {
      this.current.world.update({ handles: this.current.handles, ...common });
      // la cámara del mundo actual ya la escribió el director
      this.current.camera.position.copy(this.stage.camera.position);
      this.current.camera.quaternion.copy(this.stage.camera.quaternion);
      this.current.camera.fov = this.stage.camera.fov;
      this.current.camera.aspect = this.stage.camera.aspect;
      this.current.camera.updateProjectionMatrix();
    }
    if (this.incoming) {
      this.incoming.world.update({
        handles: this.incoming.handles, ...common,
        params: { ...(this.incoming.world.params || {}), ...this.sceneParams, ...this.worldParams }
      });
      this.incoming.camera.position.copy(this.stage.camera.position);
      this.incoming.camera.quaternion.copy(this.stage.camera.quaternion);
      this.incoming.camera.fov = this.stage.camera.fov;
      this.incoming.camera.aspect = this.stage.camera.aspect;
      this.incoming.camera.updateProjectionMatrix();
    }

    // ── 5. componer la transición ──
    if (this.transition && this.incoming) {
      this.stage.prepareTransition(
        { scene: this.incoming.scene, camera: this.incoming.camera },
        {
          mix,
          mode: this.transition.mode,
          center: this.transition.center,
          time: ambientTime,
          tintA: this.current?.world.palette?.accent,
          tintB: this.incoming?.world.palette?.caustic || this.incoming?.world.palette?.accent
        }
      );
    }

    // ── 6. fade maestro del operador ──
    this.stage.setFade(s.fadeLevel ?? 1);
  }

  /** Modo biblioteca: un mundo en bucle, sin narrativa. */
  enterLibrary(worldId, { variant = null, preset = null, via = null } = {}) {
    this.mode = 'library';
    this.lastSceneId = null;
    this.transitionTo(worldId, { variant, preset, via });
  }

  /** Volver al show narrativo. */
  enterShow() {
    this.mode = 'show';
    this.lastSceneId = null;
  }

  setWorldParams(params) { this.worldParams = { ...this.worldParams, ...params }; }

  setQuality(quality) {
    this.quality = quality;
    // remontar el mundo actual con el nuevo presupuesto
    if (this.current) {
      const id = this.current.id, variant = this.current.variant;
      this.setWorldImmediate('void');
      this.setWorldImmediate(id, { variant });
    }
  }

  /** Eventos interactivos del panel o del cursor. */
  interact(payload) {
    const w = this.current?.world;
    if (!w?.interact) return null;
    return w.interact(this.current.handles, payload);
  }

  get info() {
    return {
      surface: this.surface,
      world: this.current?.id || null,
      variant: this.current?.variant || null,
      incoming: this.incoming?.id || null,
      transition: this.transition ? { via: this.transition.via, progress: this.transition.raw } : null,
      mode: this.mode
    };
  }

  dispose() {
    this._unmount(this.current);
    this._unmount(this.incoming);
    this.current = this.incoming = null;
  }
}

export default SceneManager;
