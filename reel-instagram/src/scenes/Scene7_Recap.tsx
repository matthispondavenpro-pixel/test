import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../theme';

const items = [
  { num: '01', text: 'Sois constant, pas parfait' },
  { num: '02', text: 'Mesure ce qui compte' },
  { num: '03', text: 'Crée plutôt que consommer' },
];

export const Scene7_Recap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

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
      <div
        style={{
          fontFamily: FONT.main,
          fontSize: 36,
          fontWeight: 700,
          color: COLORS.primary,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 48,
        }}
      >
        En résumé
      </div>

      {items.map(({ num, text }, i) => {
        const y = spring({
          frame: Math.max(0, frame - i * 12),
          fps,
          from: 50,
          to: 0,
          config: { damping: 12 },
        });

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 40,
              transform: `translateY(${y}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT.main,
                fontSize: 52,
                fontWeight: 900,
                color: COLORS.primary,
                width: 100,
                flexShrink: 0,
              }}
            >
              {num}
            </div>
            <div
              style={{
                fontFamily: FONT.main,
                fontSize: 48,
                fontWeight: 700,
                color: COLORS.text,
                lineHeight: 1.2,
              }}
            >
              {text}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
