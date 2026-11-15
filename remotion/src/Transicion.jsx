import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { makeRng, range } from './lib/rng.js';

/**
 * TRANSICIÓN ENTRE MUNDOS · TR-001 … TR-005
 *
 * Tres exigencias del brief que gobiernan el diseño:
 *
 * 1. Tiene que funcionar VINIENDO DE CUALQUIER AMBIENTE. Por eso arranca con un
 *    destello que cubre el encuadre: tapa el fundido cruzado que hace el sistema,
 *    venga de donde venga.
 * 2. La estrella cruza y REPINTA el mundo nuevo. No es un fundido: el mundo
 *    aparece detrás de la estela, como si la luz lo pintara al pasar.
 * 3. Tiene que ATERRIZAR en el mundo de destino. El último segundo es ya
 *    exactamente ese mundo, para que el fundido de salida no se note.
 */
export const Transicion = ({ Destino, propsDestino = {}, sentido = 'horizontal', seed = 'tr' }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const t = frame / fps;
  const dur = durationInFrames / fps;

  // ── la estrella recorre el encuadre entre 1.2 s y 5.5 s ──
  const p = interpolate(t, [1.2, 5.5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.25, 1)
  });

  // trayectoria: cruza en diagonal, con una leve curva
  const sx = sentido === 'vertical' ? 50 + Math.sin(p * Math.PI) * 14 : -12 + p * 124;
  const sy = sentido === 'vertical' ? -12 + p * 124 : 62 - p * 28 - Math.sin(p * Math.PI) * 12;

  // ── el destello inicial, que tapa el fundido de entrada ──
  const flash = interpolate(t, [0, 0.5, 1.6], [0, 1, 0], {
    extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)
  });

  // ── revelado: el mundo aparece DETRÁS de la estela ──
  // El radio del revelado persigue a la estrella con un poco de retardo.
  const revelado = interpolate(t, [1.4, 6.2], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.2, 1)
  });
  // En CSS, `circle` con porcentaje NO es válido: el gradiente se ignora y se
  // revela todo. Hay que darle una longitud real.
  const diagonal = Math.hypot(width, height);
  const radio = revelado * diagonal * 2.8;

  // ── asentamiento: el último tramo es ya el mundo de destino, sin nada encima ──
  const residuo = interpolate(t, [5.5, dur - 1.2], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
  });

  const chispas = React.useMemo(() => {
    const r = makeRng(seed);
    return Array.from({ length: 70 }, () => ({
      d: range(r, -14, 14), perp: range(r, -9, 9),
      tam: range(r, 1.5, 5), vida: range(r, 0.25, 1),
      retardo: range(r, 0, 0.45)
    }));
  }, [seed]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070D' }}>
      {/* el mundo de destino, revelado por una máscara que sigue a la estrella */}
      <AbsoluteFill style={{
        WebkitMaskImage: `radial-gradient(circle ${radio}px at ${sx}% ${sy}%, black 0%, black 58%, transparent 82%)`,
        maskImage: `radial-gradient(circle ${radio}px at ${sx}% ${sy}%, black 0%, black 58%, transparent 82%)`
      }}>
        <Destino {...propsDestino} />
      </AbsoluteFill>

      {/* borde incandescente del revelado: es lo que hace que parezca pintado */}
      {revelado > 0.01 && revelado < 0.99 && (
        <AbsoluteFill style={{
          background: `radial-gradient(circle ${radio}px at ${sx}% ${sy}%, transparent 56%, rgba(255,217,160,0.6) 68%, transparent 84%)`,
          mixBlendMode: 'screen', opacity: 0.9
        }} />
      )}

      {/* estela */}
      {p > 0 && p < 1 && (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: residuo }}>
          {chispas.map((c, i) => {
            const pp = Math.max(0, p - c.retardo * 0.12);
            const cx = sentido === 'vertical' ? sx + c.perp : -12 + pp * 124 + c.d;
            const cy = sentido === 'vertical' ? -12 + pp * 124 + c.d : 62 - pp * 28 - Math.sin(pp * Math.PI) * 12 + c.perp;
            const fade = Math.max(0, 1 - (p - pp) * 7) * c.vida;
            return (
              <div key={i} style={{
                position: 'absolute', left: `${cx}%`, top: `${cy}%`,
                width: c.tam, height: c.tam, borderRadius: '50%',
                background: '#FFD9A0', opacity: fade * 0.85,
                boxShadow: `0 0 ${c.tam * 4}px #FFD9A0`
              }} />
            );
          })}
        </AbsoluteFill>
      )}

      {/* el núcleo de la estrella */}
      {p > 0 && p < 1 && (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: residuo }}>
          <div style={{
            position: 'absolute', left: `${sx}%`, top: `${sy}%`,
            width: 16, height: 16, borderRadius: '50%',
            background: '#FFF6E0', transform: 'translate(-50%,-50%)',
            boxShadow: '0 0 36px 14px #FFD9A0, 0 0 110px 44px rgba(255,217,160,0.6), 0 0 260px 90px rgba(255,217,160,0.25)'
          }} />
        </AbsoluteFill>
      )}

      {/* destello de entrada: tapa el fundido cruzado venga de donde venga */}
      {flash > 0.001 && (
        <AbsoluteFill style={{
          background: `radial-gradient(circle at 50% 55%, rgba(255,246,224,${flash * 0.92}) 0%, rgba(255,217,160,${flash * 0.5}) 26%, transparent 62%)`,
          mixBlendMode: 'screen'
        }} />
      )}
    </AbsoluteFill>
  );
};
