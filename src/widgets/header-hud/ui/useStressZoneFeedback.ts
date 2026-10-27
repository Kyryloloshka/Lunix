import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSettingsStore } from '@features/settings';
import { useMotionPreference } from '@shared/lib/motion';
import { durations } from '@shared/theme';
import { enteredStressZone, isInStressZone } from '../model/stressZone';

const SHAKE_OFFSETS = [-3, 3, -2, 2, 0];
const SHAKE_STEP_MS = Math.round(durations.instant / 1.5);

/**
 * Stress zone feedback (T-015): one haptic and one short shake of the warning caption on the update that
 * crosses into the throttling zone. Staying in the zone does not repeat it; the pulse on the meter does
 * the continuous part. Starting a session already in the zone does not fire (no surprise on load).
 * Haptics respect the setting; the shake is skipped under reduced motion.
 */
export function useStressZoneFeedback(stress: number) {
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const { reducedMotion } = useMotionPreference();
  const previous = useRef(stress);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    const entered = enteredStressZone(previous.current, stress);
    previous.current = stress;
    if (!entered) return;
    if (hapticsEnabled) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
    if (!reducedMotion) {
      shakeX.value = withSequence(...SHAKE_OFFSETS.map((offset) => withTiming(offset, { duration: SHAKE_STEP_MS })));
    }
    // Only a change of stress can enter the zone; settings changes must not replay the feedback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stress]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  return { inZone: isInStressZone(stress), shakeStyle };
}
