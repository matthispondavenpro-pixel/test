import { AbsoluteFill } from 'remotion';
import { COLORS } from '../theme';

export const Background: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Barre décorative rouge en bas */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          backgroundColor: COLORS.primary,
        }}
      />
    </AbsoluteFill>
  );
};
