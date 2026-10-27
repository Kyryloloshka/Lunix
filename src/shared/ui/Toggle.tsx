import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '@shared/theme';
import { DENSE_TEXT_MAX_FONT_SCALE, MIN_TOUCH_TARGET, TEXT_MAX_FONT_SCALE } from './layout';

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Visible words for the state. The state is always text, never color alone. */
  onText: string;
  offText: string;
}

/** Labeled on/off row (role `switch`), at least 48 pt tall. */
export const Toggle = memo(function Toggle({ label, value, onChange, onText, offText }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <Text style={styles.label} maxFontSizeMultiplier={TEXT_MAX_FONT_SCALE}>{label}</Text>
      <View style={[styles.pill, value && styles.pillOn]}>
        <Text style={[styles.pillText, value && styles.pillTextOn]} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
          {value ? onText : offText}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  label: { ...typography.roles.body, flexShrink: 1, color: colors.text.primary, fontWeight: typography.weights.bold },
  pill: {
    minWidth: 48,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.inset,
  },
  pillOn: { borderColor: colors.accent.phosphorDim, backgroundColor: colors.accent.phosphorBg },
  pillText: { ...typography.roles.label, color: colors.text.muted },
  pillTextOn: { color: colors.accent.phosphorBright },
});
