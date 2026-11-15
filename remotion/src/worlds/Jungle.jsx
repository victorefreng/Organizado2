import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Follaje, Luciernagas, Polvo, Grado } from './CommonLayers.jsx';
import { Rayos } from './OceanLayers.jsx';
import { loopSin, loopCos } from '../lib/loop.js';

/** AMBIENT-003 · JUNGLE — verde con destellos dorados. Comer y descansar. */
const PAL = { fondo: '#071509', medio: '#0E2B1C', hoja: '#2F6B4F',
              hojaLuz: '#8FD6A8', sol: '#FFD98A', bruma: '#1C4433' };

const useDeriva = (amp, ciclos = 1) => {
  const f = useCurrentFrame(); const { durationInFrames: d } = useVideoConfig();
  return { x: loopSin(f, d, ciclos) * amp, y: loopCos(f, d, ciclos, 0.19) * amp * 0.4,
           s: 1.05 + loopSin(f, d, ciclos, 0.42) * 0.02 };
};

export const JungleMain = ({ luminosidad = 1 }) => {
  const d = useDeriva(1.8);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.fondo }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 52% 30%, ${PAL.bruma} 0%, ${PAL.medio} 42%, ${PAL.fondo} 100%)`
        }} />
        {/* sotobosque al fondo, desenfocado */}
        <Follaje cantidad={70} seed="jun-main-fondo" color={PAL.medio} colorLuz={PAL.hoja}
          desdeArriba={false} escala={1.4} viento={0.7} />
        <Rayos cantidad={6} intensidad={0.9 * luminosidad} desdeArriba seed="jun-main-rayos" />
        {/* follaje de primer término, enmarcando */}
        <Follaje cantidad={38} seed="jun-main-frente" color="#061008" colorLuz={PAL.hoja}
          desdeArriba escala={2.4} viento={1.2} />
        <Luciernagas cantidad={46} seed="jun-main-luz" color={PAL.sol} />
        <Polvo cantidad={60} color={PAL.sol} opacidad={0.4} seed="jun-main-polvo" />
      </AbsoluteFill>
      <Grado vineta={0.62} tinte="rgba(6,16,10," />
    </AbsoluteFill>
  );
};

export const JungleCeiling = ({ luminosidad = 1 }) => {
  const d = useDeriva(1.4);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.fondo }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        {/* mirando hacia arriba: el cielo se cuela entre las hojas */}
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 48% 44%, ${PAL.sol}cc 0%, ${PAL.hojaLuz}55 18%, ${PAL.medio} 54%, ${PAL.fondo} 100%)`
        }} />
        <Rayos cantidad={8} intensidad={1.3 * luminosidad} desdeArriba={false} seed="jun-ceil-rayos" />
        {/* el dosel cubriendo todo el encuadre */}
        <Follaje cantidad={130} seed="jun-ceil-dosel" color="#0A2113" colorLuz={PAL.hojaLuz}
          desdeArriba escala={2.0} viento={1} />
        <Follaje cantidad={60} seed="jun-ceil-dosel2" color="#061008" colorLuz={PAL.hoja}
          desdeArriba={false} escala={2.6} viento={0.8} />
        <Luciernagas cantidad={28} seed="jun-ceil-luz" color={PAL.sol} />
      </AbsoluteFill>
      <Grado vineta={0.58} tinte="rgba(6,16,10," />
    </AbsoluteFill>
  );
};

export const JungleSide = ({ luminosidad = 1 }) => {
  const d = useDeriva(2.4);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.fondo }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.s})` }}>
        <AbsoluteFill style={{
          background: `linear-gradient(160deg, ${PAL.medio} 0%, ${PAL.fondo} 100%)`
        }} />
        <Follaje cantidad={90} seed="jun-side-fondo" color={PAL.medio} colorLuz={PAL.hoja}
          desdeArriba={false} escala={1.8} viento={0.9} />
        <Rayos cantidad={4} intensidad={0.6 * luminosidad} desdeArriba seed="jun-side-rayos" />
        <Follaje cantidad={46} seed="jun-side-frente" color="#050E07" colorLuz={PAL.hojaLuz}
          desdeArriba escala={3.0} viento={1.3} />
        <Luciernagas cantidad={72} seed="jun-side-luz" color={PAL.sol} />
      </AbsoluteFill>
      <Grado vineta={0.66} tinte="rgba(6,16,10," />
    </AbsoluteFill>
  );
};
