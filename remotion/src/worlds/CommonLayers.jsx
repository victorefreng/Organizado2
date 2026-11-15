import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { makeRng, range } from '../lib/rng.js';
import { loopSin, loopCos, loopRamp } from '../lib/loop.js';

/**
 * Capas genéricas reutilizables por todos los mundos.
 * Todas cierran su ciclo: la duración del bucle es siempre un múltiplo entero
 * del periodo de cada animación, así el último fotograma es el primero.
 */

/** Cielo o fondo por gradiente, con un sol o foco opcional. */
export const Cielo = ({ paradas, angulo = 180, sol = null }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{
      background: `linear-gradient(${angulo}deg, ${paradas.join(', ')})`
    }} />
    {sol && (
      <AbsoluteFill style={{
        background: `radial-gradient(circle at ${sol.x}% ${sol.y}%, ${sol.color}${sol.a1 || 'cc'} 0%, ${sol.color}44 ${sol.r1 || 8}%, transparent ${sol.r2 || 42}%)`,
        mixBlendMode: 'screen'
      }} />
    )}
  </AbsoluteFill>
);

/** Nubes: parches de ruido a varias profundidades, con parallax propio. */
export const Nubes = ({ capas = 4, porCapa = 7, colorLuz = '#E6EEF8', colorSombra = '#2A3B6B',
                        opacidad = 1, seed = 'nubes', alturaBase = 55, mirandoArriba = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const parches = useMemo(() => {
    const r = makeRng(seed);
    const out = [];
    for (let c = 0; c < capas; c++) {
      const prof = c / Math.max(1, capas - 1);
      for (let i = 0; i < porCapa; i++) {
        out.push({
          x: r() * 140 - 20,
          y: alturaBase + range(r, -34, 34) * (mirandoArriba ? 1.4 : 1) - prof * 12,
          w: range(r, 26, 72) * (0.6 + prof * 0.8),
          h: range(r, 10, 26) * (0.6 + prof * 0.8),
          op: range(r, 0.16, 0.52) * (0.45 + prof * 0.7),
          prof,
          ciclos: 1,
          fase: r(),
          amp: (1 - prof) * 2.5 + 0.8,
          blur: 14 + (1 - prof) * 26
        });
      }
    }
    return out;
  }, [capas, porCapa, seed, alturaBase, mirandoArriba]);

  return (
    <AbsoluteFill>
      {parches.map((p, i) => {
        const dx = loopSin(frame, durationInFrames, p.ciclos, p.fase) * p.amp * 4;
        const dy = loopCos(frame, durationInFrames, p.ciclos, p.fase * 1.4) * p.amp;
        const col = p.prof > 0.5 ? colorLuz : colorSombra;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.x + dx}%`, top: `${p.y + dy}%`,
            width: `${p.w}%`, height: `${p.h}%`,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at 42% 38%, ${col}${Math.round(p.op * opacidad * 255).toString(16).padStart(2, '0')} 0%, ${col}22 46%, transparent 72%)`,
            filter: `blur(${p.blur}px)`
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Campo de estrellas con centelleo. */
export const Estrellas = ({ cantidad = 420, seed = 'estrellas', color = '#FFE9B0', brillo = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const es = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => {
      const mag = Math.pow(r(), 3.2);
      return {
        x: r() * 100, y: r() * 100,
        tam: 0.6 + mag * 3.4,
        op: 0.25 + mag * 0.75,
        ciclos: Math.max(1, Math.round(range(r, 1, 8))),
        fase: r(),
        calida: r() < 0.7
      };
    });
  }, [cantidad, seed]);
  return (
    <AbsoluteFill>
      {es.map((s, i) => {
        const tw = 0.7 + 0.3 * (0.5 + 0.5 * loopSin(frame, durationInFrames, s.ciclos, s.fase));
        const c = s.calida ? color : '#BFD9FF';
        return (
          <div key={i} style={{
            position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
            width: s.tam, height: s.tam, borderRadius: '50%',
            background: c, opacity: s.op * tw * brillo,
            boxShadow: s.tam > 2 ? `0 0 ${s.tam * 4}px ${c}` : 'none'
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Nebulosa: parches de color a distintas profundidades. */
export const Nebulosa = ({ parches = 26, colores = ['#B06BFF', '#5FD8FF', '#2B1B4D'],
                           opacidad = 1, seed = 'nebulosa' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ps = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: parches }, () => ({
      x: r() * 120 - 10, y: r() * 120 - 10,
      w: range(r, 24, 78), h: range(r, 18, 56),
      op: range(r, 0.06, 0.22),
      col: colores[Math.floor(r() * colores.length)],
      ciclos: 1, fase: r(), amp: range(r, 0.8, 3),
      blur: range(r, 30, 80)
    }));
  }, [parches, seed, colores]);
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {ps.map((p, i) => {
        const dx = loopSin(frame, durationInFrames, p.ciclos, p.fase) * p.amp;
        const dy = loopCos(frame, durationInFrames, p.ciclos, p.fase * 1.6) * p.amp;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${p.x + dx}%`, top: `${p.y + dy}%`,
            width: `${p.w}%`, height: `${p.h}%`, borderRadius: '50%',
            background: `radial-gradient(ellipse at 45% 42%, ${p.col}${Math.round(p.op * opacidad * 255).toString(16).padStart(2, '0')} 0%, transparent 68%)`,
            filter: `blur(${p.blur}px)`
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Follaje: hojas en silueta, con viento. Sirve de dosel o de sotobosque. */
export const Follaje = ({ cantidad = 90, seed = 'follaje', color = '#0E2B1C',
                          colorLuz = '#8FD6A8', desdeArriba = true, escala = 1, viento = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const hojas = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 110 - 5,
      y: desdeArriba ? range(r, -14, 46) : range(r, 54, 112),
      w: range(r, 5, 20) * escala,
      h: range(r, 2.5, 9) * escala,
      rot: range(r, -70, 70),
      op: range(r, 0.45, 1),
      prof: r(),
      ciclos: Math.max(1, Math.round(range(r, 1, 3))),
      fase: r(),
      amp: range(r, 0.4, 1.8)
    }));
  }, [cantidad, seed, desdeArriba, escala]);
  return (
    <AbsoluteFill>
      {hojas.map((h, i) => {
        const sway = loopSin(frame, durationInFrames, h.ciclos, h.fase) * h.amp * viento;
        const col = h.prof > 0.78 ? colorLuz : color;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${h.x + sway}%`, top: `${h.y + sway * 0.3}%`,
            width: `${h.w}%`, height: `${h.h}%`,
            borderRadius: '70% 30% 70% 30%',
            background: col,
            opacity: h.op * (0.35 + h.prof * 0.65),
            transform: `rotate(${h.rot + sway * 3}deg)`,
            filter: `blur(${(1 - h.prof) * 5}px)`
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Luciérnagas: pulso corto y largo apagado, deriva suave. */
export const Luciernagas = ({ cantidad = 60, seed = 'luciernagas', color = '#FFD9A0' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ls = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 100, y: range(r, 25, 95),
      tam: range(r, 2, 5),
      ciclos: Math.max(2, Math.round(range(r, 2, 7))),
      fase: r(),
      amp: range(r, 1.5, 5)
    }));
  }, [cantidad, seed]);
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {ls.map((l, i) => {
        const base = 0.5 + 0.5 * loopSin(frame, durationInFrames, l.ciclos, l.fase);
        const blink = Math.pow(base, 5);     // encendido corto, apagado largo
        const dx = loopSin(frame, durationInFrames, 1, l.fase) * l.amp;
        const dy = loopCos(frame, durationInFrames, 1, l.fase * 1.3) * l.amp * 0.6;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${l.x + dx}%`, top: `${l.y + dy}%`,
            width: l.tam, height: l.tam, borderRadius: '50%',
            background: color, opacity: blink,
            boxShadow: `0 0 ${l.tam * 5}px ${color}`
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Terciopelo: pliegues verticales con luz rasante. Para el Red Room. */
export const Terciopelo = ({ pliegues = 22, seed = 'velvet', brillo = 1,
                             vino = '#4A0D16', carmesi = '#8E1226', ambar = '#D98B3A' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ps = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: pliegues }, (_, i) => ({
      x: (i / pliegues) * 104 - 2,
      w: 104 / pliegues * range(r, 0.85, 1.5),
      op: range(r, 0.3, 1),
      ciclos: 1, fase: r(),
      amp: range(r, 0.15, 0.5)
    }));
  }, [pliegues, seed]);
  return (
    <AbsoluteFill style={{ background: '#0A0507' }}>
      {/* luz rasante indirecta: nunca un rojo plano */}
      <AbsoluteFill style={{
        background: `linear-gradient(100deg, ${vino} 0%, ${carmesi} 34%, ${vino} 62%, #2B060D 100%)`
      }} />
      {ps.map((p, i) => {
        const breathe = loopSin(frame, durationInFrames, p.ciclos, p.fase) * p.amp;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${p.x + breathe}%`, top: '-4%',
            width: `${p.w}%`, height: '108%',
            background: `linear-gradient(90deg, rgba(10,5,7,0.72) 0%, ${carmesi}00 38%, ${ambar}${Math.round(p.op * brillo * 60).toString(16).padStart(2, '0')} 52%, rgba(10,5,7,0.68) 100%)`,
            filter: 'blur(6px)'
          }} />
        );
      })}
      {/* lámpara práctica cálida */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 22% 58%, ${ambar}33 0%, transparent 46%)`,
        mixBlendMode: 'screen'
      }} />
    </AbsoluteFill>
  );
};

/** Bokeh: círculos desenfocados. Calidez y profundidad sin coste. */
export const Bokeh = ({ cantidad = 22, seed = 'bokeh', color = '#D98B3A', opacidad = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const bs = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 100, y: r() * 100,
      tam: range(r, 18, 90),
      op: range(r, 0.04, 0.16),
      ciclos: 1, fase: r(), amp: range(r, 0.6, 3)
    }));
  }, [cantidad, seed]);
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {bs.map((b, i) => {
        const dx = loopSin(frame, durationInFrames, b.ciclos, b.fase) * b.amp;
        const dy = loopCos(frame, durationInFrames, b.ciclos, b.fase * 1.5) * b.amp;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${b.x + dx}%`, top: `${b.y + dy}%`,
            width: b.tam, height: b.tam, borderRadius: '50%',
            background: `radial-gradient(circle, ${color}${Math.round(b.op * opacidad * 255).toString(16).padStart(2, '0')} 0%, ${color}10 58%, transparent 74%)`,
            filter: 'blur(5px)'
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Polvo en suspensión iluminado en rasante. */
export const Polvo = ({ cantidad = 150, seed = 'polvo', color = '#FFD9A0', opacidad = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ps = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 100, y: r() * 100,
      tam: range(r, 0.8, 2.6),
      op: range(r, 0.08, 0.4),
      ciclos: 1, fase: r(), amp: range(r, 2, 9)
    }));
  }, [cantidad, seed]);
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {ps.map((p, i) => {
        const dy = -loopRamp(frame, durationInFrames, 1, p.fase) * p.amp * 2 + p.amp;
        const dx = loopSin(frame, durationInFrames, 1, p.fase * 1.2) * p.amp * 0.4;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${p.x + dx}%`, top: `${p.y + dy}%`,
            width: p.tam, height: p.tam, borderRadius: '50%',
            background: color, opacity: p.op * opacidad
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Grado y viñeta comunes. */
export const Grado = ({ vineta = 0.55, tinte = 'rgba(5,7,13,' }) => (
  <>
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 46%, transparent 32%, ${tinte}${0.62 * vineta}) 100%)`,
      pointerEvents: 'none'
    }} />
  </>
);
