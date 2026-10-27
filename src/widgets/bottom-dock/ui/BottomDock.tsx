import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timingConfig, useMotionPreference } from '@shared/lib/motion';
import { DENSE_TEXT_MAX_FONT_SCALE, DevGlyph, MIN_TOUCH_TARGET, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';

export type ActiveTab = 'work' | 'skills' | 'career' | 'leaders' | 'settings';

interface BottomDockProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  /** Tabs with something to do right now (T-003). Drawn as a dot and announced by screen readers. */
  badges?: Partial<Record<ActiveTab, boolean>>;
}

interface TabItem {
  id: ActiveTab;
  labelKey: string;
  icon: GlyphName;
}

const TABS: TabItem[] = [
  { id: 'work', labelKey: 'nav.work', icon: 'terminal' },
  { id: 'skills', labelKey: 'nav.skills', icon: 'cpu' },
  { id: 'career', labelKey: 'nav.career', icon: 'git-commit' },
  { id: 'leaders', labelKey: 'nav.leaders', icon: 'rank' },
  { id: 'settings', labelKey: 'nav.settings', icon: 'gear' },
];

/** i18n key of the spoken reason for a tab's badge. Tabs without a key never show a badge. */
const BADGE_KEYS: Partial<Record<ActiveTab, string>> = {
  skills: 'nav.badgeSkills',
  career: 'nav.badgeCareer',
};

export function BottomDock({ activeTab, onChangeTab, badges }: BottomDockProps) {
  useLocale();
  const { reducedMotion } = useMotionPreference();
  const [rowSize, setRowSize] = useState({ width: 0, height: 0 });
  const tabWidth = rowSize.width / TABS.length;
  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.id === activeTab));
  const indicatorX = useSharedValue(activeIndex * tabWidth);

  // The active-tab highlight glides between tabs on the UI thread; a resize (rotation) snaps without animation.
  const laidOutWidth = useRef(0);
  useEffect(() => {
    const target = activeIndex * tabWidth;
    if (laidOutWidth.current !== tabWidth) {
      laidOutWidth.current = tabWidth;
      indicatorX.value = target;
      return;
    }
    indicatorX.value = withTiming(target, timingConfig('base', reducedMotion, { easing: 'emphasized' }));
  }, [activeIndex, tabWidth, reducedMotion, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));
  const handleRowLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRowSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
  };

  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
        <View style={styles.tabRow} onLayout={handleRowLayout}>
        {rowSize.width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, { width: tabWidth, height: rowSize.height }, indicatorStyle]}
            testID="dock-indicator"
          />
        ) : null}
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeKey = badges?.[tab.id] ? BADGE_KEYS[tab.id] : undefined;
          const color = isActive ? colors.accent.phosphorBright : colors.text.muted;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={badgeKey ? `${t(tab.labelKey)}, ${t(badgeKey)}` : t(tab.labelKey)}
              accessibilityHint={badgeKey ? t('nav.badgeHint') : undefined}
              accessibilityState={{ selected: isActive }}
              onPress={() => onChangeTab(tab.id)}
              style={styles.tabButton}
            >
              <View>
                <DevGlyph name={tab.icon} size={16} color={color} />
                {badgeKey ? <View style={styles.badge} testID={`dock-badge-${tab.id}`} /> : null}
              </View>
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
                maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, paddingTop: spacing.xs, backgroundColor: 'transparent' },
  dock: { backgroundColor: colors.surface.raised, borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.lg, padding: spacing.xs, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  // Icon above label: five tabs fit at 320pt without the labels running into each other.
  tabButton: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH_TARGET + 4, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs, paddingHorizontal: 2, borderRadius: radii.md, gap: 3 },
  tabRow: { flexDirection: 'row', position: 'relative' },
  // The highlight behind the active tab; it slides between tabs instead of toggling a background on each.
  indicator: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.accent.phosphorBg, borderWidth: 1, borderColor: colors.accent.phosphorDim, borderRadius: radii.md },
  // A dot with a ring on the icon's corner: a shape the eye finds without relying on its hue alone.
  badge: { position: 'absolute', top: -3, right: -6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent.amberBright, borderWidth: 2, borderColor: colors.surface.raised },
  label: { fontFamily: typography.mono, fontSize: typography.sizes.xs, fontWeight: '800', color: colors.text.muted },
  labelActive: { color: colors.accent.phosphorBright },
});
