import React from 'react';
import { QUALITY_PRESETS } from '../../config/quality.js';
import { RED_ROOM_PRESETS } from '../../fx/RedRoom.js';

export default function VisualEngine({
  library, mode, libraryWorld, quality, changeQuality,
  worldParams, pushWorldParams, enterLibrary, enterShow, snap
}) {
  const wp = worldParams;
  const isRed = libraryWorld?.world === 'redroom';
  const num = (k, d) => (wp[k] !== undefined ? wp[k] : d);

  return (
    <>
      <div className="section">
        <header><h2>Biblioteca de mundos</h2></header>
        <div className="body">
          <div className="media-list">
            {library.map((w) => {
              const on = libraryWorld?.world === w.id && libraryWorld?.preset === (w.preset || undefined);
              return (
                <div className="media-item" key={w.code} style={{ gridTemplateColumns: '22px 1fr auto' }}>
                  <span style={{ font: '500 11px var(--mono)', color: 'var(--amber-dim)' }}>{w.code}</span>
                  <div>
                    <div className="mi-name">{w.label}</div>
                    <div className="mi-meta">{w.variants.join(' · ')}</div>
                  </div>
                  <div className="btn-row">
                    <select
                      style={{ width: 104 }}
                      value={on ? (libraryWorld.variant || w.defaultVariant) : w.defaultVariant}
                      onChange={(e) => enterLibrary(w.id, e.target.value, w.preset)}
                    >
                      {w.variants.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button className={`btn sm${on ? ' active' : ''}`}
                            onClick={() => enterLibrary(w.id, w.defaultVariant, w.preset)}>
                      {on ? 'activo' : 'activar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className={`btn${mode === 'show' ? ' active' : ''}`} onClick={enterShow}>
              Opening · THE FIRST LIGHT
            </button>
          </div>
          <div className="hint">
            THE RED ROOM es un universo independiente y opcional: nunca se activa desde el opening.
          </div>
        </div>
      </div>

      <div className="section">
        <header><h2>Calidad y rendimiento</h2></header>
        <div className="body">
          <div className="ctrl">
            <label>Preset <span className="val">{QUALITY_PRESETS[quality]?.label}</span></label>
            <div className="btn-grid">
              {Object.entries(QUALITY_PRESETS).map(([k, p]) => (
                <button key={k} className={`btn sm${quality === k ? ' active' : ''}`}
                        onClick={() => changeQuality(k)}>{p.label}</button>
              ))}
            </div>
          </div>
          <table className="kv">
            <tbody>
              <tr><td>Presupuesto de partículas</td><td className="num">{QUALITY_PRESETS[quality]?.particleBudget.toLocaleString()}</td></tr>
              <tr><td>Instancias</td><td className="num">{QUALITY_PRESETS[quality]?.instanceBudget.toLocaleString()}</td></tr>
              <tr><td>Estrellas</td><td className="num">{QUALITY_PRESETS[quality]?.starCount.toLocaleString()}</td></tr>
              <tr><td>Bloom</td><td className="num">{QUALITY_PRESETS[quality]?.bloom ? 'sí' : 'no'}</td></tr>
              <tr><td>Antialias</td><td className="num">{QUALITY_PRESETS[quality]?.antialias ? 'sí' : 'no'}</td></tr>
            </tbody>
          </table>
          <div className="hint">
            El presupuesto se reparte por superficie: STORY 50%, ENVIRONMENT 30%, CEILING 20%.
            Si el hardware sufre, degrada primero CEILING.
          </div>
        </div>
      </div>

      <div className="section">
        <header><h2>Parámetros de escena</h2></header>
        <div className="body">
          <div className="ctrl">
            <label>Brillo de salida <span className="val">{num('brightness', 1).toFixed(2)}</span></label>
            <input type="range" min="0.1" max="1.4" step="0.02" value={num('brightness', 1)}
                   onChange={(e) => pushWorldParams({ brightness: parseFloat(e.target.value) })} />
          </div>
          <div className="ctrl">
            <label>Velocidad de animaciones <span className="val">{num('speed', 1).toFixed(2)}×</span></label>
            <input type="range" min="0.2" max="2.5" step="0.05" value={num('speed', 1)}
                   onChange={(e) => pushWorldParams({ speed: parseFloat(e.target.value) })} />
          </div>
          <div className="ctrl">
            <label>Densidad de partículas / peces <span className="val">{Math.round(num('fishDensity', 1) * 100)}%</span></label>
            <input type="range" min="0" max="1" step="0.02" value={num('fishDensity', 1)}
                   onChange={(e) => pushWorldParams({ fishDensity: parseFloat(e.target.value) })} />
          </div>
          <div className="ctrl">
            <label>Luminosidad <span className="val">{num('luminosity', 1).toFixed(2)}</span></label>
            <input type="range" min="0.1" max="1.6" step="0.02" value={num('luminosity', 1)}
                   onChange={(e) => pushWorldParams({ luminosity: parseFloat(e.target.value) })} />
          </div>
          <div className="ctrl">
            <label>Profundidad <span className="val">{num('depth', 1).toFixed(2)}</span></label>
            <input type="range" min="0.2" max="2" step="0.05" value={num('depth', 1)}
                   onChange={(e) => pushWorldParams({ depth: parseFloat(e.target.value) })} />
          </div>
          <div className="ctrl">
            <label>Viento <span className="val">{num('wind', 0.12).toFixed(2)}</span></label>
            <input type="range" min="0" max="0.6" step="0.01" value={num('wind', 0.12)}
                   onChange={(e) => pushWorldParams({ wind: parseFloat(e.target.value) })} />
          </div>
          <div className="ctrl">
            <label>Hora del día (cielo) <span className="val">{num('timeOfDay', 0.6).toFixed(2)}</span></label>
            <input type="range" min="0" max="1" step="0.01" value={num('timeOfDay', 0.6)}
                   onChange={(e) => pushWorldParams({ timeOfDay: parseFloat(e.target.value) })} />
          </div>
          <div className="ctrl">
            <label>Velocidad de viaje (cosmos) <span className="val">{num('warpSpeed', 0).toFixed(2)}</span></label>
            <input type="range" min="0" max="1" step="0.02" value={num('warpSpeed', 0)}
                   onChange={(e) => pushWorldParams({ warpSpeed: parseFloat(e.target.value) })} />
          </div>
        </div>
      </div>

      {isRed && (
        <div className="section">
          <header><h2>Red Room · intensidades</h2></header>
          <div className="body">
            <div className="btn-grid">
              {Object.entries(RED_ROOM_PRESETS).map(([k, p]) => (
                <button key={k} className={`btn sm${num('preset', 'romantic') === k ? ' active' : ''}`}
                        onClick={() => pushWorldParams({ preset: k, ...p })}>{p.label}</button>
              ))}
            </div>
            <div className="hint" style={{ marginBottom: 10 }}>
              {RED_ROOM_PRESETS[num('preset', 'romantic')]?.desc}
            </div>
            {[
              ['hue', 'Tono', 0.93, 1.02, 0.002],
              ['saturation', 'Saturación (tope 0.75)', 0, 0.75, 0.01],
              ['brightness', 'Brillo', 0.05, 1, 0.01],
              ['speed', 'Velocidad de movimiento', 0, 1, 0.01],
              ['amberMix', 'Mezcla de ámbar', 0, 1, 0.01],
              ['foldDepth', 'Profundidad de pliegues', 0, 1.2, 0.01],
              ['dustIntensity', 'Polvo en suspensión', 0, 1, 0.01],
              ['shadowContrast', 'Contraste de sombra', 0, 1.2, 0.01]
            ].map(([k, label, min, max, step]) => (
              <div className="ctrl" key={k}>
                <label>{label} <span className="val">{num(k, RED_ROOM_PRESETS.romantic[k]).toFixed(3)}</span></label>
                <input type="range" min={min} max={max} step={step}
                       value={num(k, RED_ROOM_PRESETS.romantic[k])}
                       onChange={(e) => pushWorldParams({ preset: 'custom', [k]: parseFloat(e.target.value) })} />
              </div>
            ))}
            <div className="hint">
              La saturación está limitada a 0.75 por diseño: por encima el rojo deja de leerse
              como terciopelo y empieza a parecer un escenario barato.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
