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
  brollFile: string;
  words: Word[];
  durationInFrames: number;
  accentColor: string;
  primaryColor: string;
  fontSize: number;
  wordsPerLine: number;
  notifFile: string;
  useNotif: boolean;
};

function groupLines(words: Word[], n: number): Word[][] {
  const out: Word[][] = [];
  for (let i = 0; i < words.length; i += n) out.push(words.slice(i, i + n));
  return out;
}

const WordSpan: React.FC<{
  text: string;
  isActive: boolean;
  wasPast: boolean;
  frame: number;
  startFrame: number;
  fps: number;
  accentColor: string;
  primaryColor: string;
}> = ({ text, isActive, wasPast, frame, startFrame, fps, accentColor, primaryColor }) => {
  const progress = isActive
    ? spring({
        frame: frame - startFrame,
        fps,
        config: { damping: 12, stiffness: 280, mass: 0.35 },
      })
    : 1;

  const scale = isActive
    ? interpolate(progress, [0, 1], [1.3, 1], { extrapolateRight: 'clamp' })
    : 1;

  const color = isActive ? accentColor : wasPast ? `${primaryColor}99` : primaryColor;

  return (
    <span
      style={{
        display: 'inline-block',
        color,
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        marginRight: 10,
        transition: 'color 80ms',
        willChange: 'transform, color',
      }}
    >
      {text}
    </span>
  );
};

export const VideoKit: React.FC<VideoKitProps> = ({
  videoFile,
  brollFile,
  words,
  accentColor = '#f59e0b',
  primaryColor = '#ffffff',
  fontSize = 56,
  wordsPerLine = 5,
  notifFile = 'notif.wav',
  useNotif = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const lines = groupLines(words, wordsPerLine);
  const splitY = Math.round(height * 0.5);

  // Ligne active
  const currentLineIdx = lines.findIndex((line) => {
    const start = Math.round(line[0].start * fps);
    const end = Math.round(line[line.length - 1].end * fps);
    return frame >= start && frame <= end + 2;
  });

  const currentLine = currentLineIdx >= 0 ? lines[currentLineIdx] : null;

  const activeWordIdx = currentLine
    ? currentLine.findIndex(
        (w) => frame >= Math.round(w.start * fps) && frame <= Math.round(w.end * fps) + 1,
      )
    : -1;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* B-roll — moitié haute */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: splitY,
          overflow: 'hidden',
        }}
      >
        <Video
          src={staticFile(brollFile)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loop
          muted
        />
      </div>

      {/* Visage — moitié basse */}
      <div
        style={{
          position: 'absolute',
          top: splitY,
          left: 0,
          width,
          height: height - splitY,
          overflow: 'hidden',
        }}
      >
        <Video
          src={staticFile(videoFile)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Ligne de séparation */}
      <div
        style={{
          position: 'absolute',
          top: splitY - 2,
          left: 0,
          width,
          height: 4,
          background: 'rgba(255,255,255,0.15)',
        }}
      />

      {/* Sous-titres */}
      {currentLine && (
        <div
          style={{
            position: 'absolute',
            top: splitY + 28,
            left: 0,
            width,
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            padding: '14px 36px 18px',
            fontSize,
            fontFamily: '"Arial Black", Arial, sans-serif',
            fontWeight: 900,
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            textShadow:
              '0 3px 14px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.75)',
            background: 'rgba(0,0,0,0.28)',
          }}
        >
          {currentLine.map((w, idx) => (
            <WordSpan
              key={`${currentLineIdx}-${idx}`}
              text={w.word.trim()}
              isActive={idx === activeWordIdx}
              wasPast={activeWordIdx > -1 && idx < activeWordIdx}
              frame={frame}
              startFrame={Math.round(w.start * fps)}
              fps={fps}
              accentColor={accentColor}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}

      {/* Sons de notification (un son discret par mot) */}
      {useNotif &&
        words.map((w, i) => (
          <Sequence
            key={i}
            from={Math.round(w.start * fps)}
            durationInFrames={Math.round(fps * 0.25)}
          >
            <Audio src={staticFile(notifFile)} volume={0.1} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
