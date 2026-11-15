import React from 'react';

/**
 * Paquetes de plano producidos con el flujo Runway.
 * Al cargar uno, el reloj pasa a gobernar la reproducción de los tres vídeos y
 * sus cues, con el mismo GO/HOLD/BACK que el opening.
 */
export default function PackageLoader({ packages, activePackage, loadPackage, unloadPackage, outputs }) {
  const clipStats = ['story', 'environment', 'ceiling']
    .map((s) => ({ s, c: outputs[s]?.stats?.clip }))
    .filter((x) => x.c);

  return (
    <div className="section">
      <header>
        <h2>Paquetes de plano</h2>
        {activePackage && <span className="chip on">{activePackage.name}</span>}
      </header>
      <div className="body">
        {packages.length === 0 && (
          <div className="notice dim">
            No hay paquetes producidos. Genera uno con{' '}
            <code>npm run produce production/ocean-test/shot.json</code>.
          </div>
        )}

        <div className="media-list">
          {packages.map((p) => {
            const on = activePackage?.id === p.id;
            return (
              <div className="media-item" key={p.id} style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="mi-name">{p.name}</div>
                  <div className="mi-meta">
                    {p.duration}s · {p.chapter}
                    {' · '}
                    <span style={{ color: p.usingRealClip ? 'var(--go)' : 'var(--hold)' }}>
                      {p.usingRealClip ? 'clip real' : 'sustituto'}
                    </span>
                  </div>
                </div>
                <button className={`btn sm${on ? ' active' : ''}`}
                        onClick={() => (on ? unloadPackage() : loadPackage(p))}>
                  {on ? 'descargar' : 'cargar'}
                </button>
              </div>
            );
          })}
        </div>

        {activePackage && (
          <>
            <div className="fx-group" style={{ marginTop: 12 }}>Reparto por proyector</div>
            <table className="kv">
              <tbody>
                <tr><td>P3 Story</td><td className="num">MAIN</td></tr>
                <tr><td>P2 Environment</td><td className="num">ENVIRONMENT</td></tr>
                <tr><td>P1 Ceiling</td><td className="num">CEILING</td></tr>
                <tr><td>Audio</td><td className="num">fuente única</td></tr>
                <tr><td>Timecode</td><td className="num">{activePackage.startTimecode} · {activePackage.fps} fps</td></tr>
              </tbody>
            </table>

            {clipStats.length > 0 && (
              <>
                <div className="fx-group" style={{ marginTop: 10 }}>Deriva de vídeo</div>
                <table className="kv">
                  <tbody>
                    {clipStats.map(({ s, c }) => (
                      <tr key={s}>
                        <td>{s}</td>
                        <td className="num" style={{ color: Math.abs(c.drift) > 0.12 ? 'var(--hold)' : 'var(--go)' }}>
                          {(c.drift * 1000).toFixed(0)} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="fx-group" style={{ marginTop: 10 }}>Cues del plano</div>
            <table className="kv">
              <tbody>
                {activePackage.cues.map((c) => (
                  <tr key={c.number}>
                    <td>{c.timecode} · {c.name}</td>
                    <td className="num">{c.light.cue}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="btn-row" style={{ marginTop: 10 }}>
              <a className="btn sm" href={activePackage.files.cuesCsv} download>CSV de cues</a>
              <a className="btn sm" href={activePackage.files.cuesMa2} download>XML grandMA2</a>
              <a className="btn sm" href={activePackage.files.ltc} download>LTC</a>
            </div>
            <div className="hint">
              El LTC es una pista de audio SMPTE {activePackage.fps} fps: la consola la chasea por
              entrada de audio. El XML de grandMA2 no está verificado en consola todavía.
            </div>
            {!activePackage.usingRealClip && (
              <div className="notice" style={{ marginTop: 10 }}>
                MAIN es el sustituto generado con el motor, no el clip de Runway.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
