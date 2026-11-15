/**
 * VENTANA DE PROYECCIÓN.
 *
 * Una instancia por proyector: output.html?surface=story|environment|ceiling
 * En Windows: abrir tres ventanas, arrastrar cada una a su proyector y F11.
 *
 * Esta ventana NO decide nada de la narrativa: recibe el estado del panel y lo
 * renderiza. Su reloj se extrapola localmente para ir a la tasa de refresco real
 * (ver ClockFollower en src/core/clock.js).
 */
import * as THREE from 'three';
import { Stage } from '../engine/Stage.js';
import { SceneManager } from '../engine/SceneManager.js';
import { getBus, MSG } from '../core/bus.js';
import { ClockFollower, STATE } from '../core/clock.js';
import { getAssets } from '../core/assets.js';
import { resolveQuality, DEFAULT_QUALITY } from '../config/quality.js';
import { getProjector, PROJECTORS } from '../config/projectors.js';
import { MESSAGES } from '../config/memories.js';

const params = new URLSearchParams(location.search);
const surface = params.get('surface') || 'story';
/**
 * MODO RENDER OFFLINE (punto 14 del brief: CINEMATIC MODE / exportación).
 *
 * Con ?offline=1 la ventana no corre en tiempo real: expone window.__frame(t, dt)
 * para renderizar un fotograma EXACTO del tiempo de show pedido. Como todo el
 * contenido deriva de showTime y de un PRNG con semilla, el resultado es
 * determinista y reproducible, y se puede exportar a vídeo a la tasa que haga
 * falta aunque la máquina no dé para tiempo real.
 */
const offline = params.get('offline') === '1';
const projector = getProjector(surface);

document.title = `UNIVERSO 1/1 — ${projector.label}`;

const canvas = document.getElementById('stage');
const clipEl = document.getElementById('clip');
const identEl = document.getElementById('ident');
const identLabel = document.getElementById('ident-label');
const identSub = document.getElementById('ident-sub');
const hintEl = document.getElementById('hint');
const bootEl = document.getElementById('boot');

identLabel.textContent = projector.label;
identSub.textContent = `${surface.toUpperCase()} · ${projector.role}`;

const assets = getAssets();
let qualityName = params.get('quality') || DEFAULT_QUALITY;
const stage = new Stage(canvas, surface, qualityName);
const manager = new SceneManager({
  stage, surface, assets,
  quality: resolveQuality(qualityName, projector.budget)
});
const follower = new ClockFollower();
const bus = getBus();

// Mundo inicial: la oscuridad del principio
manager.setWorldImmediate('void');
setTimeout(() => bootEl.classList.add('gone'), 600);

// ───────────────────────────── bus ─────────────────────────────

// En offline el reloj lo dirige el exportador, no el panel.
if (!offline) bus.on(MSG.STATE, (snap) => follower.sync(snap));

bus.on(MSG.COMMAND, (cmd) => {
  switch (cmd.type) {
    case 'identify':
      identEl.classList.toggle('on', !!cmd.on);
      break;
    case 'library':
      manager.enterLibrary(cmd.world, { variant: cmd.variant, preset: cmd.preset, via: cmd.via });
      break;
    case 'show':
      manager.enterShow();
      break;
    case 'world-immediate':
      manager.setWorldImmediate(cmd.world, { variant: cmd.variant, preset: cmd.preset });
      break;
    case 'reload':
      location.reload();
      break;
    case 'cursor':
      document.body.classList.toggle('show-cursor', !!cmd.on);
      break;
    case 'hint':
      hintEl.textContent = cmd.text || '';
      hintEl.classList.toggle('on', !!cmd.text);
      break;

    /**
     * Carga un paquete de plano. Cada superficie reproduce SU archivo, no una
     * copia del mismo: el panel manda el mapa completo y aquí se elige el que
     * corresponde a este proyector.
     */
    case 'clip-load': {
      const url = cmd.surfaces?.[surface];
      if (!url) { console.warn('[clip] sin archivo para', surface); break; }
      clipMode = true;
      clipDuration = cmd.duration || 10;
      document.body.classList.add('clip-mode');
      clipEl.src = url;
      clipEl.load();
      clipEl.pause();
      clipEl.currentTime = 0;
      bootEl.classList.add('gone');
      break;
    }
    case 'clip-unload':
      clipMode = false;
      document.body.classList.remove('clip-mode');
      try { clipEl.pause(); clipEl.removeAttribute('src'); clipEl.load(); } catch (_) {}
      break;
  }
});

bus.on(MSG.CONFIG, (cfg) => {
  if (cfg.quality && cfg.quality !== qualityName) {
    qualityName = cfg.quality;
    const q = stage.setQuality(qualityName);
    manager.setQuality(resolveQuality(qualityName, projector.budget));
  }
  if (cfg.worldParams) manager.setWorldParams(cfg.worldParams);
  if (cfg.projector && cfg.projector.id === surface) {
    // calibración en vivo desde el PROJECTOR MANAGER
    Object.assign(projector, cfg.projector);
    stage.projector = projector;
    stage.setBrightness(projector.brightness ?? 1);
    stage.outputPass.uniforms.uGamma.value = projector.gamma ?? 1;
    stage.outputPass.uniforms.uFlip.value.set(projector.flipH ? 1 : 0, projector.flipV ? 1 : 0);
    stage.applyKeystone(projector.keystone);
    manager.director.offset.set(projector.offset.x, projector.offset.y, projector.offset.z);
    manager.director.surfaceQuat.setFromEuler(new THREE.Euler(
      projector.euler.pitch * Math.PI / 180,
      projector.euler.yaw * Math.PI / 180,
      projector.euler.roll * Math.PI / 180,
      'YXZ'
    ));
    manager.director.projector = projector;
  }
  if (cfg.grain !== undefined) stage.setGrain(cfg.grain);
  if (cfg.exposure !== undefined) stage.setExposure(cfg.exposure);
  if (cfg.message !== undefined) {
    const w = manager.current;
    if (w?.world.setMessage) w.world.setMessage(w.handles, cfg.message);
  }
});

bus.on(MSG.INTERACT, (ev) => {
  const result = manager.interact(ev);
  // si el mundo devuelve un encuadre, la cámara se acerca a él
  if (result && result.position) manager.director.applyRig(result);
});

// ───────────────────────── interacción local ─────────────────────────

// parallax con el cursor: sutil, nunca protagonista
let px = 0, py = 0;
window.addEventListener('pointermove', (e) => {
  px = (e.clientX / window.innerWidth) * 2 - 1;
  py = -((e.clientY / window.innerHeight) * 2 - 1);
  manager.director.setParallax(px * 0.6, py * 0.4);
});

// la estrella/partículas siguen al cursor en el mundo explorable
const raycaster = new THREE.Raycaster();
window.addEventListener('pointerdown', (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -((e.clientY / window.innerHeight) * 2 - 1);
  raycaster.setFromCamera(new THREE.Vector2(nx, ny), stage.camera);
  // intento de recoger un recuerdo
  const mem = manager.current?.handles?.memories?.pick?.(raycaster);
  if (mem) {
    manager.director.applyRig(mem.cameraTarget);
    mem.setSelected(true);
    bus.send(MSG.INTERACT, { type: 'memory-picked', id: mem.memory.id, surface });
    return;
  }
  // si no, riega una planta en el punto del suelo
  const ground = manager.current?.handles?.ground;
  if (ground) {
    const hit = raycaster.intersectObject(ground, false)[0];
    if (hit) manager.interact({ type: 'touch-plant', x: hit.point.x, z: hit.point.z });
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  if (e.key === 'i' || e.key === 'I') identEl.classList.toggle('on');
});

// ───────────────────────────── bucle ─────────────────────────────

let last = performance.now();
let statT = 0, prevT = 0;
let clipMode = false, clipDuration = 10;

/**
 * Sincronización del vídeo al reloj de show.
 *
 * No se reposiciona en cada frame: un `currentTime =` constante produce tirones.
 * Se deja correr y solo se corrige cuando la deriva pasa del umbral, que es
 * como se sincroniza vídeo contra timecode en un media server.
 */
function syncClip() {
  const target = Math.min(follower.showTime, clipDuration - 0.001);
  const running = follower.state === 'running';
  if (!running && !clipEl.paused) clipEl.pause();
  const drift = clipEl.currentTime - target;
  if (Math.abs(drift) > 0.12 || (!running && Math.abs(drift) > 0.02)) {
    try { clipEl.currentTime = Math.max(0, target); } catch (_) {}
  }
  if (running && clipEl.paused && clipEl.readyState >= 2) {
    clipEl.play().catch(() => {});
  }
  // corrección fina de velocidad: evita un salto visible por deriva pequeña
  if (running && Math.abs(drift) <= 0.12) {
    clipEl.playbackRate = Math.max(0.9, Math.min(1.1, 1 - drift * 0.6));
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  follower.advance(dt);
  if (clipMode) {
    syncClip();
  } else {
    manager.update(follower, dt);
    stage.render(follower.ambientTime);
  }

  // estadísticas al panel, 2 veces por segundo
  statT += dt;
  if (statT > 0.5) {
    statT = 0;
    bus.send(MSG.STATS, {
      surface,
      ...stage.stats,
      drift: follower.drift,
      showTime: follower.showTime,
      ...manager.info,
      clip: clipMode ? {
        on: true,
        t: clipEl.currentTime,
        drift: clipEl.currentTime - follower.showTime,
        ready: clipEl.readyState
      } : null
    });
  }
  requestAnimationFrame(frame);
}

if (!offline) {
  requestAnimationFrame(frame);
  // previsualización para el panel: JPEG pequeño, 4 fps, barato
  setInterval(() => {
    try {
      const url = makePreview();
      if (url) bus.send(MSG.PREVIEW, { surface, url });
    } catch (_) { /* contexto ocupado: se omite este frame */ }
  }, 250);
} else {
  // ── API de exportación ──
  follower.state = 'running';
  follower.fadeLevel = 1;
  follower.duration = 300;

  /** Salta a un tiempo sin arrastrar inercia de cámara ni transiciones. */
  window.__seek = (t) => {
    follower.showTime = t;
    follower.ambientTime = t;
    manager.update(follower, 1 / 60);
    manager.director.snap();
    manager.update(follower, 1 / 60);
  };

  /** Renderiza el fotograma del tiempo `t`. `dt` es el paso fijo de la pista. */
  window.__frame = (t, dt) => {
    follower.showTime = t;
    follower.ambientTime = t;
    manager.update(follower, dt);
    stage.render(t);
  };

  /** Deja que los assets (texturas de los recuerdos) terminen de cargar. */
  window.__ready = async () => {
    await new Promise((r) => setTimeout(r, 1200));
    return { surface, missing: assets.missing.length };
  };

  /**
   * Configura una PLANCHA: un mundo concreto con un encuadre decidido por
   * dirección, para renderizar una capa de compositing (no una escena del show).
   *
   * @param cfg.world    id del mundo
   * @param cfg.variant  variante
   * @param cfg.params   parámetros del mundo (densidad, luminosidad, whales…)
   * @param cfg.camera   { position, target, fov } fijo
   * @param cfg.drift    { amp, speed, targetAmp } deriva 2.5D muy lenta
   */
  window.__plate = (cfg) => {
    manager.enterLibrary(cfg.world, { variant: cfg.variant });
    manager.setWorldImmediate(cfg.world, { variant: cfg.variant });
    manager.setWorldParams(cfg.params || {});
    const c = cfg.camera;
    const d = cfg.drift || { amp: 0, speed: 0.05, targetAmp: 0 };
    manager.cameraOverride = ({ ambientTime }) => {
      const a = ambientTime * d.speed;
      return {
        position: [
          c.position[0] + Math.sin(a) * d.amp,
          c.position[1] + Math.sin(a * 0.73) * d.amp * 0.4,
          c.position[2] + Math.cos(a * 0.81) * d.amp
        ],
        target: [
          c.target[0] + Math.sin(a * 0.6 + 1.2) * (d.targetAmp ?? d.amp * 0.5),
          c.target[1] + Math.cos(a * 0.45) * (d.targetAmp ?? d.amp * 0.5) * 0.5,
          c.target[2] + Math.cos(a * 0.55 + 0.7) * (d.targetAmp ?? d.amp * 0.5)
        ],
        fov: c.fov
      };
    };
    manager.director.snap();
    return true;
  };

  window.__offlineReady = true;
}

const pv = document.createElement('canvas');
pv.width = 320; pv.height = 180;
const pvCtx = pv.getContext('2d');
function makePreview() {
  // En modo clip la previsualización sale del vídeo, no del lienzo WebGL.
  const src = clipMode && clipEl.readyState >= 2 ? clipEl : canvas;
  pvCtx.drawImage(src, 0, 0, pv.width, pv.height);
  return pv.toDataURL('image/jpeg', 0.5);
}

if (!offline) bus.send(MSG.HELLO, { surface, label: projector.label, quality: qualityName });
window.addEventListener('beforeunload', () => bus.send(MSG.BYE, { surface }));

// Informe de assets que faltan: el panel lo muestra para saber qué reemplazar
if (!offline) setTimeout(() => {
  bus.send(MSG.STATS, { surface, assetReport: assets.report });
}, 2500);

console.info(
  `%cUNIVERSO 1/1%c ${projector.label}\n` +
  `F = pantalla completa · I = prueba de imagen\n` +
  `Calidad: ${qualityName} · Presupuesto de superficie: ${projector.budget}`,
  'color:#FFD9A0;font-weight:600', 'color:#9FD8FF'
);
