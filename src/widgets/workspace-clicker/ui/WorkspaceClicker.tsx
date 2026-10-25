import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import {
  GestureDetector,
  GestureStateManager,
  useManualGesture,
  type GestureTouchEvent,
} from 'react-native-gesture-handler';
import { useCurrencyStore, type TapResource } from '@entities/currency';
import type { Decimal } from '@shared/lib/decimal';
import { useSkillStore } from '@features/purchase-skill';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { ResourceValue } from '@shared/ui';
import { colors, getRankTheme, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { useSettingsStore } from '@features/settings';
import { useMotionPreference } from '@shared/lib/motion';
import { toZonePoint, zoneCenter, type ZoneSize } from '../model/touchCoordinates';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';

const FLOATER_LIFETIME_MS = 1_050;
const MAX_FLOATERS = 20;
const HAPTIC_THROTTLE_MS = 60;
// Wide enough for the longest crit label so the text never wraps
const FLOATER_ANCHOR_WIDTH = 240;
// Non-zero so Android doesn't measure the floater text at height 0 and draw nothing
const FLOATER_ANCHOR_HEIGHT = 48;

const TAP_HINT: Record<TapResource, string> = {
  cognitive: 'workspace.hintCognitive',
  capital: 'workspace.hintCapital',
  influence: 'workspace.hintInfluence',
};

const FORMAT_TAP: Record<TapResource, (value: Decimal) => string> = {
  cognitive: (value) => formatDecimal(value),
  capital: (value) => formatCurrency(value),
  influence: (value) => formatDecimal(value),
};

interface FloatingNumber {
  id: number;
  /** Formatted amount; the resource glyph and the crit label are drawn after it. */
  text: string;
  resource: TapResource;
  isCrit: boolean;
  /** Real output multiplier of the crit (from the model), shown as "CRIT ×N". */
  multiplier: number;
  x: number;
  y: number;
  reducedMotion: boolean;
}

const A11Y_ACTIONS = [{ name: 'activate' as const }];

export interface WorkspaceClickerProps {
  /**
   * Non-interactive content drawn at the top of the tap zone (e.g. the page's rank kicker).
   * Taps on it count as taps; it must not contain buttons.
   */
  header?: ReactNode;
  /**
   * Interactive controls drawn above the tap zone (next-goal chip, tap-mode switch from T-016 stage 5).
   * Rendered as a sibling on top of the zone, outside the gesture detector, so pressing them never pays
   * out. The layer is `box-none`: only the controls themselves catch touches, the rest falls through.
   */
  overlay?: ReactNode;
}

/**
 * The Console tab's tap zone (T-012): the whole area between HUD and dock earns on tap, the editor is
 * only the visual centre. Every finger is its own tap and gets a floater at its touch point.
 */
export function WorkspaceClicker({ header, overlay }: WorkspaceClickerProps = {}) {
  useLocale();
  const currentRank = useSkillStore((state) => state.currentRank);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const { reducedMotion } = useMotionPreference();
  const rankTheme = useMemo(() => getRankTheme(currentRank), [currentRank]);
  // Boolean/number selectors: the zone only re-renders when Flow starts or ends, not on every tick
  const flowActive = useCurrencyStore((state) => state.flow.isActive);
  const flowMultiplier = useCurrencyStore((state) => state.flow.multiplier);
  const tap = useSkillStore((state) => state.tap);
  // Feedback must match the effect: the hint names what a tap produces right now.
  const tapResource = useSkillStore((state) => state.tapResource);
  const tapHint = t(TAP_HINT[tapResource]);
  const [pressed, setPressed] = useState(false);
  const [floaters, setFloaters] = useState<FloatingNumber[]>([]);
  const editorRef = useRef<CodeEditorHandle>(null);

  // Size of the tap zone; the floaters layer covers it exactly, so touch coords need no offset
  const zoneSize = useRef<ZoneSize | null>(null);

  const activePointers = useRef(new Set<number>());
  const nextFloaterId = useRef(0);
  const cleanupTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastHapticAt = useRef(0);

  useEffect(() => () => {
    cleanupTimers.current.forEach(clearTimeout);
  }, []);

  const handleZoneLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    zoneSize.current = { width, height };
  }, []);

  const triggerHaptic = useCallback((isCritical: boolean) => {
    if (!hapticsEnabled) return;
    const now = Date.now();
    if (isCritical || now - lastHapticAt.current >= HAPTIC_THROTTLE_MS) {
      lastHapticAt.current = now;
      void Haptics.impactAsync(
        isCritical ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);
    }
  }, [hapticsEnabled]);

  const spawnFloater = useCallback((x: number, y: number) => {
    const result = tap();
    const id = ++nextFloaterId.current;
    const amount = FORMAT_TAP[result.resource](result.amount);
    const text = result.isCritical ? amount : `+${amount}`;

    triggerHaptic(result.isCritical);
    editorRef.current?.onTap({ isCritical: result.isCritical, multiplier: result.multiplier });

    const point = toZonePoint({ x, y }, zoneSize.current);
    setFloaters((prev) => [
      ...prev.slice(-(MAX_FLOATERS - 1)),
      { id, text, resource: result.resource, isCrit: result.isCritical, multiplier: result.multiplier, x: point.x, y: point.y, reducedMotion },
    ]);

    const timer = setTimeout(() => {
      setFloaters((prev) => prev.filter((item) => item.id !== id));
      cleanupTimers.current = cleanupTimers.current.filter((active) => active !== timer);
    }, FLOATER_LIFETIME_MS);
    cleanupTimers.current.push(timer);
  }, [reducedMotion, tap, triggerHaptic]);

  // Screen readers expose the zone as one button; "activate" is one tap with a floater in the middle
  const handleAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName !== 'activate') return;
    const center = zoneCenter(zoneSize.current);
    spawnFloater(center.x, center.y);
  }, [spawnFloater]);

  // Every new finger is its own tap: changedTouches carries zone-relative x/y per pointer (native and web)
  const handleTouchesDown = useCallback((event: GestureTouchEvent) => {
    GestureStateManager.activate(event.handlerTag);
    for (const touch of event.changedTouches) {
      if (activePointers.current.has(touch.id)) continue;
      activePointers.current.add(touch.id);
      spawnFloater(touch.x, touch.y);
    }
    setPressed(true);
  }, [spawnFloater]);

  const handleTouchesUp = useCallback((event: GestureTouchEvent) => {
    for (const touch of event.changedTouches) {
      activePointers.current.delete(touch.id);
    }
    if (activePointers.current.size === 0) {
      setPressed(false);
    }
  }, []);

  const handleGestureFinalize = useCallback(() => {
    activePointers.current.clear();
    setPressed(false);
  }, []);

  const tapGesture = useManualGesture({
    runOnJS: true,
    onTouchesDown: handleTouchesDown,
    onTouchesUp: handleTouchesUp,
    onTouchesCancel: handleTouchesUp,
    onFinalize: handleGestureFinalize,
  });

  return (
    <View style={styles.root}>
      <GestureDetector gesture={tapGesture}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={tapHint}
          accessibilityActions={A11Y_ACTIONS}
          onAccessibilityAction={handleAccessibilityAction}
          onLayout={handleZoneLayout}
          style={styles.container}
          testID="workspace-tap-zone"
        >
          {header ? <View pointerEvents="none">{header}</View> : null}
          <CodeEditor
            ref={editorRef}
            rank={currentRank}
            tapResource={tapResource}
            rankTheme={rankTheme}
            flowActive={flowActive}
            flowMultiplier={flowMultiplier}
            pressed={pressed}
            tapHint={tapHint}
          />

          {/* Floaters cover the whole zone, so a tap anywhere shows its number at the touch point */}
          <View style={styles.floatersLayer} pointerEvents="none">
            {floaters.map((floater) => (
              <AnimatedFloater key={floater.id} floater={floater} />
            ))}
          </View>
        </View>
      </GestureDetector>
      {overlay ? (
        <View pointerEvents="box-none" style={styles.overlayLayer}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

const AnimatedFloater = memo(function AnimatedFloater({ floater }: { floater: FloatingNumber }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (floater.reducedMotion) {
      const animation = Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true });
      animation.start();
      return () => animation.stop();
    }
    const animation = Animated.parallel([
      Animated.timing(translateY, { toValue: -64, duration: FLOATER_LIFETIME_MS, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(scale, { toValue: 1, speed: 38, bounciness: 6, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [floater.reducedMotion, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.floaterAnchor,
        {
          left: floater.x,
          top: floater.y,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.floaterPill, floater.isCrit && styles.floaterPillCrit]}>
        <Text style={[styles.floaterText, floater.isCrit && styles.floaterCritText]}>
          <ResourceValue kind={floater.resource}>{floater.text}</ResourceValue>
          {floater.isCrit ? ` ${t('workspace.crit', { multiplier: floater.multiplier })}` : null}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, overflow: 'hidden' },
  overlayLayer: { ...StyleSheet.absoluteFill, zIndex: 40 },
  floatersLayer: { ...StyleSheet.absoluteFill, zIndex: 30 },
  floaterAnchor: {
    position: 'absolute',
    width: FLOATER_ANCHOR_WIDTH,
    marginLeft: -FLOATER_ANCHOR_WIDTH / 2,
    height: FLOATER_ANCHOR_HEIGHT,
    marginTop: -FLOATER_ANCHOR_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floaterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.accent.phosphorBg,
    borderWidth: 1,
    borderColor: colors.accent.phosphorDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floaterPillCrit: {
    backgroundColor: colors.accent.amberBg,
    borderColor: colors.accent.amber,
  },
  floaterText: { color: colors.accent.phosphorBright, fontFamily: typography.mono, fontSize: typography.sizes.sm, fontWeight: '900' },
  floaterCritText: { color: colors.accent.amberBright },
});
