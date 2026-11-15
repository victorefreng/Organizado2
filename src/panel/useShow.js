/**
 * NÚCLEO DEL PANEL: reloj maestro, motor de cues de luz, audio y bus.
 *
 * El panel es la autoridad temporal. Emite estado a 10 Hz a las ventanas de
 * proyección, que lo extrapolan localmente (ver ClockFollower).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { ShowClock, STATE } from '../core/clock.js';
import { OPENING, WORLD_LIBRARY } from '../config/show.js';
import { LightingEngine } from '../core/lighting.js';
import { getAudio } from '../core/audio.js';
import { getBus, MSG } from '../core/bus.js';
import { DEFAULT_QUALITY } from '../config/quality.js';
import { PROJECTORS, SURFACES } from '../config/projectors.js';
import { MESSAGES } from '../config/memories.js';

const STATE_RATE = 1 / 10; // 10 Hz

export function useShow() {
  const clockRef = useRef(null);
  const lightRef = useRef(null);
  const audioRef = useRef(null);
  const busRef = useRef(null);
  const windowsRef = useRef(new Map());

  const [snap, setSnap] = useState(() => ({
    state: STATE.IDLE, showTime: 0, ambientTime: 0, sceneId: 's001',
    sceneName: 'ABSOLUTE DARKNESS', sceneNumber: '001', world: 'void',
    duration: OPENING.duration, fadeLevel: 1, rate: 1, sceneStart: 0, sceneEnd: 35
  }));
  const [lights, setLights] = useState(null);
  const [cueLog, setCueLog] = useState([]);
  const [outputs, setOutputs] = useState({});       // surface -> {stats, preview}
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [mode, setMode] = useState('show');          // 'show' | 'library'
  const [libraryWorld, setLibraryWorld] = useState(null);
  const [worldParams, setWorldParams] = useState({});
  const [projectors, setProjectors] = useState(() => JSON.parse(JSON.stringify(PROJECTORS)));
  const [audioReady, setAudioReady] = useState(false);
  const [interactiveHolds, setInteractiveHolds] = useState(false);
  const [hold, setHold] = useState(null);
  const [message, setMessage] = useState(MESSAGES.finalMessage);
  const [assetReport, setAssetReport] = useState(null);
  const [firedCues, setFiredCues] = useState([]);

  // ─────────────────────────── init ───────────────────────────
  useEffect(() => {
    const clock = new ShowClock(OPENING, { interactiveHolds: false });
    const light = new LightingEngine({ flasherAuto: false });
    const bus = getBus();
    const audio = getAudio();
    clockRef.current = clock;
    lightRef.current = light;
    busRef.current = bus;
    audioRef.current = audio;

    clock.on('cue', (cue) => {
      light.fire(cue);
      setCueLog((l) => [{ ...cue, at: cue.absT }, ...l].slice(0, 40));
      setFiredCues((f) => [...f, cue.key || `${cue.scene}:${cue.type}:${cue.t}`]);
      bus.send(MSG.CUE, cue);
    });

    clock.on('scene', ({ scene }) => {
      // eventos de audio de la escena entrante
      for (const e of scene.audio || []) {
        if (Math.abs(e.t - clock.showTime) < 1.2) audio.apply(e);
      }
    });

    clock.on('hold', (h) => {
      setHold(h);
      bus.send(MSG.COMMAND, { type: 'hint', text: h.prompt });
    });

    clock.on('state', (s) => {
      if (s !== STATE.WAITING) {
        setHold(null);
        bus.send(MSG.COMMAND, { type: 'hint', text: '' });
      }
    });

    // registro de ventanas de proyección
    const offHello = bus.on(MSG.HELLO, (p) => {
      windowsRef.current.set(p.surface, { ...p, lastSeen: Date.now() });
      setOutputs((o) => ({ ...o, [p.surface]: { ...(o[p.surface] || {}), online: true, label: p.label } }));
      // sincroniza al instante a la ventana que acaba de abrirse
      bus.send(MSG.STATE, clock.snapshot());
      bus.send(MSG.CONFIG, { quality, worldParams, message });
      if (mode === 'library' && libraryWorld) {
        bus.send(MSG.COMMAND, { type: 'library', ...libraryWorld });
      }
    });

    const offStats = bus.on(MSG.STATS, (p) => {
      if (p.assetReport) { setAssetReport(p.assetReport); return; }
      windowsRef.current.set(p.surface, { ...(windowsRef.current.get(p.surface) || {}), lastSeen: Date.now() });
      setOutputs((o) => ({ ...o, [p.surface]: { ...(o[p.surface] || {}), online: true, stats: p } }));
    });

    const offPreview = bus.on(MSG.PREVIEW, (p) => {
      setOutputs((o) => ({ ...o, [p.surface]: { ...(o[p.surface] || {}), online: true, preview: p.url } }));
    });

    const offBye = bus.on(MSG.BYE, (p) => {
      windowsRef.current.delete(p.surface);
      setOutputs((o) => ({ ...o, [p.surface]: { ...(o[p.surface] || {}), online: false } }));
    });

    // ─────────────────────────── bucle ───────────────────────────
    let raf = 0, last = performance.now(), acc = 0, uiAcc = 0;
    const tick = (now) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      clock.tick(dt);
      light.update(dt);

      acc += dt;
      if (acc >= STATE_RATE) {
        acc = 0;
        bus.send(MSG.STATE, clock.snapshot());
      }
      uiAcc += dt;
      if (uiAcc >= 1 / 20) {
        uiAcc = 0;
        setSnap(clock.snapshot());
        setLights(light.state);
        // detecta ventanas caídas
        const now2 = Date.now();
        setOutputs((o) => {
          let changed = false;
          const next = { ...o };
          for (const s of SURFACES) {
            const w = windowsRef.current.get(s);
            const online = !!w && now2 - w.lastSeen < 2500;
            if (next[s] && next[s].online !== online) { next[s] = { ...next[s], online }; changed = true; }
          }
          return changed ? next : o;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      offHello(); offStats(); offPreview(); offBye();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────── comandos del operador ───────────────────────

  const ensureAudio = useCallback(async () => {
    const a = audioRef.current;
    if (!a.ready) { await a.init(); a.startLoops(); setAudioReady(true); }
    await a.resume();
  }, []);

  const cmd = useCallback(async (name, arg) => {
    const c = clockRef.current, l = lightRef.current, b = busRef.current, a = audioRef.current;
    if (!c) return;
    switch (name) {
      case 'go':
        await ensureAudio();
        a.rebuildStateAt(c.showTime, OPENING);
        c.go();
        break;
      case 'hold': c.hold(); break;
      case 'back':
        c.back();
        a.rebuildStateAt(c.showTime, OPENING);
        l.allOff(0.8);
        setFiredCues([]);
        break;
      case 'nextCue': c.nextCue(); a.rebuildStateAt(c.showTime, OPENING); break;
      case 'prevCue': c.prevCue(); a.rebuildStateAt(c.showTime, OPENING); break;
      case 'restartScene': c.restartScene(); a.rebuildStateAt(c.showTime, OPENING); setFiredCues([]); break;
      case 'restartShow':
        await ensureAudio();
        c.restartShow(); a.rebuildStateAt(0, OPENING); l.allOff(0.5); setCueLog([]); setFiredCues([]);
        break;
      case 'fadeToBlack': c.fadeToBlack(arg ?? 2.5); l.fire({ type: 'LIGHT_FADE_OUT', dur: arg ?? 2.5 }); break;
      case 'fadeIn': c.fadeIn(arg ?? 2.5); break;
      case 'blackout': c.blackout(); l.fire({ type: 'BLACKOUT', dur: 0.3 }); break;
      case 'emergencyStop':
        c.emergencyStop(); l.allOff(0.1); a.setMuted(true);
        b.send(MSG.COMMAND, { type: 'hint', text: '' });
        break;
      case 'release': c.release(); break;
      case 'seek': c.seek(arg); a.rebuildStateAt(arg, OPENING); setFiredCues([]); break;
      case 'goToScene': c.goToScene(arg); a.rebuildStateAt(c.showTime, OPENING); setFiredCues([]); break;
      case 'rate': c.setRate(arg); break;
      case 'unmute': a.setMuted(false); break;
      default: break;
    }
  }, [ensureAudio]);

  const fireCue = useCallback((type, extra = {}) => {
    const l = lightRef.current;
    l.fire({ type, ...extra });
    setCueLog((x) => [{ type, manual: true, at: clockRef.current?.showTime ?? 0, ...extra }, ...x].slice(0, 40));
    busRef.current.send(MSG.CUE, { type, ...extra, manual: true });
  }, []);

  const setFixture = useCallback((id, hex, dim) => {
    lightRef.current.setFixture(id, hex, dim, 0.4);
  }, []);

  const toggleFlasherAuto = useCallback((on) => {
    lightRef.current.flasherAuto = on;
    setLights(lightRef.current.state);
  }, []);

  const changeQuality = useCallback((q) => {
    setQuality(q);
    busRef.current.send(MSG.CONFIG, { quality: q });
  }, []);

  const pushWorldParams = useCallback((p) => {
    setWorldParams((prev) => {
      const next = { ...prev, ...p };
      busRef.current.send(MSG.CONFIG, { worldParams: next });
      return next;
    });
  }, []);

  const enterLibrary = useCallback((world, variant, preset) => {
    setMode('library');
    const payload = { world, variant, preset };
    setLibraryWorld(payload);
    clockRef.current.hold();
    busRef.current.send(MSG.COMMAND, { type: 'library', ...payload });
    busRef.current.send(MSG.COMMAND, { type: 'cursor', on: true });
    // cue de ambiente coherente con el mundo
    const cueByWorld = {
      ocean: 'OCEAN_BLUE', garden: 'FOREST_GREEN', sky: 'SUNSET_AMBER',
      cosmos: 'GALAXY_PURPLE', redroom: 'RED_ROOM', memories: 'MEMORY_CHORUS'
    };
    if (cueByWorld[world]) fireCue(cueByWorld[world], { dur: 4 });
  }, [fireCue]);

  const enterShow = useCallback(() => {
    setMode('show');
    setLibraryWorld(null);
    busRef.current.send(MSG.COMMAND, { type: 'show' });
    busRef.current.send(MSG.COMMAND, { type: 'cursor', on: false });
  }, []);

  const identify = useCallback((surface, on) => {
    busRef.current.send(MSG.COMMAND, { type: 'identify', on, surface });
  }, []);

  const updateProjector = useCallback((surface, patch) => {
    setProjectors((p) => {
      const next = { ...p, [surface]: { ...p[surface], ...patch } };
      busRef.current.send(MSG.CONFIG, { projector: next[surface] });
      return next;
    });
  }, []);

  const openOutput = useCallback((surface) => {
    const p = projectors[surface];
    const w = window.open(
      `/output.html?surface=${surface}&quality=${quality}`,
      `universo-${surface}`,
      `width=${Math.min(1280, p.resolution.width)},height=${Math.min(720, p.resolution.height)}`
    );
    if (!w) alert('El navegador bloqueó la ventana. Permite las ventanas emergentes para este sitio.');
  }, [projectors, quality]);

  const openAllOutputs = useCallback(() => {
    ['ceiling', 'environment', 'story'].forEach((s, i) => setTimeout(() => openOutput(s), i * 350));
  }, [openOutput]);

  const sendInteract = useCallback((payload) => {
    busRef.current.send(MSG.INTERACT, payload);
  }, []);

  const applyMessage = useCallback((text) => {
    setMessage(text);
    busRef.current.send(MSG.CONFIG, { message: text });
  }, []);

  const toggleInteractive = useCallback((on) => {
    setInteractiveHolds(on);
    clockRef.current.interactiveHoldsEnabled = on;
  }, []);

  return {
    snap, lights, cueLog, outputs, quality, mode, libraryWorld, worldParams,
    projectors, audioReady, hold, message, assetReport, firedCues,
    show: OPENING, library: WORLD_LIBRARY,
    audio: audioRef.current,
    cmd, fireCue, setFixture, toggleFlasherAuto, changeQuality, pushWorldParams,
    enterLibrary, enterShow, identify, updateProjector, openOutput, openAllOutputs,
    sendInteract, applyMessage, toggleInteractive, interactiveHolds, ensureAudio
  };
}

export { STATE };
