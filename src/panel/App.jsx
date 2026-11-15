import React, { useState, useEffect } from 'react';
import { useShow, STATE } from './useShow.js';
import Previews from './components/Previews.jsx';
import ShowControl from './components/ShowControl.jsx';
import Timeline, { tc } from './components/Timeline.jsx';
import VisualEngine from './components/VisualEngine.jsx';
import LightingPreview from './components/LightingPreview.jsx';
import MediaManager from './components/MediaManager.jsx';
import ProjectorManager from './components/ProjectorManager.jsx';

const STATE_CHIP = {
  [STATE.IDLE]: ['chip', 'EN ESPERA'],
  [STATE.RUNNING]: ['chip live', 'EN DIRECTO'],
  [STATE.HOLD]: ['chip hold', 'HOLD'],
  [STATE.WAITING]: ['chip wait', 'ESPERANDO ACCIÓN'],
  [STATE.FADING]: ['chip hold', 'FADE'],
  [STATE.BLACKOUT]: ['chip black', 'BLACKOUT'],
  [STATE.FINISHED]: ['chip wait', 'MUNDO EXPLORABLE']
};

export default function App() {
  const s = useShow();
  const [tab, setTab] = useState('engine');
  const [chip, chipLabel] = STATE_CHIP[s.snap.state] || STATE_CHIP[STATE.IDLE];

  // atajos de show control
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); s.cmd('go'); }
      else if (e.key === 'h' || e.key === 'H') s.cmd('hold');
      else if (e.key === 'b' || e.key === 'B') s.cmd('back');
      else if (e.key === 'ArrowRight') s.cmd('nextCue');
      else if (e.key === 'ArrowLeft') s.cmd('prevCue');
      else if (e.key === 'r' || e.key === 'R') s.cmd('restartScene');
      else if (e.key === 'Escape') s.cmd('emergencyStop');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s]);

  const online = Object.values(s.outputs).filter((o) => o.online).length;

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">UNIVERSO <b>1/1</b></span>
        <div className="sep" />
        <span className={chip}>{chipLabel}</span>
        {/* En biblioteca la cabecera debe decir qué mundo se está viendo, no en
            qué escena quedó parado el timeline: era engañoso para el operador. */}
        {s.mode === 'library' && s.libraryWorld ? (
          <>
            <span className="chip">
              {(s.library.find((w) => w.id === s.libraryWorld.world
                && (w.preset || undefined) === s.libraryWorld.preset)
                || s.library.find((w) => w.id === s.libraryWorld.world))?.label || s.libraryWorld.world}
            </span>
            <span className="chip">{s.libraryWorld.variant || '—'}</span>
          </>
        ) : (
          <>
            <span className="chip">{s.snap.sceneNumber} · {s.snap.sceneName}</span>
            <span className="chip">{s.snap.world}</span>
          </>
        )}
        <div className="grow" />
        <span className="chip">{online}/3 salidas</span>
        <span className="tc">
          {tc(s.snap.showTime)} <span className="dim">/ {tc(s.show.duration)}</span>
        </span>
      </div>

      <div className="main">
        <Previews
          outputs={s.outputs}
          projectors={s.projectors}
          onOpen={s.openOutput}
          onOpenAll={s.openAllOutputs}
          onIdentify={s.identify}
        />

        <div className="tabs" style={{ marginBottom: 12, borderRadius: 6, border: '1px solid var(--line)' }}>
          {[['engine', 'Visual Engine'], ['media', 'Media Manager'], ['projectors', 'Projector Manager']].map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === 'engine' && (
          <VisualEngine
            library={s.library}
            mode={s.mode}
            libraryWorld={s.libraryWorld}
            quality={s.quality}
            changeQuality={s.changeQuality}
            worldParams={s.worldParams}
            pushWorldParams={s.pushWorldParams}
            enterLibrary={s.enterLibrary}
            enterShow={s.enterShow}
            snap={s.snap}
          />
        )}
        {tab === 'media' && (
          <MediaManager
            message={s.message}
            applyMessage={s.applyMessage}
            audio={s.audio}
            assetReport={s.assetReport}
            sendInteract={s.sendInteract}
          />
        )}
        {tab === 'projectors' && (
          <ProjectorManager
            projectors={s.projectors}
            outputs={s.outputs}
            updateProjector={s.updateProjector}
            identify={s.identify}
            openOutput={s.openOutput}
          />
        )}
      </div>

      <div className="side">
        <ShowControl
          snap={s.snap}
          mode={s.mode}
          hold={s.hold}
          cmd={s.cmd}
          fireCue={s.fireCue}
          onEnterShow={s.enterShow}
          interactiveHolds={s.interactiveHolds}
          toggleInteractive={s.toggleInteractive}
          audioReady={s.audioReady}
          audio={s.audio}
          sendInteract={s.sendInteract}
        />
        <LightingPreview
          lights={s.lights}
          setFixture={s.setFixture}
          toggleFlasherAuto={s.toggleFlasherAuto}
          cueLog={s.cueLog}
        />
        <div className="section">
          <header><h2>Atajos</h2></header>
          <div className="body">
            <table className="kv">
              <tbody>
                <tr><td><span className="kbd">Espacio</span></td><td>GO / liberar</td></tr>
                <tr><td><span className="kbd">H</span></td><td>HOLD / reanudar</td></tr>
                <tr><td><span className="kbd">B</span></td><td>BACK</td></tr>
                <tr><td><span className="kbd">◂ ▸</span></td><td>Cue anterior / siguiente</td></tr>
                <tr><td><span className="kbd">R</span></td><td>Reiniciar escena</td></tr>
                <tr><td><span className="kbd">Esc</span></td><td>Parada de emergencia</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="timeline-area">
        <Timeline
          show={s.show}
          snap={s.snap}
          onSeek={(t) => s.cmd('seek', t)}
          onScene={(id) => s.cmd('goToScene', id)}
        />
      </div>
    </div>
  );
}
