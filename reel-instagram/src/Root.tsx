import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { VIDEO, TOTAL_FRAMES } from './theme';
import { VideoKit, VideoKitProps } from './VideoKit';

const defaultVideoKitProps: VideoKitProps = {
  videoFile: 'input.mp4',
  words: [],
  durationInFrames: 900,
  accentColor: '#E02020',
  primaryColor: '#111111',
  bgColor: '#ffffff',
  style: 'light',
  fontSize: 62,
  wordsPerLine: 4,
  popSoundFile: 'pop.wav',
  whooshSoundFile: 'whoosh.wav',
  useSounds: true,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={MainVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition
        id="VideoKit"
        component={VideoKit}
        defaultProps={defaultVideoKitProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: props.durationInFrames,
          fps: 30,
          width: 1080,
          height: 1920,
        })}
      />
    </>
  );
};
