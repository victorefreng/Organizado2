import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { makeRng, range } from '../lib/rng.js';
import { loopSin, loopCos, loopRamp } from '../lib/loop.js';

const PAL = {
  abyss: '#01121C',
  base: '#021E2E',
  mid: '#063D56',
  surface: '#0A6E8C',
  caustic: '#7FE3FF',
  biolum: '#6AFFD8',
  rays: '#E8F7FF'
};

/** Degradado de profundidad: la base sobre la que se apoya todo. */
export const Profundidad = ({ desde = 'surface', hacia = 'abyss', angulo = 180 }) => (
  <AbsoluteFill style={{
    background: `linear-gradient(${angulo}deg, ${PAL[desde]} 0%, ${PAL.mid} 38%, ${PAL[hacia]} 100%)`
  }} />
);

/**
 * Rayos de luz. Son conos de gradiente que respiran; el ciclo divide el bucle,
 * así que al final están exactamente como al principio.
 */
export const Rayos = ({ cantidad = 7, intensidad = 1, desdeArriba = true, seed = 'rayos' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const rayos = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, (_, i) => ({
      x: range(r, -10, 110),
      ancho: range(r, 4, 16),
      inclina: range(r, -22, 22),
      op: range(r, 0.05, 0.16),
      ciclos: Math.max(1, Math.round(range(r, 1, 3))),
      fase: r(),
      largo: range(r, 0.75, 1.15)
    }));
  }, [cantidad, seed]);

  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {rayos.map((ray, i) => {
        const respira = 0.72 + 0.28 * (0.5 + 0.5 * loopSin(frame, durationInFrames, ray.ciclos, ray.fase));
        const desvia = loopSin(frame, durationInFrames, ray.ciclos, ray.fase + 0.25) * 1.6;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${ray.x + desvia}%`,
            top: desdeArriba ? '-18%' : 'auto',
            bottom: desdeArriba ? 'auto' : '-18%',
            width: `${ray.ancho}%`,
            height: `${ray.largo * 118}%`,
            transform: `rotate(${ray.inclina}deg)`,
            transformOrigin: desdeArriba ? 'top center' : 'bottom center',
            background: `linear-gradient(${desdeArriba ? 180 : 0}deg, ${PAL.rays}00 0%, ${PAL.rays}${Math.round(ray.op * intensidad * respira * 255).toString(16).padStart(2, '0')} 14%, ${PAL.rays}00 86%)`,
            filter: 'blur(22px)'
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Cáusticas: la red de luz de la superficie. Dos capas de ruido SVG que se
 * desplazan a ritmos distintos; ambos ciclos cierran.
 */
export const Causticas = ({ intensidad = 1, escala = 1, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const capas = [
    { ciclos: 1, op: 0.22, freq: 0.012 * escala, blur: 9 },
    { ciclos: 2, op: 0.13, freq: 0.022 * escala, blur: 5 }
  ];
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {capas.map((c, i) => {
        const dx = loopSin(frame, durationInFrames, c.ciclos, i * 0.33) * 5;
        const dy = loopCos(frame, durationInFrames, c.ciclos, i * 0.21) * 4;
        return (
          <svg key={i} width="100%" height="100%"
            style={{ position: 'absolute', opacity: c.op * intensidad, filter: `blur(${c.blur}px)` }}>
            <defs>
              <filter id={`caus${i}`} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise"
                  baseFrequency={`${c.freq} ${c.freq * 1.6}`}
                  numOctaves="2" seed={seed + i}>
                  <animate attributeName="baseFrequency" dur="1s" values={`${c.freq};${c.freq}`} />
                </feTurbulence>
                {/* el umbral convierte el ruido en la red luminosa */}
                <feColorMatrix type="matrix" values="
                  0 0 0 0 0.5  0 0 0 0 0.89  0 0 0 0 1  0 0 0 2.6 -1.5" />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter={`url(#caus${i})`}
              transform={`translate(${dx} ${dy})`} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/** Partículas en suspensión: plancton. Cada una cierra su propio ciclo. */
export const Particulas = ({ cantidad = 160, color = PAL.rays, tamMax = 3.2, seed = 'plancton' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ps = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 100, y: r() * 100,
      tam: range(r, 0.6, tamMax),
      op: range(r, 0.12, 0.6),
      ciclos: Math.max(1, Math.round(range(r, 1, 4))),
      fase: r(),
      amp: range(r, 1.5, 7),
      brilloCiclos: Math.max(1, Math.round(range(r, 1, 6)))
    }));
  }, [cantidad, tamMax, seed]);

  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {ps.map((p, i) => {
        const dx = loopSin(frame, durationInFrames, p.ciclos, p.fase) * p.amp;
        const dy = loopCos(frame, durationInFrames, p.ciclos, p.fase * 1.7) * p.amp * 0.6;
        const brillo = 0.45 + 0.55 * (0.5 + 0.5 * loopSin(frame, durationInFrames, p.brilloCiclos, p.fase));
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.x + dx}%`, top: `${p.y + dy}%`,
            width: p.tam, height: p.tam, borderRadius: '50%',
            background: color, opacity: p.op * brillo,
            boxShadow: `0 0 ${p.tam * 3}px ${color}`
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Banco de peces: siluetas que derivan en grupo, sin dirección delatora. */
export const Peces = ({ cantidad = 90, seed = 'peces', escala = 1, densidad = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const peces = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 100, y: range(r, 15, 85),
      tam: range(r, 3, 9) * escala,
      op: range(r, 0.18, 0.5),
      ciclos: 1,
      fase: r(),
      amp: range(r, 7, 18),
      ampY: range(r, 1.5, 5),
      vis: r()
    }));
  }, [cantidad, escala, seed]);

  return (
    <AbsoluteFill>
      {peces.filter((p) => p.vis <= densidad).map((p, i) => {
        const dx = loopSin(frame, durationInFrames, p.ciclos, p.fase) * p.amp;
        const dy = loopCos(frame, durationInFrames, p.ciclos, p.fase * 1.3) * p.ampY;
        // el pez mira hacia donde va: la derivada del seno es el coseno
        const dir = loopCos(frame, durationInFrames, p.ciclos, p.fase);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.x + dx}%`, top: `${p.y + dy}%`,
            width: p.tam, height: p.tam * 0.34,
            background: `linear-gradient(90deg, ${PAL.abyss}00, ${PAL.caustic}bb 40%, ${PAL.rays}dd 70%, ${PAL.abyss}00)`,
            borderRadius: '50%',
            opacity: p.op,
            transform: `scaleX(${dir >= 0 ? 1 : -1})`,
            filter: 'blur(0.4px)'
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Medusas: campanas que pulsan y ascienden, cerrando el ciclo. */
export const Medusas = ({ cantidad = 7, seed = 'medusas' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ms = useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 100, y: range(r, 10, 85),
      tam: range(r, 22, 64),
      op: range(r, 0.1, 0.26),
      pulsos: Math.max(2, Math.round(range(r, 2, 6))),
      fase: r(),
      amp: range(r, 2, 7)
    }));
  }, [cantidad, seed]);

  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen' }}>
      {ms.map((m, i) => {
        const pulso = loopSin(frame, durationInFrames, m.pulsos, m.fase);
        const dy = loopCos(frame, durationInFrames, 1, m.fase) * m.amp;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${m.x}%`, top: `${m.y + dy}%`,
            width: m.tam, height: m.tam * (0.62 + pulso * 0.1),
            borderRadius: '50% 50% 42% 42%',
            background: `radial-gradient(ellipse at 50% 28%, ${PAL.biolum}55 0%, ${PAL.biolum}22 48%, transparent 72%)`,
            opacity: m.op * (0.7 + 0.3 * (0.5 + 0.5 * pulso)),
            filter: 'blur(2.5px)'
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Grado y viñeta finales. Lo que une todas las capas en una sola imagen. */
export const Grado = ({ contraste = 1.04, saturacion = 1.02, brillo = 1, vineta = 0.55 }) => (
  <>
    <AbsoluteFill style={{
      boxShadow: `inset 0 0 ${220 * vineta}px ${90 * vineta}px rgba(1,10,18,${0.5 * vineta})`,
      pointerEvents: 'none'
    }} />
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 46%, transparent 32%, rgba(1,12,20,${0.62 * vineta}) 100%)`,
      pointerEvents: 'none'
    }} />
  </>
);

export { PAL };
