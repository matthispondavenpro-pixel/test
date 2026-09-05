import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

export const Scene1_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, from: 1.4, to: 1, config: { damping: 8 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const lineWidth = interpolate(frame, [20, 60], [0, 300], { extrapolateRight: 'clamp' });

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
      {/* Badge */}
      <div
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 50,
          paddingLeft: 32,
          paddingRight: 32,
          paddingTop: 14,
          paddingBottom: 14,
          marginBottom: 48,
          transform: `scale(${scale})`,
        }}
      >
        <span
          style={{
            fontFamily: FONT.main,
            fontSize: 32,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Stop tout de suite
        </span>
      </div>

      {/* Titre principal */}
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 96,
          fontWeight: 900,
          color: COLORS.text,
          textAlign: 'center',
          lineHeight: 1.1,
          transform: `scale(${scale})`,
        }}
      >
        Tu fais ça mal.
      </div>

      {/* Ligne décorative */}
      <div
        style={{
          width: lineWidth,
          height: 5,
          backgroundColor: COLORS.primary,
          borderRadius: 3,
          marginTop: 40,
        }}
      />
    </AbsoluteFill>
  );
};
