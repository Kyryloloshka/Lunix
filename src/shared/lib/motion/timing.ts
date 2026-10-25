import { Easing, type WithTimingConfig } from 'react-native-reanimated';
import { easings, resolveDuration, type DurationToken, type EasingToken, type MotionKind } from '../../theme/motion';

/** Reanimated easing for a motion token. */
export function motionEasing(token: EasingToken) {
  const [x1, y1, x2, y2] = easings[token];
  return Easing.bezier(x1, y1, x2, y2);
}

/** `withTiming` config from tokens, already resolved for the motion preference. */
export function timingConfig(
  duration: DurationToken | number,
  reducedMotion: boolean,
  { easing = 'standard', kind = 'motion' }: { easing?: EasingToken; kind?: MotionKind } = {},
): WithTimingConfig {
  return { duration: resolveDuration(duration, reducedMotion, kind), easing: motionEasing(easing) };
}
