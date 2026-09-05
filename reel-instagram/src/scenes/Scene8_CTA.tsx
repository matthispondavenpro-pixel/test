import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

export const Scene8_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, from: 0.8, to: 1, config: { damping: 10 } });
  const btnScale = spring({ frame: Math.max(0, frame - 20), fps, from: 0, to: 1, config: { damping: 10 } });
  const subY = spring({ frame: Math.max(0, frame - 35), fps, from: 40, to: 0, config: { damping: 12 } });

  const glowOpacity = Math.sin(frame * 0.12) * 0.3 + 0.7;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 80,
        paddingRight: 80,
        flexDirection: 'column',
        opacity,
      }}
    >
      {/* Titre CTA */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 80,
          fontWeight: 900,
          color: COLORS.text,
          textAlign: 'center',
          lineHeight: 1.15,
          marginBottom: 60,
          transform: `scale(${scale})`,
        }}
      >
        Tu appliques laquelle en premier ?
      </div>

      {/* Bouton rouge */}
      <div
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 60,
          paddingLeft: 64,
          paddingRight: 64,
          paddingTop: 32,
          paddingBottom: 32,
          transform: `scale(${btnScale})`,
          opacity: glowOpacity,
          boxShadow: `0 0 40px rgba(224,32,32,0.3)`,
          marginBottom: 60,
        }}
      >
        <span
          style={{
            fontFamily: FONT.main,
            fontSize: 44,
            fontWeight: 700,
            color: '#FFFFFF',
          }}
        >
          Commente ci-dessous 👇
        </span>
      </div>

      {/* Username */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 36,
          fontWeight: 600,
          color: COLORS.textMuted,
          transform: `translateY(${subY}px)`,
        }}
      >
        @ton_username
      </div>
    </AbsoluteFill>
  );
};
