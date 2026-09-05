import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Background } from './components/Background';
import { Scene1_Hook } from './scenes/Scene1_Hook';
import { Scene2_Problem } from './scenes/Scene2_Problem';
import { Scene3_Promise } from './scenes/Scene3_Promise';
import { Scene4_Point1 } from './scenes/Scene4_Point1';
import { Scene5_Point2 } from './scenes/Scene5_Point2';
import { Scene6_Point3 } from './scenes/Scene6_Point3';
import { Scene7_Recap } from './scenes/Scene7_Recap';
import { Scene8_CTA } from './scenes/Scene8_CTA';
import { SCENES } from './theme';

const SCENE_LIST = [
  { component: Scene1_Hook, duration: SCENES.hook },
  { component: Scene2_Problem, duration: SCENES.problem },
  { component: Scene3_Promise, duration: SCENES.promise },
  { component: Scene4_Point1, duration: SCENES.point1 },
  { component: Scene5_Point2, duration: SCENES.point2 },
  { component: Scene6_Point3, duration: SCENES.point3 },
  { component: Scene7_Recap, duration: SCENES.recap },
  { component: Scene8_CTA, duration: SCENES.cta },
];

const Transition: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  let currentFrame = 0;
  return (
    <AbsoluteFill>
      <Background />
      {SCENE_LIST.map(({ component: SceneComponent, duration }, i) => {
        const from = currentFrame;
        currentFrame += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <Transition durationInFrames={duration}>
              <SceneComponent />
            </Transition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
