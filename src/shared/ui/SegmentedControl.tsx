import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@shared/theme';
import { DevGlyph, type GlyphName } from './DevGlyph';
import { DENSE_TEXT_MAX_FONT_SCALE, MIN_TOUCH_TARGET } from './layout';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** Spoken name when it differs from the visible label. */
  accessibilityLabel?: string;
  glyph?: GlyphName;
  /** Per-segment selected colors (e.g. a resource's color and background). */
  accent?: { color: string; bg: string };
}

interface SegmentedControlProps<T extends string | number> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `radio` = a setting (one of N values); `tab` = switches a view. */
  role?: 'radio' | 'tab';
  /** Name of the whole group. */
  accessibilityLabel?: string;
  /** Selected-segment highlight when a segment has no own `accent`. */
  tone?: 'phosphor' | 'amber';
  style?: StyleProp<ViewStyle>;
}

/**
 * One row of mutually exclusive segments. Every segment is at least 44 pt, the selected one has a
 * border and fill (not color alone) and reports `selected` (+ `checked` for radios).
 */
function SegmentedControlBase<T extends string | number>({
  options,
  value,
  onChange,
  role = 'radio',
  accessibilityLabel,
  tone = 'phosphor',
  style,
}: SegmentedControlProps<T>) {
  const groupRole = role === 'tab' ? 'tablist' : 'radiogroup';
  const toneStyle = tone === 'amber' ? styles.selectedAmber : styles.selectedPhosphor;
  const toneText = tone === 'amber' ? styles.textAmber : styles.textPhosphor;

  return (
    <View accessibilityRole={groupRole} accessibilityLabel={accessibilityLabel} style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        const accent = option.accent;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole={role}
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={role === 'radio' ? { checked: selected, selected } : { selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && (accent ? { backgroundColor: accent.bg, borderColor: accent.color } : toneStyle),
              pressed && !selected && styles.pressed,
            ]}
          >
            {option.glyph ? (
              <DevGlyph
                name={option.glyph}
                size={12}
                color={selected ? accent?.color ?? colors.text.primary : colors.text.muted}
              />
            ) : null}
            <Text
              style={[styles.text, selected && (accent ? styles.textSelected : toneText)]}
              numberOfLines={1}
              maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const SegmentedControl = memo(SegmentedControlBase) as typeof SegmentedControlBase;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: spacing.xxs,
    padding: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.md,
    backgroundColor: colors.surface.raised,
  },
  segment: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pressed: { backgroundColor: colors.surface.overlay },
  selectedPhosphor: { backgroundColor: colors.surface.overlay, borderColor: colors.border.active },
  selectedAmber: { backgroundColor: colors.accent.amberBg, borderColor: colors.accent.amber },
  text: { ...typography.roles.label, flexShrink: 1, color: colors.text.muted },
  textSelected: { color: colors.text.primary },
  textPhosphor: { color: colors.accent.phosphorBright },
  textAmber: { color: colors.accent.amberBright },
});
