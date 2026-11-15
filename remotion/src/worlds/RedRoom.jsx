import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Terciopelo, Bokeh, Polvo, Grado } from './CommonLayers.jsx';
import { loopSin, loopCos } from '../lib/loop.js';

/**
 * AMBIENT-005 · RED ROOM — rojo vino, carmesí, negro y ámbar.
 *
 * La regla que gobierna este mundo: la luz es INDIRECTA y rasante. Lo que se ve
 * son sombras sobre terciopelo, nunca un plano rojo saturado. Sin magentas, sin
 * cian, sin estrobo, saturación contenida. Es lo único que separa "íntimo y
 * elegante" de "antro barato".
 */
const PAL = { negro: '#0A0507', sombra: '#2B060D', vino: '#4A0D16',
              carmesi: '#8E1226', ambar: '#D98B3A', terciopelo: '#C9435A' };

const useDeriva = (amp, ciclos = 1) => {
  const f = useCurrentFrame(); const { durationInFrames: d } = useVideoConfig();
  return { x: loopSin(f, d, ciclos) * amp, y: loopCos(f, d, ciclos, 0.27) * amp * 0.3,
           s: 1.04 + loopSin(f, d, ciclos, 0.6) * 0.015 };
};

export const RedRoomMain = ({ brillo = 1 }) => {
  const d = useDeriva(1.0);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.negro }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <Terciopelo pliegues={24} seed="red-main" brillo={brillo}
          vino={PAL.vino} carmesi={PAL.carmesi} ambar={PAL.ambar} />
        <Bokeh cantidad={16} seed="red-main-bokeh" color={PAL.ambar} opacidad={0.9} />
        <Polvo cantidad={110} color={PAL.ambar} opacidad={0.45} seed="red-main-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.78} tinte="rgba(10,5,7," />
    </AbsoluteFill>
  );
};

export const RedRoomCeiling = ({ brillo = 1 }) => {
  const d = useDeriva(0.8);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.negro }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        {/* tela suspendida arriba: el claro en el centro, sombra en los bordes */}
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 50% 46%, ${PAL.carmesi} 0%, ${PAL.vino} 38%, ${PAL.sombra} 70%, ${PAL.negro} 100%)`
        }} />
        <Terciopelo pliegues={14} seed="red-ceil" brillo={brillo * 0.7}
          vino={PAL.vino} carmesi={PAL.carmesi} ambar={PAL.ambar} />
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 50% 46%, transparent 24%, ${PAL.negro}cc 78%)`
        }} />
        <Bokeh cantidad={22} seed="red-ceil-bokeh" color={PAL.ambar} opacidad={1.1} />
        <Polvo cantidad={80} color={PAL.ambar} opacidad={0.4} seed="red-ceil-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.7} tinte="rgba(10,5,7," />
    </AbsoluteFill>
  );
};

export const RedRoomSide = ({ brillo = 1 }) => {
  const d = useDeriva(1.4);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.negro }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <AbsoluteFill style={{
          background: `linear-gradient(118deg, ${PAL.negro} 0%, ${PAL.sombra} 32%, ${PAL.vino} 72%, ${PAL.sombra} 100%)`
        }} />
        <Terciopelo pliegues={12} seed="red-side" brillo={brillo * 0.85}
          vino={PAL.vino} carmesi={PAL.carmesi} ambar={PAL.ambar} />
        <Bokeh cantidad={28} seed="red-side-bokeh" color={PAL.ambar} opacidad={1.2} />
        <Polvo cantidad={140} color={PAL.ambar} opacidad={0.5} seed="red-side-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.82} tinte="rgba(10,5,7," />
    </AbsoluteFill>
  );
};
