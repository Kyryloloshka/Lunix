import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSkillStore } from '@features/purchase-skill';
import { FadeSlideIn, MIN_TOUCH_TARGET, SegmentedControl, type SegmentOption } from '@shared/ui';
import { resources, spacing } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import type { RankResource } from '@entities/career-rank';
import { getTapModeOptions, shouldShowTapModeSwitch } from '../model/tapModes';

// Matches SegmentedControl: padding spacing.xxs + 1 px border around 44 pt segments.
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

  const options: SegmentOption<RankResource>[] = getTapModeOptions(rank, active).map((option) => {
    const token = resources[option.resource];
    const mode = t(option.labelKey);
    return {
      value: option.resource,
      label: mode,
      accessibilityLabel: t('tapMode.modeA11y', { mode, resource: t(token.labelKey) }),
      glyph: token.glyph,
      accent: { color: token.color, bg: token.bg },
    };
  });
  const track = (
    <SegmentedControl
      role="radio"
      accessibilityLabel={t('tapMode.label')}
      options={options}
      value={active}
      onChange={setTapResource}
      style={styles.track}
    />
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
  },
});
