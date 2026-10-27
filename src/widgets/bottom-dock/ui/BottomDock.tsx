import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
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
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
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
  );
}

const styles = StyleSheet.create({
  dockContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, paddingTop: spacing.xs, backgroundColor: 'transparent' },
  dock: { flexDirection: 'row', backgroundColor: colors.surface.raised, borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.lg, padding: spacing.xs, justifyContent: 'space-around', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  // Icon above label: five tabs fit at 320pt without the labels running into each other.
  tabButton: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH_TARGET + 4, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs, paddingHorizontal: 2, borderRadius: radii.md, gap: 3 },
  tabButtonActive: { backgroundColor: colors.accent.phosphorBg, borderWidth: 1, borderColor: colors.accent.phosphorDim },
  // A dot with a ring on the icon's corner: a shape the eye finds without relying on its hue alone.
  badge: { position: 'absolute', top: -3, right: -6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent.amberBright, borderWidth: 2, borderColor: colors.surface.raised },
  label: { fontFamily: typography.mono, fontSize: typography.sizes.xs, fontWeight: '800', color: colors.text.muted },
  labelActive: { color: colors.accent.phosphorBright },
});
