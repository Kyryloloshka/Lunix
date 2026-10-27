import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timingConfig, useMotionPreference } from '@shared/lib/motion';
import { colors, durations, radii } from '@shared/theme';

/** How far (dp) the "+X/s" label flies up, towards the HUD. */
const FLY_DISTANCE = 44;
/** Scale the flash ring grows to. */
const RING_END_SCALE = 1.12;
/** The ring is brightest at first, then settles; the label stays readable until late in the flight. */
const LABEL_HOLD = 0.55;

interface PurchasePulseProps {
  /** Called once the animation is over, so the owner can unmount the pulse. */
  onDone: () => void;
  /** Gain label such as "+1.2K/s", drawn over the card and flying up. Omit for a bare flash. */
  label?: ReactNode;
}

/**
 * Purchase feedback laid over a card (T-015): a ring that expands and fades, and optionally a gain label
 * that flies towards the HUD. Mount it only on the card that was just bought: a single instance exists at
 * a time, so lists pay nothing for it. Runs on the UI thread. Under reduced motion the ring is a short
 * color fade and the label stays put and fades.
 */
export function PurchasePulse({ onDone, label }: PurchasePulseProps) {
  const { reducedMotion } = useMotionPreference();
  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const finish = () => onDoneRef.current();
    const config = timingConfig(label ? durations.celebrate : durations.slow, reducedMotion, { kind: 'fade', easing: 'decelerate' });
    progress.value = withTiming(1, config, (finished) => {
      if (finished) runOnJS(finish)();
    });
    // The pulse plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - progress.value),
    transform: [{ scale: reducedMotion ? 1 : 1 + (RING_END_SCALE - 1) * progress.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value < LABEL_HOLD ? 1 : 1 - (progress.value - LABEL_HOLD) / (1 - LABEL_HOLD),
    transform: [{ translateY: reducedMotion ? 0 : -FLY_DISTANCE * progress.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[styles.ring, ringStyle]} />
      {label ? <Animated.View style={[styles.label, labelStyle]}>{label}</Animated.View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: 5 },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: colors.accent.amber,
    borderRadius: radii.md,
    backgroundColor: colors.accent.phosphorBg,
  },
  // Sits on the card's right edge (over the buy button) and rises from there.
  label: { position: 'absolute', right: 12, top: 4 },
});
