import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Profundidad, Rayos, Causticas, Particulas, Peces, Medusas, Grado, PAL } from './OceanLayers.jsx';
import { loopSin, loopCos } from '../lib/loop.js';

/**
 * AMBIENT-002 · OCEAN — el mundo base.
 *
 * Tres pantallas, tres composiciones distintas del mismo mundo. No hay
 * continuidad geométrica entre ellas (es imposible y se notaría): comparten
 * paleta, profundidad de niebla y ritmo, que es lo que hace que el ojo las lea
 * como el mismo sitio.
 *
 * Bucle perfecto POR CONSTRUCCIÓN: cada capa se anima con funciones cuyo ciclo
 * divide exactamente la duración, así que el último fotograma y el primero son
 * el mismo. Sin solapes, sin fundidos, sin rastro.
 */

/** Deriva lenta de cámara, también cerrada en ciclo. */
const useDeriva = (amp = 2.2, ciclos = 1) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return {
    x: loopSin(frame, durationInFrames, ciclos) * amp,
    y: loopCos(frame, durationInFrames, ciclos, 0.17) * amp * 0.5,
    escala: 1.06 + loopSin(frame, durationInFrames, ciclos, 0.4) * 0.025
  };
};

/** MAIN · pared de enfrente. Lo que mira de frente: el océano abierto. */
export const OceanMain = ({ densidadPeces = 1, luminosidad = 1 }) => {
  const d = useDeriva(2.4, 1);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.abyss }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.escala})` }}>
        <Profundidad desde="surface" hacia="abyss" angulo={176} />
        <Rayos cantidad={8} intensidad={1.15 * luminosidad} desdeArriba seed="main-rayos" />
        <Causticas intensidad={0.55 * luminosidad} escala={1} seed={5} />
        <Medusas cantidad={5} seed="main-med" />
        <Peces cantidad={110} seed="main-peces" escala={1} densidad={densidadPeces} />
        <Particulas cantidad={190} seed="main-plancton" tamMax={3} />
      </AbsoluteFill>
      <Grado vineta={0.55} />
    </AbsoluteFill>
  );
};

/** CEILING · techo. Mirando HACIA ARRIBA: la superficie vista desde abajo. */
export const OceanCeiling = ({ luminosidad = 1 }) => {
  const d = useDeriva(1.8, 1);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.abyss }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.escala})` }}>
        {/* invertido: lo claro arriba es la superficie, lo oscuro son los bordes */}
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse at 50% 34%, ${PAL.surface} 0%, ${PAL.mid} 34%, ${PAL.base} 62%, ${PAL.abyss} 100%)`
        }} />
        {/* la red de cáusticas es LA imagen del techo: va fuerte */}
        <Causticas intensidad={1.5 * luminosidad} escala={0.72} seed={11} />
        <Rayos cantidad={9} intensidad={1.5 * luminosidad} desdeArriba={false} seed="ceil-rayos" />
        <Particulas cantidad={120} seed="ceil-plancton" tamMax={2.4} />
        {/* siluetas lejanas pasando por encima */}
        <Peces cantidad={26} seed="ceil-peces" escala={1.7} densidad={0.6} />
      </AbsoluteFill>
      <Grado vineta={0.68} />
    </AbsoluteFill>
  );
};

/** SIDE · pared lateral. Vida y textura secundaria, sin protagonismo. */
export const OceanSide = ({ densidadPeces = 1, luminosidad = 1 }) => {
  const d = useDeriva(3.0, 1);
  return (
    <AbsoluteFill style={{ backgroundColor: PAL.abyss }}>
      <AbsoluteFill style={{ transform: `translate(${d.x}%, ${d.y}%) scale(${d.escala})` }}>
        <Profundidad desde="mid" hacia="abyss" angulo={200} />
        <Rayos cantidad={5} intensidad={0.8 * luminosidad} desdeArriba seed="side-rayos" />
        <Causticas intensidad={0.3 * luminosidad} escala={1.3} seed={23} />
        <Medusas cantidad={9} seed="side-med" />
        <Peces cantidad={150} seed="side-peces" escala={0.8} densidad={densidadPeces} />
        <Particulas cantidad={240} seed="side-plancton" tamMax={2.6} />
      </AbsoluteFill>
      <Grado vineta={0.6} />
    </AbsoluteFill>
  );
};
