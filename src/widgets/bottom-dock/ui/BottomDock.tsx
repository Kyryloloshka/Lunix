import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DevGlyph, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';

export type ActiveTab = 'work' | 'skills' | 'career' | 'leaders' | 'settings';

interface BottomDockProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
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

export function BottomDock({ activeTab, onChangeTab }: BottomDockProps) {
  useLocale();
  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = isActive ? colors.accent.phosphorBright : colors.text.muted;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChangeTab(tab.id)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <DevGlyph name={tab.icon} size={16} color={color} />
              <Text style={[styles.label, isActive && styles.labelActive]}>
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
  dock: { flexDirection: 'row', backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.lg, padding: spacing.xs, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: radii.md, gap: 6 },
  tabButtonActive: { backgroundColor: colors.accent.phosphorBg, borderWidth: 1, borderColor: colors.accent.phosphorDim },
  label: { fontFamily: typography.mono, fontSize: typography.sizes.xxs, fontWeight: '800', color: colors.text.muted },
  labelActive: { color: colors.accent.phosphorBright },
});
