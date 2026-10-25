import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { colors, radii, spacing } from '@shared/theme';

interface PanelProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'subtle' | 'elevated';
  padding?: keyof typeof spacing;
}

export function Panel({ children, style, tone = 'default', padding = 'lg' }: PanelProps) {
  return (
    <View style={[styles.base, styles[tone], { padding: spacing[padding] }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  default: { backgroundColor: colors.surface.raised },
  subtle: { backgroundColor: colors.surface.sunken, borderColor: colors.border.subtle },
  elevated: { backgroundColor: colors.surface.overlay, borderColor: colors.border.active },
});
