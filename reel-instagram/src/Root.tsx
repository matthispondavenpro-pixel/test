import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { VIDEO, TOTAL_FRAMES } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MainVideo"
      component={MainVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
