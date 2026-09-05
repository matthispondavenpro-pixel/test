import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

export const Scene2_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const titleY = spring({ frame, fps, from: 60, to: 0, config: { damping: 12 } });
  const bodyY = spring({ frame: Math.max(0, frame - 15), fps, from: 60, to: 0, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 80,
        paddingRight: 80,
        flexDirection: 'column',
        opacity,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 30,
          fontWeight: 700,
          color: COLORS.primary,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 32,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Le problème
      </div>

      {/* Titre */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 76,
          fontWeight: 900,
          color: COLORS.text,
          lineHeight: 1.15,
          marginBottom: 48,
          transform: `translateY(${titleY}px)`,
        }}
      >
        La plupart des gens perdent leur temps sans le savoir.
      </div>

      {/* Texte body */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 42,
          fontWeight: 400,
          color: COLORS.textMuted,
          lineHeight: 1.5,
          transform: `translateY(${bodyY}px)`,
        }}
      >
        Ils font les mêmes erreurs encore et encore — sans résultats.
      </div>
    </AbsoluteFill>
  );
};
