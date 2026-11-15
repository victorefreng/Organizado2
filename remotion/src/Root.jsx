import React from 'react';
import { Composition } from 'remotion';
import { PruebaCompositing } from './PruebaCompositing.jsx';

export const RemotionRoot = () => (
  <>
    <Composition
      id="PruebaCompositing"
      component={PruebaCompositing}
      durationInFrames={300}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{
        titulo: 'UNIVERSO 1/1',
        mensaje: 'Celebrando tu vida, Arantza'
      }}
    />
  </>
);
