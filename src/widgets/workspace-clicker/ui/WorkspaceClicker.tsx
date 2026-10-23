import { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PointerEvent,
} from 'react-native';
import { useCurrencyStore } from '@entities/currency';
import { useSkillStore } from '@widgets/skills-catalog/model/skillStore';
import { formatCurrency } from '@shared/lib/formatters';
import { DevGlyph } from '@shared/ui';
import { colors, getRankTheme, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { useSettingsStore } from '@features/settings';
import { toLocalSurfacePoint } from '../model/touchCoordinates';

const FLOATER_LIFETIME_MS = 1_050;
const MAX_FLOATERS = 20;
const HAPTIC_THROTTLE_MS = 60;

interface FloatingNumber {
  id: number;
  text: string;
  isCrit: boolean;
  x: number;
  y: number;
  reducedMotion: boolean;
}

export function WorkspaceClicker() {
  useLocale();
  const currentRank = useSkillStore((state) => state.currentRank);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const rankTheme = getRankTheme(currentRank);
  const tap = useCurrencyStore((state) => state.tap);
  const [pressed, setPressed] = useState(false);
  const [floaters, setFloaters] = useState<FloatingNumber[]>([]);
  const scale = useRef(new Animated.Value(1)).current;

  // The single, direct container for both hit-testing and floaters
  const touchSurfaceRef = useRef<React.ElementRef<typeof Pressable>>(null);
  const surfaceBounds = useRef<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const activePointers = useRef(new Set<number>());
  const nextFloaterId = useRef(0);
  const cleanupTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastHapticAt = useRef(0);

  useEffect(() => () => {
    cleanupTimers.current.forEach(clearTimeout);
  }, []);

  const updateBounds = useCallback(() => {
    const el = touchSurfaceRef.current as unknown as { getBoundingClientRect?: () => DOMRect };
    if (Platform.OS === 'web' && el && typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      surfaceBounds.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      return;
    }

    if (touchSurfaceRef.current && typeof touchSurfaceRef.current.measureInWindow === 'function') {
      touchSurfaceRef.current.measureInWindow((x, y, width, height) => {
        surfaceBounds.current = { left: x, top: y, width, height };
      });
    }
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    surfaceBounds.current.width = width;
    surfaceBounds.current.height = height;
    updateBounds();
  }, [updateBounds]);

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
    const text = result.isCritical
      ? `${formatCurrency(result.capital)} ${t('workspace.crit')}`
      : `+${formatCurrency(result.capital)}`;

    triggerHaptic(result.isCritical);

    setFloaters((prev) => [
      ...prev.slice(-(MAX_FLOATERS - 1)),
      { id, text, isCrit: result.isCritical, x, y, reducedMotion },
    ]);

    const timer = setTimeout(() => {
      setFloaters((prev) => prev.filter((item) => item.id !== id));
      cleanupTimers.current = cleanupTimers.current.filter((active) => active !== timer);
    }, FLOATER_LIFETIME_MS);
    cleanupTimers.current.push(timer);
  }, [reducedMotion, tap, triggerHaptic]);

  // Pointer event for Web (multi-touch and precise click coordinates)
  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (Platform.OS !== 'web') return;
    if (event.nativeEvent.pointerType === 'mouse' && event.nativeEvent.button !== 0) return;
    const pointerId = event.nativeEvent.pointerId;
    if (activePointers.current.has(pointerId)) return;
    activePointers.current.add(pointerId);
    setPressed(true);

    // On Web, calculate precisely against the live getBoundingClientRect of this exact element
    const el = touchSurfaceRef.current as unknown as { getBoundingClientRect?: () => DOMRect };
    let rect = surfaceBounds.current;
    if (el && typeof el.getBoundingClientRect === 'function') {
      const liveRect = el.getBoundingClientRect();
      rect = {
        left: liveRect.left,
        top: liveRect.top,
        width: liveRect.width,
        height: liveRect.height,
      };
      surfaceBounds.current = rect;
    }

    const clientX = typeof event.nativeEvent.clientX === 'number'
      ? event.nativeEvent.clientX
      : event.nativeEvent.pageX;
    const clientY = typeof event.nativeEvent.clientY === 'number'
      ? event.nativeEvent.clientY
      : event.nativeEvent.pageY;

    const { x, y } = toLocalSurfacePoint({ clientX, clientY }, rect);
    spawnFloater(x, y);
  }, [spawnFloater]);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (Platform.OS !== 'web') return;
    activePointers.current.delete(event.nativeEvent.pointerId);
    if (activePointers.current.size === 0) {
      setPressed(false);
    }
  }, []);

  // Native press/touch event handlers (reliable on physical iOS/Android devices)
  const handleNativePressIn = useCallback((event: GestureResponderEvent) => {
    if (Platform.OS === 'web') return;
    setPressed(true);

    const { locationX, locationY } = event.nativeEvent;
    // On native, locationX / locationY are relative to the Pressable touch surface itself
    const fallbackX = surfaceBounds.current.width > 0 ? surfaceBounds.current.width / 2 : 150;
    const fallbackY = surfaceBounds.current.height > 0 ? surfaceBounds.current.height / 2 : 120;

    const x = typeof locationX === 'number' && Number.isFinite(locationX) ? locationX : fallbackX;
    const y = typeof locationY === 'number' && Number.isFinite(locationY) ? locationY : fallbackY;

    spawnFloater(x, y);
  }, [spawnFloater]);

  const handleNativePressOut = useCallback(() => {
    if (Platform.OS === 'web') return;
    setPressed(false);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: pressed ? 0.98 : 1,
      speed: 36,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }, [pressed, reducedMotion, scale]);

  return (
    <Pressable
      ref={touchSurfaceRef}
      accessibilityRole="button"
      accessibilityLabel={t('workspace.hint')}
      onLayout={handleLayout}
      onPressIn={handleNativePressIn}
      onPressOut={handleNativePressOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={styles.container}
    >
      <View pointerEvents="none" style={styles.statusRow}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{t('status.prod')}</Text>
        </View>
        <Text style={styles.sessionText}>{t('app.session')}</Text>
      </View>

      <View pointerEvents="none" style={styles.editorWrap}>
        <View style={styles.touchSurface}>
          {/* Animated visual surface */}
          <Animated.View style={[styles.laptopButton, { borderColor: rankTheme.border, backgroundColor: rankTheme.surfaceTint, transform: [{ scale }] }]}>
            <View pointerEvents="none" style={styles.editorHeader}>
              <View style={styles.fileTab}>
                <DevGlyph name="code" size={13} color={colors.accent.phosphor} />
                <Text style={styles.fileName}>{t('workspace.fileHeader')}</Text>
              </View>
              <Text style={styles.fileMeta}>UTF-8  LF</Text>
            </View>

            <View pointerEvents="none" style={styles.codeArea}>
              <View style={styles.lineNumbersColumn}>
                {['01', '02', '03'].map((line) => (
                  <Text key={line} style={styles.lineNumber}>{line}</Text>
                ))}
              </View>
              <View style={styles.codeLinesColumn}>
                {[t('workspace.line1'), t('workspace.line2'), t('workspace.line3')].map((code) => (
                  <Text key={code} style={styles.codeLine} numberOfLines={1}>{code}</Text>
                ))}
              </View>
            </View>

            <View pointerEvents="none" style={styles.editorFooter}>
              <View style={styles.branchRow}>
                <DevGlyph name="git-branch" size={14} color={colors.accent.amber} />
                <Text style={styles.branchText}>{t('app.branch')}</Text>
              </View>
              <Text style={styles.commitText}>{t('app.commit')}</Text>
            </View>

            <View pointerEvents="none" style={styles.keyboard}>
              {Array.from({ length: 15 }).map((_, index) => (
                <View key={index} style={[styles.key, index === 12 && styles.keyWide]} />
              ))}
            </View>

            <Text pointerEvents="none" style={styles.tapPrompt}>{t('workspace.prompt')}</Text>
            <Text pointerEvents="none" style={styles.tapSub}>{t('workspace.hint')}</Text>
          </Animated.View>

          {/* Floaters layer shares the exact unscaled bounding space of touchSurface */}
          <View style={styles.floatersLayer} pointerEvents="none">
            {floaters.map((floater) => (
              <AnimatedFloater key={floater.id} floater={floater} />
            ))}
          </View>
        </View>
      </View>
    </Pressable>
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
          {floater.text}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  statusRow: { flexDirection: 'row', width: '100%', paddingHorizontal: spacing.xl, justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, backgroundColor: colors.accent.phosphor, borderRadius: radii.full },
  statusText: { color: colors.accent.phosphor, fontSize: typography.sizes.xxs, fontWeight: '900', letterSpacing: 1 },
  sessionText: { color: colors.text.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  editorWrap: { marginTop: spacing.md, width: 300 },
  touchSurface: { position: 'relative', width: '100%' },
  laptopButton: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.active,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'stretch',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 7,
  },
  rank0: { borderColor: colors.border.active },
  rank1: { borderColor: colors.accent.phosphorDim },
  rank2: { borderColor: colors.accent.cyanBright },
  rank3: { borderColor: colors.accent.amber },
  rank4: { borderColor: colors.accent.violetBright },
  rank5: { borderColor: colors.accent.rustBright },
  rank6: { borderColor: colors.accent.phosphorBright },
  rank7: { borderColor: colors.accent.cyanBright, shadowOpacity: 0.6 },
  rank8: { borderColor: colors.accent.amberBright, shadowOpacity: 0.7 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border.subtle, paddingBottom: spacing.sm },
  fileTab: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fileName: { color: colors.text.secondary, fontFamily: typography.mono, fontSize: 10 },
  fileMeta: { color: colors.text.muted, fontFamily: typography.mono, fontSize: 9 },
  codeArea: {
    backgroundColor: colors.bg.inset,
    minHeight: 104,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lineNumbersColumn: {
    width: 24,
    alignItems: 'flex-end',
  },
  codeLinesColumn: {
    flex: 1,
    minWidth: 0,
  },
  lineNumber: { color: colors.text.muted, fontFamily: typography.mono, fontSize: 11, lineHeight: 22 },
  codeLine: { color: colors.accent.phosphor, fontFamily: typography.mono, fontSize: 11, lineHeight: 22 },
  editorFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.inset, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchText: { color: colors.accent.amber, fontFamily: typography.mono, fontSize: 10 },
  commitText: { color: colors.text.muted, fontFamily: typography.mono, fontSize: 10 },
  keyboard: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  key: { width: 17, height: 8, borderRadius: 2, backgroundColor: colors.border.active },
  keyWide: { width: 48 },
  tapPrompt: { color: colors.text.primary, fontFamily: typography.mono, fontWeight: '900', fontSize: typography.sizes.sm, letterSpacing: 1.2, marginTop: spacing.md },
  tapSub: { color: colors.text.secondary, fontSize: typography.sizes.xs, marginTop: 4 },
  floatersLayer: { ...StyleSheet.absoluteFillObject, zIndex: 30 },
  floaterAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
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
