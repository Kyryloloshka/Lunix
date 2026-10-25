import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSkillStore } from '@features/purchase-skill';
import { DENSE_TEXT_MAX_FONT_SCALE, DevGlyph, FadeSlideIn, MIN_TOUCH_TARGET } from '@shared/ui';
import { colors, radii, resources, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { getTapModeOptions, shouldShowTapModeSwitch } from '../model/tapModes';

const TRACK_PADDING = spacing.xxs;
const TRACK_BORDER = 1;
/** Fixed height of the switch, so the page can reserve the same space under it. */
export const TAP_MODE_SWITCH_HEIGHT = MIN_TOUCH_TARGET + 2 * (TRACK_PADDING + TRACK_BORDER);
const SWITCH_MAX_WIDTH = 420;

/**
 * Segmented control that picks what a tap on the Console earns (T-016 stage 5). Lists only unlocked
 * modes and hides itself until the second resource exists. Mount it in `WorkspaceClicker`'s `overlay`
 * so pressing it never counts as a tap.
 */
export function TapModeSwitch() {
  useLocale();
  const rank = useSkillStore((state) => state.currentRank);
  const active = useSkillStore((state) => state.tapResource);
  const setTapResource = useSkillStore((state) => state.setTapResource);
  // Slide in only when a mode was just unlocked; on every other mount the switch is simply there.
  const justUnlocked = useRef(useSkillStore.getState().pendingResourceUnlocks.length > 0).current;

  if (!shouldShowTapModeSwitch(rank)) return null;

  const track = (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('tapMode.label')} style={styles.track}>
      {getTapModeOptions(rank, active).map((option) => {
        const token = resources[option.resource];
        const mode = t(option.labelKey);
        return (
          <Pressable
            key={option.resource}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.selected, selected: option.selected }}
            accessibilityLabel={t('tapMode.modeA11y', { mode, resource: t(token.labelKey) })}
            onPress={() => setTapResource(option.resource)}
            style={({ pressed }) => [
              styles.segment,
              option.selected && { backgroundColor: token.bg, borderColor: token.color },
              pressed && !option.selected && styles.segmentPressed,
            ]}
          >
            <DevGlyph name={token.glyph} size={12} color={option.selected ? token.color : colors.text.muted} />
            <Text
              style={[styles.label, option.selected && styles.labelSelected]}
              numberOfLines={1}
              maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
            >
              {mode}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={styles.anchor}>
      {justUnlocked ? <FadeSlideIn from="top" style={styles.fill}>{track}</FadeSlideIn> : track}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  fill: {
    width: '100%',
    maxWidth: SWITCH_MAX_WIDTH,
  },
  track: {
    width: '100%',
    maxWidth: SWITCH_MAX_WIDTH,
    height: TAP_MODE_SWITCH_HEIGHT,
    flexDirection: 'row',
    gap: spacing.xxs,
    padding: TRACK_PADDING,
    borderWidth: TRACK_BORDER,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    backgroundColor: colors.surface.raised,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    // Selected adds a visible border and fill, so the state never relies on color alone.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentPressed: {
    backgroundColor: colors.surface.overlay,
  },
  label: {
    ...typography.roles.label,
    flexShrink: 1,
    color: colors.text.muted,
  },
  labelSelected: {
    color: colors.text.primary,
    fontWeight: typography.weights.extraBold,
  },
});
