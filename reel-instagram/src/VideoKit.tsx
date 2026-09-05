import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type Word = { word: string; start: number; end: number };

export type VideoKitProps = {
  videoFile: string;
  words: Word[];
  durationInFrames: number;
  accentColor: string;
  primaryColor: string;
  bgColor: string;
  style: 'light' | 'dark';
  fontSize: number;
  wordsPerLine: number;
  popSoundFile: string;
  whooshSoundFile: string;
  useSounds: boolean;
};

function groupLines(words: Word[], n: number): Word[][] {
  const out: Word[][] = [];
  for (let i = 0; i < words.length; i += n) out.push(words.slice(i, i + n));
  return out;
}

// ─── Mot animé ───────────────────────────────────────────────────────────────

const WordSpan: React.FC<{
  text: string;
  isActive: boolean;
  isPast: boolean;
  frame: number;
  startFrame: number;
  fps: number;
  accentColor: string;
  primaryColor: string;
}> = ({ text, isActive, isPast, frame, startFrame, fps, accentColor, primaryColor }) => {
  const progress = isActive
    ? spring({ frame: frame - startFrame, fps, config: { damping: 10, stiffness: 320, mass: 0.3 } })
    : 1;

  const scale = isActive
    ? interpolate(progress, [0, 1], [1.35, 1.0], { extrapolateRight: 'clamp' })
    : 1;

  const color = isActive ? accentColor : isPast ? `${primaryColor}70` : primaryColor;

  return (
    <span
      style={{
        display: 'inline-block',
        color,
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        marginRight: 10,
        willChange: 'transform',
        transition: 'color 60ms',
      }}
    >
      {text}
    </span>
  );
};

// ─── Composition principale ───────────────────────────────────────────────────

export const VideoKit: React.FC<VideoKitProps> = ({
  videoFile,
  words,
  accentColor = '#E02020',
  primaryColor = '#111111',
  bgColor = '#ffffff',
  style = 'light',
  fontSize = 62,
  wordsPerLine = 4,
  popSoundFile = 'pop.wav',
  whooshSoundFile = 'whoosh.wav',
  useSounds = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const lines = groupLines(words, wordsPerLine);

  // Ligne et mot actifs
  const currentLineIdx = lines.findIndex((line) => {
    const start = Math.round(line[0].start * fps);
    const end   = Math.round(line[line.length - 1].end * fps);
    return frame >= start && frame <= end + 3;
  });

  const currentLine = currentLineIdx >= 0 ? lines[currentLineIdx] : null;

  const activeWordIdx = currentLine
    ? currentLine.findIndex(
        (w) => frame >= Math.round(w.start * fps) && frame <= Math.round(w.end * fps) + 1,
      )
    : -1;

  // Zoom d'accroche : démarre à 106%, se stabilise à 100% sur 90 frames
  const zoomProgress = spring({ frame, fps, config: { damping: 22, stiffness: 40, mass: 1 } });
  const videoScale   = interpolate(zoomProgress, [0, 1], [1.07, 1.0], { extrapolateRight: 'clamp' });

  // Punch de ligne : quand une nouvelle ligne apparaît, léger push
  const lineStartFrame = currentLine ? Math.round(currentLine[0].start * fps) : 0;
  const linePunch = currentLine
    ? spring({
        frame: frame - lineStartFrame,
        fps,
        config: { damping: 14, stiffness: 400, mass: 0.25 },
      })
    : 1;
  const subtitleScale = interpolate(linePunch, [0, 1], [1.06, 1.0], { extrapolateRight: 'clamp' });

  const isLight      = style === 'light';
  const subAreaTop   = Math.round(height * 0.65);
  // Style light : fond blanc derrière les sous-titres / Style dark : dégradé noir
  const subBg        = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.72)';
  const gradientEnd  = isLight ? `${bgColor}F0` : `${bgColor}F0`;
  const textShadow   = isLight
    ? 'none'
    : '0 4px 20px rgba(0,0,0,0.95)';

  return (
    <AbsoluteFill style={{ background: bgColor }}>

      {/* Vidéo plein écran avec zoom d'accroche */}
      <AbsoluteFill style={{ transform: `scale(${videoScale})`, transformOrigin: 'center center' }}>
        <Video
          src={staticFile(videoFile)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Dégradé bas */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: Math.round(height * 0.42),
          background: `linear-gradient(to bottom, transparent 0%, ${gradientEnd} 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Sous-titres */}
      {currentLine && (
        <div
          style={{
            position: 'absolute',
            top: subAreaTop,
            left: 0,
            width,
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            padding: '0 40px',
            transform: `scale(${subtitleScale})`,
            transformOrigin: 'center top',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              fontSize,
              fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
              fontWeight: 900,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              textShadow,
              background: subBg,
              borderRadius: 18,
              padding: '14px 28px',
              maxWidth: '100%',
              boxShadow: isLight ? '0 4px 24px rgba(0,0,0,0.10)' : 'none',
            }}
          >
            {currentLine.map((w, idx) => (
              <WordSpan
                key={`${currentLineIdx}-${idx}`}
                text={w.word.trim()}
                isActive={idx === activeWordIdx}
                isPast={activeWordIdx > -1 && idx < activeWordIdx}
                frame={frame}
                startFrame={Math.round(w.start * fps)}
                fps={fps}
                accentColor={accentColor}
                primaryColor={primaryColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Son : pop sur chaque mot */}
      {useSounds &&
        words.map((w, i) => (
          <Sequence key={`pop-${i}`} from={Math.round(w.start * fps)} durationInFrames={Math.round(fps * 0.2)}>
            <Audio src={staticFile(popSoundFile)} volume={0.18} />
          </Sequence>
        ))}

      {/* Son : whoosh sur chaque nouvelle ligne */}
      {useSounds &&
        lines.map((line, i) => (
          <Sequence key={`whoosh-${i}`} from={Math.round(line[0].start * fps)} durationInFrames={Math.round(fps * 0.4)}>
            <Audio src={staticFile(whooshSoundFile)} volume={0.22} />
          </Sequence>
        ))}

    </AbsoluteFill>
  );
};
