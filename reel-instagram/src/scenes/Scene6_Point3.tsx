import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

export const Scene6_Point3: React.FC = () => {
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
        03
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
        Arrête de consommer. Commence à créer.
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
          Le scroll infini est l'ennemi du progrès. Chaque heure à regarder est une heure à ne pas faire.
        </div>
      </div>
    </AbsoluteFill>
  );
};
