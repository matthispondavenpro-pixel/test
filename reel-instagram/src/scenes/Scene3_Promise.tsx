import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

export const Scene3_Promise: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, from: 0.85, to: 1, config: { damping: 14 } });

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
      <div
        style={{
          transform: `scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Icône */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: COLORS.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 48,
          }}
        >
          <span style={{ fontSize: 60 }}>✓</span>
        </div>

        {/* Titre */}
        <div
          style={{
            fontFamily: FONT.main,
            fontSize: 80,
            fontWeight: 900,
            color: COLORS.text,
            textAlign: 'center',
            lineHeight: 1.15,
            marginBottom: 32,
          }}
        >
          Voici comment vraiment progresser.
        </div>

        {/* Sous-titre */}
        <div
          style={{
            fontFamily: FONT.main,
            fontSize: 40,
            fontWeight: 400,
            color: COLORS.textMuted,
            textAlign: 'center',
          }}
        >
          3 règles simples. Applicables dès aujourd'hui.
        </div>
      </div>
    </AbsoluteFill>
  );
};
