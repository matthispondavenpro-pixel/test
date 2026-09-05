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

// Animation style alterne pour chaque ligne
type AnimStyle = 'slideUp' | 'slideLeft' | 'zoom' | 'drop';
function getAnimStyle(lineIdx: number): AnimStyle {
  const styles: AnimStyle[] = ['slideUp', 'slideLeft', 'zoom', 'drop'];
  return styles[lineIdx % styles.length];
}

// ─── Mot animé ────────────────────────────────────────────────────────────────

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
    ? spring({ frame: frame - startFrame, fps, config: { damping: 6, stiffness: 500, mass: 0.2 } })
    : 1;

  const scale = isActive
    ? interpolate(progress, [0, 0.5, 1], [1.8, 0.9, 1.0], { extrapolateRight: 'clamp' })
    : 1;

  const color = isActive ? accentColor : isPast ? `${primaryColor}60` : primaryColor;

  return (
    <span
      style={{
        display: 'inline-block',
        color,
        transform: `scale(${scale})`,
        transformOrigin: 'center bottom',
        marginRight: 10,
        willChange: 'transform',
        WebkitTextStroke: '5px #000',
        paintOrder: 'stroke fill',
        filter: isActive
          ? `drop-shadow(0 0 20px ${accentColor}) drop-shadow(0 0 40px ${accentColor}88)`
          : 'none',
        transition: 'color 40ms, filter 80ms',
      }}
    >
      {text}
    </span>
  );
};

// ─── Ligne avec animation variée ──────────────────────────────────────────────

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
  const elapsed = frame - lineStartFrame;

  const prog = spring({
    frame: elapsed,
    fps,
    config: { damping: 12, stiffness: 280, mass: 0.45 },
  });

  const style = getAnimStyle(lineIdx);

  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let rotateZ = 0;

  if (style === 'slideUp') {
    translateY = interpolate(prog, [0, 1], [70, 0], { extrapolateRight: 'clamp' });
  } else if (style === 'slideLeft') {
    translateX = interpolate(prog, [0, 1], [-120, 0], { extrapolateRight: 'clamp' });
    translateY = interpolate(prog, [0, 1], [20, 0], { extrapolateRight: 'clamp' });
  } else if (style === 'zoom') {
    scale = interpolate(prog, [0, 1], [2.2, 1.0], { extrapolateRight: 'clamp' });
  } else if (style === 'drop') {
    translateY = interpolate(prog, [0, 1], [-60, 0], { extrapolateRight: 'clamp' });
    rotateZ = interpolate(prog, [0, 1], [-4, 0], { extrapolateRight: 'clamp' });
  }

  const opacity = interpolate(elapsed, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

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
        transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotate(${rotateZ}deg)`,
        opacity,
        padding: '0 24px',
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
  fontSize = 72,
  wordsPerLine = 4,
  useSounds = false,
  popSoundFile = 'pop.wav',
  whooshSoundFile = 'whoosh.wav',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const lines = groupLines(words, wordsPerLine);

  const topHeight    = Math.round(height * 0.44);
  const bottomHeight = height - topHeight;

  // Ligne active
  const currentLineIdx = lines.findIndex((line) => {
    const start = Math.round(line[0].start * fps);
    const end   = Math.round(line[line.length - 1].end * fps);
    return frame >= start && frame <= end + 6;
  });

  const currentLine = currentLineIdx >= 0 ? lines[currentLineIdx] : null;

  const activeWordIdx = currentLine
    ? currentLine.findIndex(
        (w) => frame >= Math.round(w.start * fps) && frame <= Math.round(w.end * fps) + 1,
      )
    : -1;

  // Zoom punch sur le visage à chaque nouvelle ligne
  const lineStartFrame = currentLine ? Math.round(currentLine[0].start * fps) : 0;
  const punchProgress  = currentLine
    ? spring({ frame: frame - lineStartFrame, fps, config: { damping: 10, stiffness: 500, mass: 0.2 } })
    : 1;
  const faceScale = interpolate(punchProgress, [0, 0.4, 1], [1.12, 0.97, 1.0], { extrapolateRight: 'clamp' });

  // Zoom d'intro global
  const introProgress = spring({ frame, fps, config: { damping: 22, stiffness: 40, mass: 1 } });
  const introScale    = interpolate(introProgress, [0, 1], [1.08, 1.0], { extrapolateRight: 'clamp' });

  // Flash de couleur sur mot actif
  const flashOpacity = activeWordIdx >= 0
    ? interpolate(
        spring({ frame: frame - Math.round((currentLine?.[activeWordIdx]?.start ?? 0) * fps), fps,
          config: { damping: 8, stiffness: 600, mass: 0.15 } }),
        [0, 1], [0.15, 0],
        { extrapolateRight: 'clamp' }
      )
    : 0;

  return (
    <AbsoluteFill style={{ background: '#000' }}>

      {/* ── Zone haute : vidéo floutée ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, width, height: topHeight, overflow: 'hidden' }}>
        <Video
          src={staticFile(videoFile)}
          style={{
            width: '100%',
            height: '220%',
            objectFit: 'cover',
            objectPosition: 'center 25%',
            filter: 'blur(22px) brightness(0.45) saturate(1.6)',
            transform: 'scale(1.15)',
          }}
        />
        {/* Dégradé bas */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: 100,
          background: 'linear-gradient(to bottom, transparent, #000)',
        }} />
        {/* Dégradé haut */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 60,
          background: 'linear-gradient(to top, transparent, #000)',
        }} />
      </div>

      {/* ── Zone basse : face cam ── */}
      <div style={{ position: 'absolute', top: topHeight, left: 0, width, height: bottomHeight, overflow: 'hidden' }}>
        <div style={{
          width: '100%', height: '100%',
          transform: `scale(${faceScale * introScale})`,
          transformOrigin: 'center center',
        }}>
          <Video
            src={staticFile(videoFile)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        {/* Dégradé haut */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 80,
          background: 'linear-gradient(to top, transparent, #000)',
          pointerEvents: 'none',
        }} />
        {/* Vignette bords */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Flash couleur sur le visage ── */}
      {flashOpacity > 0 && (
        <div style={{
          position: 'absolute', top: topHeight, left: 0, width, height: bottomHeight,
          background: accentColor,
          opacity: flashOpacity,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }} />
      )}

      {/* ── Sous-titres à la jonction ── */}
      {currentLine && (
        <div style={{
          position: 'absolute',
          top: topHeight - 72,
          left: 0,
          width,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 20,
          overflow: 'hidden',
        }}>
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

      {/* ── Sons ── */}
      {useSounds && words.map((w, i) => (
        <Sequence key={`pop-${i}`} from={Math.round(w.start * fps)} durationInFrames={Math.round(fps * 0.12)}>
          <Audio src={staticFile(popSoundFile)} volume={0.1} />
        </Sequence>
      ))}
      {useSounds && lines.map((line, i) => (
        <Sequence key={`whoosh-${i}`} from={Math.round(line[0].start * fps)} durationInFrames={Math.round(fps * 0.25)}>
          <Audio src={staticFile(whooshSoundFile)} volume={0.12} />
        </Sequence>
      ))}

    </AbsoluteFill>
  );
};
