import React from 'react';

const ORDER = ['ceiling', 'environment', 'story'];

export default function ProjectorManager({ projectors, outputs, updateProjector, identify, openOutput }) {
  return (
    <div className="section">
      <header><h2>Projector Manager</h2></header>
      <div className="body">
        <div className="notice info">
          Cada salida es una cámara dentro del mismo stage virtual, no un recorte de un video.
          Ajustando <b>yaw/pitch</b> y <b>offset</b> se define dónde mira cada proyector, y por eso
          una ballena puede cruzar de STORY al techo. Los valores definitivos se fijan cuando
          tengamos las dimensiones de la habitación.
        </div>

        {ORDER.map((s) => {
          const p = projectors[s];
          const o = outputs[s] || {};
          const st = o.stats || {};
          return (
            <div className="proj-card" key={s}>
              <h3>{p.label} {o.online ? '· en línea' : '· cerrada'}</h3>

              <div className="row3" style={{ marginBottom: 8 }}>
                <div>
                  <label style={{ font: '400 9px var(--mono)', color: 'var(--text-faint)' }}>Ancho</label>
                  <input type="number" value={p.resolution.width}
                         onChange={(e) => updateProjector(s, { resolution: { ...p.resolution, width: +e.target.value } })} />
                </div>
                <div>
                  <label style={{ font: '400 9px var(--mono)', color: 'var(--text-faint)' }}>Alto</label>
                  <input type="number" value={p.resolution.height}
                         onChange={(e) => updateProjector(s, { resolution: { ...p.resolution, height: +e.target.value } })} />
                </div>
                <div>
                  <label style={{ font: '400 9px var(--mono)', color: 'var(--text-faint)' }}>FOV</label>
                  <input type="number" value={p.fov}
                         onChange={(e) => updateProjector(s, { fov: +e.target.value })} />
                </div>
              </div>

              <div className="ctrl">
                <label>Yaw (izq/der) <span className="val">{p.euler.yaw}°</span></label>
                <input type="range" min="-180" max="180" step="1" value={p.euler.yaw}
                       onChange={(e) => updateProjector(s, { euler: { ...p.euler, yaw: +e.target.value } })} />
              </div>
              <div className="ctrl">
                <label>Pitch (arriba/abajo) <span className="val">{p.euler.pitch}°</span></label>
                <input type="range" min="-90" max="90" step="1" value={p.euler.pitch}
                       onChange={(e) => updateProjector(s, { euler: { ...p.euler, pitch: +e.target.value } })} />
              </div>
              <div className="ctrl">
                <label>Roll <span className="val">{p.euler.roll}°</span></label>
                <input type="range" min="-45" max="45" step="1" value={p.euler.roll}
                       onChange={(e) => updateProjector(s, { euler: { ...p.euler, roll: +e.target.value } })} />
              </div>

              <div className="row3">
                {['x', 'y', 'z'].map((ax) => (
                  <div className="ctrl" key={ax}>
                    <label>Offset {ax.toUpperCase()} <span className="val">{p.offset[ax].toFixed(2)}</span></label>
                    <input type="range" min="-6" max="6" step="0.05" value={p.offset[ax]}
                           onChange={(e) => updateProjector(s, { offset: { ...p.offset, [ax]: +e.target.value } })} />
                  </div>
                ))}
              </div>

              <div className="row2">
                <div className="ctrl">
                  <label>Brillo <span className="val">{p.brightness.toFixed(2)}</span></label>
                  <input type="range" min="0.2" max="1.5" step="0.01" value={p.brightness}
                         onChange={(e) => updateProjector(s, { brightness: +e.target.value })} />
                </div>
                <div className="ctrl">
                  <label>Gamma <span className="val">{p.gamma.toFixed(2)}</span></label>
                  <input type="range" min="0.6" max="2.2" step="0.01" value={p.gamma}
                         onChange={(e) => updateProjector(s, { gamma: +e.target.value })} />
                </div>
              </div>

              <div className="btn-row" style={{ marginBottom: 8 }}>
                <label className="toggle">
                  <input type="checkbox" checked={p.flipH}
                         onChange={(e) => updateProjector(s, { flipH: e.target.checked })} />
                  Voltear H
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={p.flipV}
                         onChange={(e) => updateProjector(s, { flipV: e.target.checked })} />
                  Voltear V
                </label>
              </div>

              <div className="fx-group">Calibración · esquinas (keystone)</div>
              <div className="row2">
                {[['tl', 'Sup. izq.'], ['tr', 'Sup. der.'], ['bl', 'Inf. izq.'], ['br', 'Inf. der.']].map(([k, label]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 5 }}>
                    <input type="number" step="0.005" value={p.keystone[k][0]}
                           title={`${label} X`}
                           onChange={(e) => updateProjector(s, {
                             keystone: { ...p.keystone, [k]: [+e.target.value, p.keystone[k][1]] }
                           })} />
                    <input type="number" step="0.005" value={p.keystone[k][1]}
                           title={`${label} Y`}
                           onChange={(e) => updateProjector(s, {
                             keystone: { ...p.keystone, [k]: [p.keystone[k][0], +e.target.value] }
                           })} />
                  </div>
                ))}
              </div>

              <div className="btn-row" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={() => openOutput(s)}>Abrir ventana</button>
                <button className="btn sm"
                        onMouseDown={() => identify(s, true)}
                        onMouseUp={() => identify(s, false)}
                        onMouseLeave={() => identify(s, false)}>
                  Prueba de imagen
                </button>
                <button className="btn sm" onClick={() => updateProjector(s, {
                  keystone: { tl: [0, 0], tr: [1, 0], br: [1, 1], bl: [0, 1] }
                })}>Reiniciar keystone</button>
              </div>

              {o.online && (
                <table className="kv" style={{ marginTop: 8 }}>
                  <tbody>
                    <tr><td>Mundo</td><td className="num">{st.world || '—'}</td></tr>
                    <tr><td>FPS</td><td className="num">{st.fps ?? '—'}</td></tr>
                    <tr><td>Draw calls</td><td className="num">{st.calls ?? '—'}</td></tr>
                    <tr><td>Triángulos</td><td className="num">{st.triangles?.toLocaleString() ?? '—'}</td></tr>
                    <tr><td>Deriva</td><td className="num">{st.drift !== undefined ? `${(st.drift * 1000).toFixed(0)} ms` : '—'}</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
