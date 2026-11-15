import React, { useState } from 'react';
import { MEMORIES, MESSAGES, MEMORY_ANIMATIONS } from '../../config/memories.js';

export default function MediaManager({ message, applyMessage, audio, assetReport, sendInteract }) {
  const [draft, setDraft] = useState(message);
  const placeholders = MEMORIES.filter((m) => m.placeholder).length;

  return (
    <>
      <div className="section">
        <header>
          <h2>Media Manager · Recuerdos</h2>
          <span className="chip">{MEMORIES.length} entradas</span>
        </header>
        <div className="body">
          {placeholders > 0 && (
            <div className="notice">
              {placeholders} de {MEMORIES.length} son placeholders generados proceduralmente.
              No son fotografías reales. Para sustituirlas: copia los archivos en
              <code> /public/assets/memories/</code>, actualiza <code>src/config/memories.js</code>
              y pon <code>placeholder: false</code>.
            </div>
          )}
          <div className="media-list">
            {MEMORIES.map((m) => (
              <div className="media-item" key={m.id}>
                <img src={m.src} alt={m.title} />
                <div>
                  <div className="mi-name">{m.title}</div>
                  <div className="mi-meta">
                    {m.id} · {m.animation} · {m.world} · {m.screenDuration}s
                  </div>
                  <div className="mi-meta">{m.message || '—'}</div>
                </div>
                <div style={{ display: 'grid', gap: 5, justifyItems: 'end' }}>
                  <span className={`badge${m.placeholder ? '' : ' ok'}`}>
                    {m.placeholder ? 'placeholder' : 'real'}
                  </span>
                  <button className="btn sm" onClick={() => sendInteract({ type: 'pick-memory', memoryId: m.id })}>
                    Ir a
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hint">
            Las fotografías conservan su relación de aspecto original: el marco orgánico se
            adapta a la imagen, nunca al contrario. Animaciones disponibles:
            {' '}{MEMORY_ANIMATIONS.join(', ')}.
          </div>
        </div>
      </div>

      <div className="section">
        <header><h2>Mensajes editables</h2></header>
        <div className="body">
          <div className="ctrl">
            <label>Título del show</label>
            <input type="text" value={MESSAGES.title} readOnly />
          </div>
          <div className="ctrl">
            <label>Mensaje final</label>
            <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </div>
          <div className="btn-row">
            <button className="btn sm" onClick={() => applyMessage(draft)}>Aplicar a las salidas</button>
            <button className="btn sm" onClick={() => { setDraft(MESSAGES.finalMessage); applyMessage(MESSAGES.finalMessage); }}>
              Restaurar
            </button>
          </div>
          <div className="hint">
            El título se forma con partículas de la estrella. El mensaje usa tipografía
            ligera con tracking amplio, y se puede cambiar en caliente.
          </div>
        </div>
      </div>

      <div className="section">
        <header><h2>Audio</h2></header>
        <div className="body">
          <table className="kv">
            <tbody>
              {(audio?.inventory || []).map((l) => (
                <tr key={l.name}>
                  <td>{l.name}</td>
                  <td className="num" style={{ color: l.source === 'archivo' ? 'var(--go)' : 'var(--hold)' }}>
                    {l.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hint">
            Las capas marcadas como <b>sintetizado (temporal)</b> se generan con WebAudio para
            que el show suene desde el primer arranque. Para sustituirlas, copia un archivo con
            el nombre de la capa en <code>/public/assets/audio/</code> (ogg, mp3 o wav).
            Cero dependencia de internet durante la reproducción.
          </div>
        </div>
      </div>

      {assetReport && (
        <div className="section">
          <header>
            <h2>Assets externos pendientes</h2>
            <span className="chip">{assetReport.models.filter((m) => !m.present).length} por producir</span>
          </header>
          <div className="body">
            <table className="kv">
              <tbody>
                {assetReport.models.map((m) => (
                  <tr key={m.key}>
                    <td>{m.key}</td>
                    <td className="num" style={{ color: m.present ? 'var(--go)' : 'var(--text-faint)' }}>
                      {m.present ? 'GLB cargado' : m.procedural ? 'procedural' : 'falta'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="hint">
              Todo lo marcado <b>procedural</b> funciona hoy con geometría generada por código.
              Al copiar el GLB en la ruta del manifiesto, el motor lo usa sin cambiar código de escena.
              Ver <code>docs/04-assets.md</code>.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
