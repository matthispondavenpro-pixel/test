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
    ? spring({ frame: frame - startFrame, fps, config: { damping: 8, stiffness: 400, mass: 0.25 } })
    : 1;

  const scale = isActive
    ? interpolate(progress, [0, 1], [1.5, 1.0], { extrapolateRight: 'clamp' })
    : 1;

  const color = isActive ? accentColor : isPast ? `${primaryColor}88` : primaryColor;

  const strokeColor = '#000000';

  return (
    <span
      style={{
        display: 'inline-block',
        color,
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        marginRight: 8,
        willChange: 'transform',
        WebkitTextStroke: `4px ${strokeColor}`,
        paintOrder: 'stroke fill',
        filter: isActive ? 'drop-shadow(0 0 12px rgba(255,220,0,0.8))' : 'none',
      }}
    >
      {text}
    </span>
  );
};

// ─── Ligne animée (slide-in) ──────────────────────────────────────────────────

const SubtitleLine: React.FC<{
  line: Word[];
  lineIdx: number;
  activeWordIdx: number;
  frame: number;
  fps: number;
  accentColor: string;
  primaryColor: string;
  fontSize: number;
}> = ({ line, lineIdx, activeWordIdx, frame, fps, accentColor, primaryColor, fontSize }) => {
  const lineStartFrame = Math.round(line[0].start * fps);

  const slideProgress = spring({
    frame: frame - lineStartFrame,
    fps,
    config: { damping: 14, stiffness: 300, mass: 0.4 },
  });

  const translateY = interpolate(slideProgress, [0, 1], [40, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(slideProgress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        fontSize,
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 900,
        letterSpacing: '-0.01em',
        lineHeight: 1.15,
        transform: `translateY(${translateY}px)`,
        opacity,
        padding: '0 20px',
        maxWidth: '100%',
      }}
    >
      {line.map((w, idx) => (
        <WordSpan
          key={`${lineIdx}-${idx}`}
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
  );
};

// ─── Composition principale ───────────────────────────────────────────────────

export const VideoKit: React.FC<VideoKitProps> = ({
  videoFile,
  words,
  accentColor = '#FFE600',
  primaryColor = '#FFFFFF',
  fontSize = 68,
  wordsPerLine = 4,
  useSounds = false,
  popSoundFile = 'pop.wav',
  whooshSoundFile = 'whoosh.wav',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const lines = groupLines(words, wordsPerLine);

  const topHeight   = Math.round(height * 0.45);
  const bottomHeight = height - topHeight;

  // Ligne active
  const currentLineIdx = lines.findIndex((line) => {
    const start = Math.round(line[0].start * fps);
    const end   = Math.round(line[line.length - 1].end * fps);
    return frame >= start && frame <= end + 5;
  });

  const currentLine = currentLineIdx >= 0 ? lines[currentLineIdx] : null;

  const activeWordIdx = currentLine
    ? currentLine.findIndex(
        (w) => frame >= Math.round(w.start * fps) && frame <= Math.round(w.end * fps) + 1,
      )
    : -1;

  // Zoom d'accroche sur la zone face
  const zoomProgress = spring({ frame, fps, config: { damping: 22, stiffness: 40, mass: 1 } });
  const videoScale   = interpolate(zoomProgress, [0, 1], [1.08, 1.0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#000000' }}>

      {/* Zone haute : même vidéo zoomée + floutée */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: topHeight,
          overflow: 'hidden',
        }}
      >
        <Video
          src={staticFile(videoFile)}
          style={{
            width: '100%',
            height: '200%',
            objectFit: 'cover',
            objectPosition: 'center 30%',
            filter: 'blur(18px) brightness(0.55) saturate(1.4)',
            transform: 'scale(1.1)',
          }}
        />
        {/* Dégradé bas de la zone haute */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 80,
            background: 'linear-gradient(to bottom, transparent, #000000)',
          }}
        />
      </div>

      {/* Séparateur */}
      <div
        style={{
          position: 'absolute',
          top: topHeight - 2,
          left: 0,
          width: '100%',
          height: 4,
          background: 'rgba(255,255,255,0.12)',
        }}
      />

      {/* Zone basse : face cam */}
      <div
        style={{
          position: 'absolute',
          top: topHeight,
          left: 0,
          width,
          height: bottomHeight,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: '100%', height: '100%', transform: `scale(${videoScale})`, transformOrigin: 'center center' }}>
          <Video
            src={staticFile(videoFile)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        {/* Dégradé haut de la zone basse */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 60,
            background: 'linear-gradient(to top, transparent, #000000)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Sous-titres : centrés à la jonction des deux zones */}
      {currentLine && (
        <div
          style={{
            position: 'absolute',
            top: topHeight - 60,
            left: 0,
            width,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <SubtitleLine
            line={currentLine}
            lineIdx={currentLineIdx}
            activeWordIdx={activeWordIdx}
            frame={frame}
            fps={fps}
            accentColor={accentColor}
            primaryColor={primaryColor}
            fontSize={fontSize}
          />
        </div>
      )}

      {/* Sons optionnels */}
      {useSounds &&
        words.map((w, i) => (
          <Sequence key={`pop-${i}`} from={Math.round(w.start * fps)} durationInFrames={Math.round(fps * 0.15)}>
            <Audio src={staticFile(popSoundFile)} volume={0.12} />
          </Sequence>
        ))}

      {useSounds &&
        lines.map((line, i) => (
          <Sequence key={`whoosh-${i}`} from={Math.round(line[0].start * fps)} durationInFrames={Math.round(fps * 0.3)}>
            <Audio src={staticFile(whooshSoundFile)} volume={0.15} />
          </Sequence>
        ))}

    </AbsoluteFill>
  );
};
