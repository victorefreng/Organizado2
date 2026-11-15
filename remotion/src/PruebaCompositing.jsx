import React from 'react';
import {
  AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame,
  useVideoConfig, interpolate, Easing, Sequence
} from 'remotion';

/**
 * Prueba de lo único que importa decidir: si Remotion puede componer un clip de
 * fondo (stock o Runway) con el elemento de la estrella en modo screen y con
 * texto encima, y sacarlo en el formato de entrega.
 */
export const PruebaCompositing = ({ titulo, mensaje }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // El texto entra con las partículas, no de golpe
  const tituloOp = interpolate(frame, [fps * 3, fps * 4.5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)
  });
  const tituloBlur = interpolate(frame, [fps * 3, fps * 4.5], [14, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
  });
  const mensajeOp = interpolate(frame, [fps * 5, fps * 6.2], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
  });
  // Respiración 2.5D sobre el fondo
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05070D' }}>
      {/* 1 · fondo: aquí irá el clip de stock o de Runway */}
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <OffthreadVideo src={staticFile('fondo.mp4')} muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>

      {/* 2 · la estrella en modo screen: por eso se renderiza sobre negro */}
      <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.95 }}>
        <OffthreadVideo src={staticFile('star.mp4')} muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>

      {/* 3 · viñeta, que integra todo */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse at 50% 48%, transparent 38%, rgba(5,7,13,0.72) 100%)'
      }} />

      {/* 4 · tipografía: una familia, peso ligero, tracking amplio */}
      <Sequence from={fps * 3}>
        <AbsoluteFill style={{
          justifyContent: 'center', alignItems: 'center', flexDirection: 'column'
        }}>
          <div style={{
            fontFamily: 'Inter, Helvetica, Arial, sans-serif',
            fontWeight: 200, fontSize: 72, letterSpacing: '0.34em',
            color: '#FFD9A0', opacity: tituloOp,
            filter: `blur(${tituloBlur}px)`,
            textShadow: '0 0 60px rgba(255,217,160,0.45)',
            paddingLeft: '0.34em'
          }}>{titulo}</div>
          <div style={{
            fontFamily: 'Inter, Helvetica, Arial, sans-serif',
            fontWeight: 300, fontSize: 24, letterSpacing: '0.16em',
            color: 'rgba(255,246,224,0.9)', opacity: mensajeOp, marginTop: 34,
            paddingLeft: '0.16em'
          }}>{mensaje}</div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
