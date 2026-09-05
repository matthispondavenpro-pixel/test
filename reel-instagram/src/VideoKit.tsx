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

// Palette de couleurs de fond pour les cartes (varie selon la ligne)
const CARD_PALETTES = [
  { bg: '#0F0F0F', accent: '#FFE600', text: '#FFFFFF' },
  { bg: '#1A0A2E', accent: '#C084FC', text: '#FFFFFF' },
  { bg: '#0A1628', accent: '#38BDF8', text: '#FFFFFF' },
  { bg: '#0D1F0D', accent: '#4ADE80', text: '#FFFFFF' },
  { bg: '#1F0A0A', accent: '#F87171', text: '#FFFFFF' },
  { bg: '#1A1200', accent: '#FBBF24', text: '#FFFFFF' },
];

// Types de transition de carte
type CardTransition = 'slideFromRight' | 'slideFromLeft' | 'scaleUp' | 'slideFromTop';
const TRANSITIONS: CardTransition[] = ['slideFromRight', 'slideFromLeft', 'scaleUp', 'slideFromTop'];

// ─── Carte animée (zone haute) ───────────────────────────────────────────────

const TopCard: React.FC<{
  line: Word[];
  lineIdx: number;
  frame: number;
  fps: number;
  width: number;
  height: number;
  accentColor: string;
}> = ({ line, lineIdx, frame, fps, width, height, accentColor }) => {
  const lineStartFrame = Math.round(line[0].start * fps);
  const elapsed = frame - lineStartFrame;

  const palette = CARD_PALETTES[lineIdx % CARD_PALETTES.length];
  const transition = TRANSITIONS[lineIdx % TRANSITIONS.length];

  const prog = spring({
    frame: elapsed,
    fps,
    config: { damping: 16, stiffness: 220, mass: 0.5 },
  });

  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  if (transition === 'slideFromRight') {
    translateX = interpolate(prog, [0, 1], [width, 0], { extrapolateRight: 'clamp' });
  } else if (transition === 'slideFromLeft') {
    translateX = interpolate(prog, [0, 1], [-width, 0], { extrapolateRight: 'clamp' });
  } else if (transition === 'scaleUp') {
    scale = interpolate(prog, [0, 1], [0.6, 1.0], { extrapolateRight: 'clamp' });
  } else if (transition === 'slideFromTop') {
    translateY = interpolate(prog, [0, 1], [-height, 0], { extrapolateRight: 'clamp' });
  }

  const opacity = interpolate(elapsed, [0, 3], [0, 1], { extrapolateRight: 'clamp' });

  // Mot principal = le plus long de la ligne (le plus "signifiant")
  const mainWord = line.reduce((a, b) => (b.word.length > a.word.length ? b : a)).word.trim().toUpperCase();
  // Contexte = tous les mots sauf le principal
  const context = line.map(w => w.word.trim()).join(' ');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: palette.bg,
        transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 50px',
        overflow: 'hidden',
      }}
    >
      {/* Barre accent gauche */}
      <div style={{
        position: 'absolute',
        left: 0, top: '20%', bottom: '20%',
        width: 8,
        background: palette.accent,
        borderRadius: '0 4px 4px 0',
      }} />

      {/* Numéro de ligne (style UI) */}
      <div style={{
        position: 'absolute',
        top: 24, right: 28,
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontWeight: 900,
        fontSize: 22,
        color: `${palette.accent}55`,
        letterSpacing: 4,
      }}>
        {String(lineIdx + 1).padStart(2, '0')}
      </div>

      {/* Mot principal en très grand */}
      <div style={{
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontWeight: 900,
        fontSize: 88,
        color: palette.accent,
        letterSpacing: -3,
        lineHeight: 0.9,
        textAlign: 'center',
        WebkitTextStroke: '2px rgba(0,0,0,0.3)',
        paintOrder: 'stroke fill',
        marginBottom: 16,
        maxWidth: '100%',
        wordBreak: 'break-word',
      }}>
        {mainWord}
      </div>

      {/* Phrase complète en dessous, petite */}
      <div style={{
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontWeight: 700,
        fontSize: 28,
        color: `${palette.text}88`,
        textAlign: 'center',
        letterSpacing: 1,
        maxWidth: '90%',
      }}>
        {context}
      </div>

      {/* Ligne déco bas */}
      <div style={{
        position: 'absolute',
        bottom: 20, left: 50, right: 50,
        height: 2,
        background: `linear-gradient(to right, ${palette.accent}00, ${palette.accent}, ${palette.accent}00)`,
      }} />
    </div>
  );
};

// ─── Mot animé (sous-titres) ─────────────────────────────────────────────────

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
    ? spring({ frame: frame - startFrame, fps, config: { damping: 7, stiffness: 480, mass: 0.2 } })
    : 1;

  const scale = isActive
    ? interpolate(progress, [0, 0.45, 1], [1.7, 0.92, 1.0], { extrapolateRight: 'clamp' })
    : 1;

  const color = isActive ? accentColor : isPast ? `${primaryColor}55` : primaryColor;

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
          ? `drop-shadow(0 0 16px ${accentColor}CC) drop-shadow(0 0 32px ${accentColor}55)`
          : 'none',
        transition: 'color 40ms',
      }}
    >
      {text}
    </span>
  );
};

// ─── Ligne sous-titres (slide-up simple) ─────────────────────────────────────

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

  const prog = spring({ frame: elapsed, fps, config: { damping: 14, stiffness: 300, mass: 0.4 } });
  const translateY = interpolate(prog, [0, 1], [50, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(elapsed, [0, 4], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
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
      padding: '0 24px',
      maxWidth: '100%',
    }}>
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
  fontSize = 70,
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

  return (
    <AbsoluteFill style={{ background: '#000' }}>

      {/* ── Zone haute : cartes animées ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width, height: topHeight, overflow: 'hidden',
      }}>
        {/* Fond par défaut quand pas de ligne active */}
        <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A' }} />

        {/* Affiche la carte de la ligne courante ET la précédente (pour transition) */}
        {lines.map((line, idx) => {
          const lineStart = Math.round(line[0].start * fps);
          const lineEnd   = Math.round(line[line.length - 1].end * fps);
          const isVisible = frame >= lineStart && frame <= lineEnd + 10;
          if (!isVisible) return null;
          return (
            <TopCard
              key={idx}
              line={line}
              lineIdx={idx}
              frame={frame}
              fps={fps}
              width={width}
              height={topHeight}
              accentColor={accentColor}
            />
          );
        })}

        {/* Dégradé bas */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: 80,
          background: 'linear-gradient(to bottom, transparent, #000)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Séparateur ── */}
      <div style={{
        position: 'absolute', top: topHeight - 1, left: 0,
        width: '100%', height: 2,
        background: 'rgba(255,255,255,0.08)',
      }} />

      {/* ── Zone basse : face cam ── */}
      <div style={{
        position: 'absolute', top: topHeight, left: 0, width, height: bottomHeight, overflow: 'hidden',
      }}>
        <Video
          src={staticFile(videoFile)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Dégradé haut */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 70,
          background: 'linear-gradient(to top, transparent, #000)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* ── Sous-titres à la jonction ── */}
      {currentLine && (
        <div style={{
          position: 'absolute',
          top: topHeight - 68,
          left: 0, width,
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
