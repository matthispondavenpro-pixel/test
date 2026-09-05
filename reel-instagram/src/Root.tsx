import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { VIDEO, TOTAL_FRAMES } from './theme';
import { VideoKit, VideoKitProps } from './VideoKit';

const defaultVideoKitProps: VideoKitProps = {
  videoFile: 'input.mp4',
  brollFile: 'broll.mp4',
  words: [],
  durationInFrames: 900,
  accentColor: '#f59e0b',
  primaryColor: '#ffffff',
  fontSize: 56,
  wordsPerLine: 5,
  notifFile: 'notif.wav',
  useNotif: false,
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
