import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import scriptJson from './data/script.json';
import timelineJson from './data/timeline.json';

type ZoomArea = { x: number; y: number; width: number; height: number };

type Scene = {
  id: string;
  start: number;
  end: number;
  duration: number;
  label: string;
  description: string;
  action: string;
  target: string;
  zoomArea?: ZoomArea;
};

type TimelineEntry = { id: string; startMs: number; endMs: number };

const SCRIPT = scriptJson as { scenes: Scene[]; branding: Record<string, string> };
const TIMELINE = timelineJson as TimelineEntry[];

const BRAND = {
  primary: '#FF6B00',
  secondary: '#1A1A2E',
  accent: '#00D4AA',
  white: '#FFFFFF',
  dark: '#0B0B14',
};

const FONT = "'Montserrat', 'Inter', 'Helvetica Neue', Arial, sans-serif";

/** Segmento real de la grabación que corresponde a cada escena. */
function footageFor(scene: Scene, fps: number) {
  const tl = TIMELINE.find(t => t.id === scene.id);
  const sceneFrames = Math.round(scene.duration * fps);
  if (!tl) return { startFrom: 0, frames: sceneFrames };
  const startFrom = Math.max(0, Math.round((tl.startMs / 1000) * fps) + Math.round(0.5 * fps));
  return { startFrom, frames: sceneFrames };
}

const ZoomedFootage: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { startFrom, frames } = footageFor(scene, fps);

  const p = interpolate(frame, [0, Math.max(1, frames - 1)], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = interpolate(p, [0, 1], [1, 1.14]);

  const area = scene.zoomArea;
  const cx = area ? (area.x + area.width / 2) / width : 0.5;
  const cy = area ? (area.y + area.height / 2) / height : 0.5;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: BRAND.dark }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${cx * 100}% ${cy * 100}%` }}>
        <OffthreadVideo
          src={staticFile('recording.mp4')}
          startFrom={startFrom}
          endAt={startFrom + frames}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SceneTitle: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const outP = interpolate(f, [frames - 14, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(inP, outP);
  const y = interpolate(inP, [0, 1], [-18, 0]);

  return (
    <div style={{ position: 'absolute', top: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity, transform: `translateY(${y}px)` }}>
      <div
        style={{
          background: 'rgba(11,11,20,0.82)',
          border: `1px solid ${BRAND.primary}`,
          borderRadius: 14,
          padding: '16px 28px',
          color: BRAND.white,
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 700,
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SceneSubtitle: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const outP = interpolate(f, [frames - 12, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(inP, outP);

  return (
    <div style={{ position: 'absolute', bottom: 62, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity }}>
      <div
        style={{
          background: 'rgba(11,11,20,0.86)',
          borderLeft: `4px solid ${BRAND.accent}`,
          borderRadius: 10,
          padding: '14px 26px',
          color: BRAND.white,
          fontFamily: FONT,
          fontSize: 26,
          maxWidth: '72%',
          lineHeight: 1.35,
          textAlign: 'center',
          boxShadow: '0 10px 32px rgba(0,0,0,0.55)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const IntroOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const appear = interpolate(f, [10, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const lift = interpolate(appear, [0, 1], [24, 0]);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, rgba(11,11,20,0.94) 0%, rgba(11,11,20,0.76) 55%, rgba(11,11,20,0.93) 100%)',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' }),
      }}
    >
      <img
        src={staticFile('logo.png')}
        alt="KAVANA"
        style={{ width: 260, height: 'auto', opacity: appear, filter: 'drop-shadow(0 10px 40px rgba(255,107,0,0.35))' }}
      />
      <div style={{ opacity: appear, transform: `translateY(${lift}px)`, textAlign: 'center', marginTop: 28 }}>
        <div style={{ fontFamily: FONT, fontSize: 62, fontWeight: 900, color: BRAND.white, letterSpacing: '0.14em' }}>KAVANA MES</div>
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: BRAND.accent, letterSpacing: '0.22em', marginTop: 10 }}>
          INTELIGENCIA INDUSTRIAL
        </div>
        <div style={{ fontFamily: FONT, fontSize: 22, color: 'rgba(255,255,255,0.72)', marginTop: 22 }}>
          Control de producción en planta, en tiempo real
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, 18], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, rgba(11,11,20,0.96) 0%, rgba(11,11,20,0.9) 60%, rgba(11,11,20,0.97) 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: a,
      }}
    >
      <img src={staticFile('logo.png')} alt="KAVANA" style={{ width: 190, height: 'auto', marginBottom: 26 }} />
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: BRAND.white, letterSpacing: '0.14em' }}>KAVANA MES</div>
      <div style={{ fontFamily: FONT, fontSize: 24, color: 'rgba(255,255,255,0.75)', marginTop: 14 }}>Pruébalo con datos reales de demo</div>
      <div style={{ marginTop: 26, fontFamily: FONT, fontSize: 34, fontWeight: 700, color: BRAND.primary }}>
        www.manufacturing.kavanasystems.com/demo
      </div>
      <div
        style={{
          marginTop: 30,
          fontFamily: FONT,
          fontSize: 20,
          fontWeight: 700,
          color: BRAND.white,
          background: BRAND.primary,
          borderRadius: 10,
          padding: '14px 34px',
          letterSpacing: '0.06em',
        }}
      >
        Demo sin credenciales · Operario · Supervisor · Administrador
      </div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: 'rgba(255,255,255,0.12)' }}>
      <div
        style={{
          height: '100%',
          width: `${(frame / durationInFrames) * 100}%`,
          background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
        }}
      />
    </div>
  );
};

const SceneLayer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frames = Math.round(scene.duration * fps);
  const isIntro = scene.id === 'intro';
  const isOutro = scene.id === 'outro-cta';

  return (
    <AbsoluteFill>
      <ZoomedFootage scene={scene} />
      {!isIntro && !isOutro && (
        <>
          <SceneTitle text={scene.label} frames={frames} />
          <SceneSubtitle text={scene.description} frames={frames} />
        </>
      )}
      {isIntro && <IntroOverlay />}
      {isOutro && <OutroOverlay />}
    </AbsoluteFill>
  );
};

export const ManufacturingVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: BRAND.dark }}>
      <Audio src={staticFile('music.mp3')} volume={0.16} />
      {SCRIPT.scenes.map(scene => (
        <Sequence
          key={scene.id}
          from={Math.round(scene.start * fps)}
          durationInFrames={Math.round(scene.duration * fps)}
          name={scene.id}
        >
          <SceneLayer scene={scene} />
        </Sequence>
      ))}
      <ProgressBar />
    </AbsoluteFill>
  );
};

export default ManufacturingVideo;
