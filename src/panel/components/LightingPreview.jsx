import React from 'react';
import { FIXTURES } from '../../core/lighting.js';

function Lamp({ fx, round }) {
  const bri = Math.max(0, Math.min(1, fx?.dim ?? 0));
  const bg = fx ? `rgb(${Math.round(fx.r * 255 * bri)},${Math.round(fx.g * 255 * bri)},${Math.round(fx.b * 255 * bri)})` : '#000';
  const glow = bri > 0.03 ? `0 0 ${Math.round(4 + bri * 14)}px ${bg}` : 'none';
  return (
    <div className={`lamp${round ? ' round' : ''}`} style={{ background: bg, boxShadow: glow }}>
      <i />
    </div>
  );
}

export default function LightingPreview({ lights, setFixture, toggleFlasherAuto, cueLog }) {
  if (!lights) return null;
  return (
    <div className="section">
      <header>
        <h2>Lighting Preview</h2>
        <span className="chip black">simulador</span>
      </header>
      <div className="body">
        <div className="notice">
          Ningún dispositivo físico está conectado todavía. Esto es el estado virtual.
          Los adaptadores Hue y DMX están declarados pero sin verificar.
        </div>

        <div className="fx-group">Philips Hue</div>
        <div className="fixtures">
          {FIXTURES.hue.map((f) => {
            const st = lights.hue[f.id];
            return (
              <div className="fx" key={f.id}>
                <Lamp fx={st} round={f.kind !== 'playbar'} />
                <span className="nm">{f.label}</span>
                <span className="dim">{Math.round((st?.dim ?? 0) * 100)}%</span>
              </div>
            );
          })}
        </div>

        <div className="fx-group">Iluminación escénica (DMX)</div>
        <div className="fixtures">
          {FIXTURES.dmx.map((f) => {
            const st = lights.dmx[f.id];
            const excluded = f.group === 'flasher' && !lights.flasherAuto;
            return (
              <div className={`fx${excluded ? ' excluded' : ''}`} key={f.id}>
                <Lamp fx={st} round={f.kind === 'par'} />
                <span className="nm">{f.label} <code>ch{f.ch}</code></span>
                <span className="dim">{excluded ? 'OFF' : `${Math.round((st?.dim ?? 0) * 100)}%`}</span>
              </div>
            );
          })}
        </div>

        <label className="toggle" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={lights.flasherAuto} onChange={(e) => toggleFlasherAuto(e.target.checked)} />
          Incluir Flasher 200 en reproducción automática
        </label>
        <div className="hint">
          Por defecto están excluidos y el estrobo está desactivado. Los láseres no forman
          parte de esta versión. La haze Dark Fazer es opcional: los visuales no dependen de ella.
        </div>

        <div className="cue-log">
          {cueLog.length === 0 && <div><span>sin cues todavía</span></div>}
          {cueLog.map((c, i) => (
            <div key={i}>
              <span>{c.type}{c.manual ? ' ·m' : ''}</span>
              <span>{typeof c.at === 'number' ? `${c.at.toFixed(1)}s` : ''} {c.targets ? `· ${c.targets} fx` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
