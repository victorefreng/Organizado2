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
          w: range(r, 14, 46) * (0.55 + prof * 0.9),
          h: range(r, 5, 16) * (0.55 + prof * 0.9),
          op: range(r, 0.3, 0.85) * (0.4 + prof * 0.85),
          prof,
          ciclos: 1,
          fase: r(),
          amp: (1 - prof) * 2.5 + 0.8,
          blur: 5 + (1 - prof) * 16
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
            // luz arriba, sombra abajo: es lo que le da volumen a un cúmulo
            background: `radial-gradient(ellipse at 44% 32%, ${colorLuz}${Math.round(p.op * opacidad * 255).toString(16).padStart(2, '0')} 0%, ${col}${Math.round(p.op * opacidad * 150).toString(16).padStart(2, '0')} 38%, ${colorSombra}22 62%, transparent 78%)`,
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

/**
 * Follaje en ramas.
 *
 * Repartir hojas al azar por el encuadre da confeti, no selva. El follaje real
 * crece EN RAMAS: un tallo con hojas pareadas a lo largo, decreciendo hacia la
 * punta. Aquí cada "rama" es un origen más una dirección, y las hojas se
 * colocan por pares a lo largo de ella.
 *
 * La profundidad hace el resto: las ramas de fondo van borrosas y apagadas, las
 * del frente casi negras, recortando el encuadre.
 */
export const Follaje = ({ cantidad = 90, seed = 'follaje', color = '#0E2B1C',
                          colorLuz = '#8FD6A8', desdeArriba = true, escala = 1, viento = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const ramas = useMemo(() => {
    const r = makeRng(seed);
    const nRamas = Math.max(4, Math.round(cantidad / 9));
    return Array.from({ length: nRamas }, () => {
      const prof = r();
      // las ramas entran desde los bordes, no nacen en el aire
      const borde = Math.floor(r() * 4);
      const ox = borde === 0 ? range(r, -6, 106) : borde === 1 ? -4 : borde === 2 ? range(r, -6, 106) : 104;
      const oy = borde === 0 ? (desdeArriba ? -6 : 104) : borde === 1 ? range(r, -6, 106)
               : borde === 2 ? (desdeArriba ? 104 : -6) : range(r, -6, 106);
      const ang = Math.atan2(50 - oy, 50 - ox) + range(r, -0.7, 0.7);
      const largoRama = range(r, 26, 62);
      const nHojas = Math.round(range(r, 7, 15));
      return {
        ox, oy, ang, largoRama, nHojas, prof,
        tam: range(r, 3.4, 7.2) * escala * (0.5 + prof * 0.9),
        ciclos: Math.max(1, Math.round(range(r, 1, 3))),
        fase: r(),
        amp: range(r, 0.3, 1.2),
        hojas: Array.from({ length: nHojas }, (_, k) => ({
          t: (k + 1) / nHojas,
          lado: k % 2 === 0 ? 1 : -1,
          jitter: range(r, -0.1, 0.1),
          rotJ: range(r, -16, 16),
          op: range(r, 0.65, 1)
        }))
      };
    });
  }, [cantidad, seed, desdeArriba, escala]);

  return (
    <AbsoluteFill>
      {ramas.map((rama, ri) => {
        const sway = loopSin(frame, durationInFrames, rama.ciclos, rama.fase) * rama.amp * viento;
        const col = rama.prof > 0.88 ? colorLuz : rama.prof > 0.42 ? color : '#040C06';
        return (
          <React.Fragment key={ri}>
            {rama.hojas.map((h, hi) => {
              // posición a lo largo de la rama; la punta se mueve más
              const d = h.t * rama.largoRama;
              const flex = sway * h.t * h.t * 3.2;
              const ang = rama.ang + flex * 0.02;
              const x = rama.ox + Math.cos(ang) * d + h.jitter * 2;
              const y = rama.oy + Math.sin(ang) * d * 0.62 + flex * 0.4;
              // las hojas se encogen hacia la punta
              const esc = (1 - h.t * 0.45);
              const largo = rama.tam * esc;
              const ancho = largo * 0.3;
              // cada hoja sale perpendicular a la rama, alternando lado
              const rotHoja = (ang * 180) / Math.PI + h.lado * 52 + h.rotJ + flex * 2;
              return (
                <div key={hi} style={{
                  position: 'absolute',
                  left: `${x}%`, top: `${y}%`,
                  width: `${largo}%`, height: `${ancho}%`,
                  borderRadius: '0 78% 0 78%',
                  background: `linear-gradient(100deg, ${col} 0%, ${col} 58%, rgba(0,0,0,0.42) 100%)`,
                  opacity: h.op * (0.42 + rama.prof * 0.58),
                  transform: `rotate(${rotHoja}deg)`,
                  transformOrigin: h.lado > 0 ? 'left center' : 'right center',
                  filter: `blur(${(1 - rama.prof) * 3.4}px)`
                }} />
              );
            })}
          </React.Fragment>
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

/**
 * Terciopelo.
 *
 * El error de la primera versión: pliegues de ancho constante leen como lámina
 * corrugada. El terciopelo real tiene pliegues de anchos muy distintos, con
 * sombras profundas entre ellos y crestas que atrapan la luz en rasante.
 * Se construye por acumulación: pliegues anchos de fondo, estrechos encima.
 */
export const Terciopelo = ({ pliegues = 22, seed = 'velvet', brillo = 1,
                             vino = '#4A0D16', carmesi = '#8E1226', ambar = '#D98B3A' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ps = useMemo(() => {
    const r = makeRng(seed);
    const out = [];
    let x = -8;
    while (x < 108) {
      // el ancho varía mucho de un pliegue al siguiente: eso es lo que lo salva
      const w = range(r, 1.6, 11);
      out.push({
        x, w,
        prof: r(),
        sombra: range(r, 0.35, 0.95),
        cresta: range(r, 0.15, 1),
        ciclos: 1,
        fase: r(),
        amp: range(r, 0.1, 0.45)
      });
      x += w * range(r, 0.62, 1.05);
    }
    return out;
  }, [pliegues, seed]);

  return (
    <AbsoluteFill style={{ background: '#0A0507' }}>
      {/* luz indirecta rasante: el campo base, nunca un rojo plano */}
      <AbsoluteFill style={{
        background: `linear-gradient(96deg, #1A0409 0%, ${vino} 26%, ${carmesi} 44%, ${vino} 66%, #160307 100%)`
      }} />
      {ps.map((p, i) => {
        const breathe = loopSin(frame, durationInFrames, p.ciclos, p.fase) * p.amp;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${p.x + breathe}%`, top: '-6%',
            width: `${p.w}%`, height: '112%',
            background: `linear-gradient(90deg,
              rgba(8,3,5,${0.75 * p.sombra}) 0%,
              rgba(8,3,5,${0.25 * p.sombra}) 26%,
              ${ambar}${Math.round(p.cresta * brillo * 52).toString(16).padStart(2, '0')} 48%,
              rgba(8,3,5,${0.3 * p.sombra}) 72%,
              rgba(8,3,5,${0.8 * p.sombra}) 100%)`,
            filter: `blur(${2 + p.prof * 7}px)`,
            opacity: 0.5 + p.prof * 0.5
          }} />
        );
      })}
      {/* caída del tejido: se oscurece abajo */}
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, transparent 0%, transparent 52%, rgba(8,3,5,0.6) 100%)'
      }} />
      {/* lámpara práctica cálida, fuera de centro */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 24% 54%, ${ambar}2e 0%, transparent 44%)`,
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
