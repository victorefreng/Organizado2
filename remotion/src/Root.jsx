import React from 'react';
import { Composition } from 'remotion';
import { OceanMain, OceanCeiling, OceanSide } from './worlds/Ocean.jsx';
import { PruebaCompositing } from './PruebaCompositing.jsx';

const FPS = 30;
/**
 * Duraciones distintas a propósito (Brief §5.6): así el conjunto de las tres
 * pantallas no se repite igual nunca. Al ser bucles perfectos, pueden durar lo
 * que quieran sin que importe.
 */
const DUR = { main: 120, ceiling: 140, side: 160 };

export const RemotionRoot = () => (
  <>
    <Composition id="OCEAN-MAIN" component={OceanMain}
      durationInFrames={DUR.main * FPS} fps={FPS} width={1280} height={720}
      defaultProps={{ densidadPeces: 1, luminosidad: 1 }} />

    <Composition id="OCEAN-CEILING" component={OceanCeiling}
      durationInFrames={DUR.ceiling * FPS} fps={FPS} width={1280} height={720}
      defaultProps={{ luminosidad: 1 }} />

    <Composition id="OCEAN-SIDE" component={OceanSide}
      durationInFrames={DUR.side * FPS} fps={FPS} width={1280} height={720}
      defaultProps={{ densidadPeces: 1, luminosidad: 1 }} />

    <Composition id="PruebaCompositing" component={PruebaCompositing}
      durationInFrames={300} fps={FPS} width={1280} height={720}
      defaultProps={{ titulo: 'UNIVERSO 1/1', mensaje: 'Celebrando tu vida, Arantza' }} />
  </>
);
