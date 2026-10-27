import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@shared/theme';
import { DENSE_TEXT_MAX_FONT_SCALE, TEXT_MAX_FONT_SCALE } from './layout';

interface PanelHeaderProps {
  eyebrow?: string;
  title: string;
  /** Badge or small action on the right. It keeps its size and is never pushed off screen. */
  trailing?: ReactNode;
}

/**
 * Panel heading: [eyebrow ........ trailing badge] on the top row, the title below at full width.
 * The title wraps onto as many lines as it needs (no truncation); the eyebrow takes the remaining
 * width next to the badge (`flex: 1, minWidth: 0`) and the badge slot never shrinks.
 */
export function PanelHeader({ eyebrow, title, trailing }: PanelHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow || trailing ? (
        <View style={styles.topRow}>
          <View style={styles.eyebrowSlot}>
            {eyebrow ? (
              <Text style={styles.eyebrow} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
                {eyebrow}
              </Text>
            ) : null}
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      ) : null}
      <Text accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>
        {title}
      </Text>
    </View>
  );
}

export const panelHeaderStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrowSlot: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexShrink: 0,
  },
  eyebrow: {
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '900',
    color: colors.text.muted,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: '900',
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
});

const styles = panelHeaderStyles;
