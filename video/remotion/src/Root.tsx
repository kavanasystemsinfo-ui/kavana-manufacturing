import React from 'react';
import { Composition } from 'remotion';
import { ManufacturingVideo } from './ManufacturingVideo';
import scriptJson from './data/script.json';

const script = scriptJson as { duration: number; fps: number };

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ManufacturingVideo"
      component={ManufacturingVideo}
      durationInFrames={Math.round(script.duration * script.fps)}
      fps={script.fps}
      width={1920}
      height={1080}
    />
  );
};
