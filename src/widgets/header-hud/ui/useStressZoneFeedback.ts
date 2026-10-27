import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSettingsStore } from '@features/settings';
import { gameEvents } from '@entities/game-events';
import { useMotionPreference } from '@shared/lib/motion';
import { durations } from '@shared/theme';
import { isInStressZone } from '../model/stressZone';

const SHAKE_OFFSETS = [-3, 3, -2, 2, 0];
const SHAKE_STEP_MS = Math.round(durations.instant / 1.5);

/**
 * Stress zone feedback (T-015, T-022): one haptic and one short shake of the warning caption when the
 * engine reports `stress_overload_entered` (stress crossed into the throttling zone). Staying in the zone
 * does not repeat it; the pulse on the meter does the continuous part. Loading a save never emits the
 * event, so starting a session already in the zone does not fire. Haptics respect the setting; the shake
 * is skipped under reduced motion.
 */
export function useStressZoneFeedback(stress: number) {
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const { reducedMotion } = useMotionPreference();
  const hapticsRef = useRef(hapticsEnabled);
  const reducedMotionRef = useRef(reducedMotion);
  hapticsRef.current = hapticsEnabled;
  reducedMotionRef.current = reducedMotion;
  const shakeX = useSharedValue(0);

  useEffect(() => gameEvents.subscribe((event) => {
    if (event.type !== 'stress_overload_entered') return;
    if (hapticsRef.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
    if (!reducedMotionRef.current) {
      shakeX.value = withSequence(...SHAKE_OFFSETS.map((offset) => withTiming(offset, { duration: SHAKE_STEP_MS })));
    }
  }), [shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  return { inZone: isInStressZone(stress), shakeStyle };
}
