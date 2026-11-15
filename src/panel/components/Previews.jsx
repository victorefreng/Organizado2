import React from 'react';

const ORDER = ['ceiling', 'environment', 'story'];

export default function Previews({ outputs, projectors, onOpen, onOpenAll, onIdentify }) {
  return (
    <div className="section">
      <header>
        <h2>Visual Engine · Salidas</h2>
        <div className="btn-row">
          <button className="btn sm" onClick={onOpenAll}>Abrir las 3</button>
        </div>
      </header>
      <div className="body">
        <div className="previews">
          {ORDER.map((s) => {
            const o = outputs[s] || {};
            const p = projectors[s];
            const st = o.stats || {};
            return (
              <div className={`preview${o.online ? '' : ' offline'}`} key={s}>
                <div className="pv-head">
                  <span>{p.label}</span>
                  <span className={`dot${o.online ? ' on' : ''}`} />
                </div>
                {o.preview
                  ? <img className="pv-img" src={o.preview} alt={p.label} />
                  : (
                    <div className="pv-none">
                      ventana cerrada<br />
                      <button className="btn sm" style={{ marginTop: 8 }} onClick={() => onOpen(s)}>Abrir</button>
                    </div>
                  )}
                <div className="pv-foot">
                  <span>{st.world || '—'}{st.transition ? ` → ${st.incoming}` : ''}</span>
                  <span className={st.fps && st.fps < 40 ? 'warn' : ''}>
                    {st.fps ? `${st.fps} fps` : '—'}
                  </span>
                </div>
                <div className="pv-foot">
                  <span>{Math.abs(st.drift ?? 0) > 0.08 ? `deriva ${(st.drift * 1000).toFixed(0)} ms` : 'en sync'}</span>
                  <button className="btn sm" onClick={() => onIdentify(s, true)} onMouseLeave={() => onIdentify(s, false)}>ID</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hint">
          En Windows: abre las tres ventanas, arrastra cada una a su proyector y pulsa <span className="kbd">F</span> para
          pantalla completa. <span className="kbd">I</span> muestra la prueba de imagen.
        </div>
      </div>
    </div>
  );
}
