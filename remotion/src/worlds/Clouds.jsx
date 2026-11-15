import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Cielo, Nubes, Polvo, Grado } from './CommonLayers.jsx';
import { loopSin, loopCos } from '../lib/loop.js';

/** AMBIENT-001 · CLOUDS — dorado, lavanda y azul. Para platicar y recuerdos. */
const PAL = { dorado: '#FFD9A0', amanecer: '#FFB27A', lavanda: '#A99BD6',
              azul: '#6FB4E8', tarde: '#2A3B6B', luz: '#FFF4E2' };

const useDeriva = (amp, ciclos = 1) => {
  const f = useCurrentFrame(); const { durationInFrames: d } = useVideoConfig();
  return { x: loopSin(f, d, ciclos) * amp, y: loopCos(f, d, ciclos, 0.2) * amp * 0.4,
           s: 1.05 + loopSin(f, d, ciclos, 0.35) * 0.02 };
};

export const CloudsMain = ({ luminosidad = 1 }) => {
  const d = useDeriva(2.0);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.tarde }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <Cielo angulo={178}
          paradas={[`${PAL.tarde} 0%`, `${PAL.lavanda} 34%`, `${PAL.dorado} 72%`, `${PAL.amanecer} 100%`]}
          sol={{ x: 62, y: 74, color: PAL.luz, r1: 6, r2: 40 }} />
        <Nubes capas={5} porCapa={8} colorLuz={PAL.luz} colorSombra={PAL.lavanda}
          opacidad={1.1 * luminosidad} seed="clouds-main" alturaBase={58} />
        <Polvo cantidad={70} color={PAL.dorado} opacidad={0.5} seed="clouds-main-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.42} tinte="rgba(30,22,44," />
    </AbsoluteFill>
  );
};

export const CloudsCeiling = ({ luminosidad = 1 }) => {
  const d = useDeriva(1.6);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.tarde }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        {/* mirando hacia arriba: el claro queda en el centro, no en el horizonte */}
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 50% 42%, ${PAL.dorado} 0%, ${PAL.lavanda} 40%, ${PAL.tarde} 100%)`
        }} />
        <Nubes capas={4} porCapa={9} colorLuz={PAL.luz} colorSombra={PAL.lavanda}
          opacidad={1.2 * luminosidad} seed="clouds-ceil" alturaBase={48} mirandoArriba />
        <Polvo cantidad={50} color={PAL.luz} opacidad={0.4} seed="clouds-ceil-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.55} tinte="rgba(30,22,44," />
    </AbsoluteFill>
  );
};

export const CloudsSide = ({ luminosidad = 1 }) => {
  const d = useDeriva(2.6);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.tarde }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <Cielo angulo={192}
          paradas={[`${PAL.lavanda} 0%`, `${PAL.dorado} 48%`, `${PAL.amanecer} 100%`]} />
        <Nubes capas={3} porCapa={7} colorLuz={PAL.luz} colorSombra={PAL.tarde}
          opacidad={0.95 * luminosidad} seed="clouds-side" alturaBase={62} />
        <Polvo cantidad={90} color={PAL.dorado} opacidad={0.45} seed="clouds-side-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.5} tinte="rgba(30,22,44," />
    </AbsoluteFill>
  );
};
