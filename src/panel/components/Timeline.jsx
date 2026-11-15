import React, { useMemo, useRef } from 'react';

function tc(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const ss = Math.floor(Math.max(0, s) % 60);
  const f = Math.floor((Math.max(0, s) % 1) * 25);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export default function Timeline({ show, snap, onSeek, onScene }) {
  const trackRef = useRef(null);
  const D = show.duration;

  const cues = useMemo(() => {
    const out = [];
    for (const s of show.scenes) for (const c of s.cues || []) out.push({ ...c, scene: s.id });
    return out;
  }, [show]);

  const curIdx = show.scenes.findIndex((s) => s.id === snap.sceneId);
  const cur = show.scenes[curIdx] || show.scenes[0];
  const next = show.scenes[curIdx + 1];
  const transitions = useMemo(
    () => show.scenes.filter((s) => s.transitionIn || s.transitionOut),
    [show]
  );

  const seekAt = (e) => {
    const r = trackRef.current.getBoundingClientRect();
    onSeek(((e.clientX - r.left) / r.width) * D);
  };

  const pct = (t) => `${(t / D) * 100}%`;

  return (
    <div className="tl">
      <div className="tl-head">
        <span className="now">Escena <span className="n">{cur.number} · {cur.name}</span></span>
        <span className="nxt">{next ? `siguiente: ${next.number} ${next.name}` : 'final del show'}</span>
        <span className="nxt">
          {cur.transitionIn ? `entrada: ${cur.transitionIn.via} ${cur.transitionIn.duration}s` : ''}
          {cur.transitionOut ? ` · salida: ${cur.transitionOut.via} ${cur.transitionOut.duration}s` : ''}
        </span>
        <div style={{ flex: 1 }} />
        <span className="nxt">restante {tc(D - snap.showTime)}</span>
        <span className="nxt">escena {tc(snap.showTime - cur.start)} / {tc(cur.end - cur.start)}</span>
      </div>

      <div className="tl-track" ref={trackRef} onClick={seekAt}>
        <div className="tl-scenes">
          {show.scenes.map((s) => {
            const w = ((s.end - s.start) / D) * 100;
            const isCur = s.id === snap.sceneId;
            const fill = isCur
              ? Math.max(0, Math.min(1, (snap.showTime - s.start) / (s.end - s.start)))
              : (snap.showTime >= s.end ? 1 : 0);
            return (
              <div className={`tl-scene${isCur ? ' cur' : ''}`} key={s.id}
                   style={{ width: `${w}%` }}
                   onDoubleClick={(e) => { e.stopPropagation(); onScene(s.id); }}
                   title={`${s.number} ${s.name} · ${s.world} · ${s.note || ''}`}>
                <div className="fill" style={{ width: `${fill * 100}%` }} />
                <span className="num">{s.number}</span>
                <span className="nm">{s.name}</span>
              </div>
            );
          })}
        </div>

        <div className="tl-cues">
          {cues.map((c, i) => (
            <div className={`tl-cue${snap.showTime >= c.t ? ' fired' : ''}`} key={i}
                 style={{ left: pct(c.t) }} title={`${c.type} @ ${tc(c.t)}`} />
          ))}
        </div>

        <div className="tl-markers">
          {show.markers.map((m, i) => {
            const hot = Math.abs(snap.showTime - m.t) < 4;
            return (
              <div className={`tl-marker${hot ? ' hot' : ''}`} key={i} style={{ left: pct(m.t) }}>
                {m.label}
              </div>
            );
          })}
        </div>

        <div className="tl-playhead" style={{ left: pct(snap.showTime) }} />
      </div>
    </div>
  );
}

export { tc };
