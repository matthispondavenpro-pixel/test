import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

export const Scene4_Point1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, from: 60, to: 0, config: { damping: 12 } });
  const cardY = spring({ frame: Math.max(0, frame - 12), fps, from: 60, to: 0, config: { damping: 12 } });

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
      {/* Numéro */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 140,
          fontWeight: 900,
          color: COLORS.primary,
          lineHeight: 1,
          transform: `translateY(${titleY}px)`,
          marginBottom: 8,
        }}
      >
        01
      </div>

      {/* Titre */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 72,
          fontWeight: 900,
          color: COLORS.text,
          lineHeight: 1.15,
          transform: `translateY(${titleY}px)`,
          marginBottom: 40,
        }}
      >
        Sois constant, pas parfait.
      </div>

      {/* Card */}
      <div
        style={{
          backgroundColor: COLORS.surface,
          borderLeft: `6px solid ${COLORS.primary}`,
          borderRadius: 16,
          padding: 48,
          transform: `translateY(${cardY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT.main,
            fontSize: 40,
            fontWeight: 400,
            color: COLORS.textMuted,
            lineHeight: 1.5,
          }}
        >
          10 minutes par jour surpassent 2h une fois par semaine. La régularité construit ce que l'intensité ne peut pas.
        </div>
      </div>
    </AbsoluteFill>
  );
};
