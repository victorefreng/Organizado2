import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Estrellas, Nebulosa, Polvo, Grado } from './CommonLayers.jsx';
import { loopSin, loopCos } from '../lib/loop.js';

/** AMBIENT-004 · GALAXY — violeta, azul oscuro y estrellas cálidas. */
const PAL = { base: '#06060F', frio: '#2B1B4D', magenta: '#B06BFF',
              cian: '#5FD8FF', estrella: '#FFE9B0', polvo: '#1A0F2E' };

const useDeriva = (amp, ciclos = 1) => {
  const f = useCurrentFrame(); const { durationInFrames: d } = useVideoConfig();
  return { x: loopSin(f, d, ciclos) * amp, y: loopCos(f, d, ciclos, 0.23) * amp * 0.5,
           s: 1.04 + loopSin(f, d, ciclos, 0.5) * 0.02 };
};

export const GalaxyMain = ({ luminosidad = 1 }) => {
  const d = useDeriva(1.6);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.base }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 42% 52%, ${PAL.frio} 0%, ${PAL.base} 68%)`
        }} />
        <Nebulosa parches={30} colores={[PAL.magenta, PAL.cian, PAL.frio]}
          opacidad={1.1 * luminosidad} seed="gal-main-neb" />
        <Estrellas cantidad={520} seed="gal-main" color={PAL.estrella} brillo={luminosidad} />
        <Polvo cantidad={70} color={PAL.cian} opacidad={0.3} seed="gal-main-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.6} tinte="rgba(4,4,12," />
    </AbsoluteFill>
  );
};

export const GalaxyCeiling = ({ luminosidad = 1 }) => {
  const d = useDeriva(1.2);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.base }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <AbsoluteFill style={{ background: PAL.base }} />
        {/* la banda de la vía láctea cruzando el techo */}
        <AbsoluteFill style={{
          background: `linear-gradient(104deg, transparent 22%, ${PAL.frio}aa 42%, ${PAL.magenta}44 52%, ${PAL.frio}aa 62%, transparent 80%)`,
          filter: 'blur(38px)', mixBlendMode: 'screen'
        }} />
        <Nebulosa parches={18} colores={[PAL.magenta, PAL.frio]}
          opacidad={0.85 * luminosidad} seed="gal-ceil-neb" />
        <Estrellas cantidad={700} seed="gal-ceil" color={PAL.estrella} brillo={1.2 * luminosidad} />
      </AbsoluteFill>
      <Grado vineta={0.5} tinte="rgba(4,4,12," />
    </AbsoluteFill>
  );
};

export const GalaxySide = ({ luminosidad = 1 }) => {
  const d = useDeriva(2.2);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.base }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 68% 38%, ${PAL.polvo} 0%, ${PAL.base} 72%)`
        }} />
        <Nebulosa parches={22} colores={[PAL.cian, PAL.magenta, PAL.polvo]}
          opacidad={0.8 * luminosidad} seed="gal-side-neb" />
        <Estrellas cantidad={380} seed="gal-side" color={PAL.estrella} brillo={0.9 * luminosidad} />
        <Polvo cantidad={110} color={PAL.magenta} opacidad={0.3} seed="gal-side-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.62} tinte="rgba(4,4,12," />
    </AbsoluteFill>
  );
};
