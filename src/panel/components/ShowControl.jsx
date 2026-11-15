import React from 'react';
import { STATE } from '../useShow.js';
import { CUE_LIBRARY } from '../../core/lighting.js';

const MANUAL_CUES = [
  'LIGHT_FADE_IN', 'LIGHT_FADE_OUT', 'COLOR_CHANGE', 'STAR_PASSING',
  'OCEAN_BLUE', 'FOREST_GREEN', 'GALAXY_PURPLE', 'SUNSET_AMBER',
  'RED_ROOM', 'FINAL_REVEAL', 'BLACKOUT'
];

export default function ShowControl({ snap, mode, hold, cmd, fireCue, onEnterShow, interactiveHolds, toggleInteractive, audioReady, audio, sendInteract }) {
  const running = snap.state === STATE.RUNNING;
  const waiting = snap.state === STATE.WAITING;

  return (
    <div className="section">
      <header><h2>Show Control</h2>
        <span className="chip">{mode === 'show' ? 'OPENING' : 'BIBLIOTECA'}</span>
      </header>
      <div className="body">
        {waiting && hold && (
          <div className="notice info">
            Pausa interactiva: <b>{hold.prompt}</b> — el ambiente sigue vivo.
            Pulsa GO o <b>Liberar</b> para continuar.
          </div>
        )}
        {mode === 'library' && (
          <div className="notice dim">
            Estás en un mundo de biblioteca. <button className="btn sm" onClick={onEnterShow}>Volver al opening</button>
          </div>
        )}

        <div className="btn-grid c3" style={{ marginBottom: 6 }}>
          <button className="btn go" onClick={() => cmd('go')}>
            {waiting ? 'Liberar' : running ? 'GO ▸' : 'GO'}
          </button>
          <button className={`btn hold${!running ? '' : ''}`} onClick={() => cmd('hold')}>
            {running ? 'HOLD' : 'Reanudar'}
          </button>
          <button className="btn back" onClick={() => cmd('back')}>BACK</button>
        </div>
        <div className="btn-grid c3" style={{ marginBottom: 6 }}>
          <button className="btn" onClick={() => cmd('prevCue')}>◂ Cue</button>
          <button className="btn" onClick={() => cmd('nextCue')}>Cue ▸</button>
          <button className="btn" onClick={() => cmd('restartScene')}>Reiniciar escena</button>
        </div>
        <div className="btn-grid c3" style={{ marginBottom: 6 }}>
          <button className="btn" onClick={() => cmd('restartShow')}>Reiniciar show</button>
          <button className="btn" onClick={() => cmd('fadeToBlack', 2.5)}>Fade a negro</button>
          <button className="btn" onClick={() => cmd('fadeIn', 2.5)}>Fade de entrada</button>
        </div>
        <div className="btn-grid c2">
          <button className="btn danger" onClick={() => cmd('blackout')}>Blackout</button>
          <button className="btn danger" onClick={() => { cmd('emergencyStop'); }}>■ Parada de emergencia</button>
        </div>

        <div className="ctrl" style={{ marginTop: 12 }}>
          <label>Velocidad de reproducción <span className="val">{snap.rate.toFixed(2)}×</span></label>
          <input type="range" min="0.25" max="2" step="0.05" value={snap.rate}
                 onChange={(e) => cmd('rate', parseFloat(e.target.value))} />
        </div>

        <label className="toggle" style={{ marginBottom: 8 }}>
          <input type="checkbox" checked={interactiveHolds} onChange={(e) => toggleInteractive(e.target.checked)} />
          Pausas interactivas (el reloj espera una acción)
        </label>

        {!audioReady && (
          <div className="notice">
            El audio arranca con el primer GO (política de autoplay del navegador).
          </div>
        )}
        {audioReady && (
          <div className="btn-row" style={{ marginBottom: 10 }}>
            <button className="btn sm" onClick={() => cmd('unmute')}>Reactivar audio</button>
            <button className="btn sm" onClick={() => audio.setMuted(true)}>Silenciar</button>
          </div>
        )}

        <div className="fx-group">Disparo manual de cues</div>
        <div className="btn-grid c2">
          {MANUAL_CUES.map((c) => (
            <button className="btn sm" key={c} onClick={() => fireCue(c)}>{c.replace(/_/g, ' ')}</button>
          ))}
        </div>

        <div className="fx-group" style={{ marginTop: 12 }}>Disparo de elementos</div>
        <div className="btn-grid c2">
          <button className="btn sm" onClick={() => sendInteract({ type: 'whale-cross' })}>Ballena</button>
          <button className="btn sm" onClick={() => sendInteract({ type: 'butterflies' })}>Mariposas</button>
          <button className="btn sm" onClick={() => sendInteract({ type: 'fish-burst' })}>Peces</button>
          <button className="btn sm" onClick={() => sendInteract({ type: 'select-planet', planetIndex: 0 })}>Viajar a planeta</button>
        </div>
      </div>
    </div>
  );
}
