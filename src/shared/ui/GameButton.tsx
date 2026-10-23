import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@shared/theme';

type ButtonTone = 'primary' | 'secondary' | 'success' | 'warning' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GameButtonProps extends Omit<PressableProps, 'style' | 'children'>, PropsWithChildren {
  tone?: ButtonTone;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function GameButton({
  children,
  tone = 'primary',
  size = 'md',
  style,
  fullWidth = false,
  disabled,
  ...props
}: GameButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[tone],
        styles[`${size}Padding`],
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.label, styles[`${size}Text`], tone === 'primary' && styles.primaryLabel]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  fullWidth: { width: '100%' },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  disabled: { opacity: 0.45 },
  primary: { backgroundColor: colors.accent.indigo, borderColor: colors.accent.indigoLight },
  secondary: { backgroundColor: colors.bg.elevated, borderColor: colors.border.active },
  success: { backgroundColor: colors.accent.green, borderColor: colors.accent.greenLight },
  warning: { backgroundColor: colors.accent.amber, borderColor: colors.accent.amberLight },
  ghost: { backgroundColor: 'transparent', borderColor: colors.border.default },
  smPadding: { paddingHorizontal: spacing.sm, paddingVertical: 6, minHeight: 36 },
  mdPadding: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  lgPadding: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 52 },
  label: { color: colors.text.primary, fontWeight: '800', textAlign: 'center' },
  primaryLabel: { color: '#ffffff' },
  smText: { fontSize: typography.sizes.xs },
  mdText: { fontSize: typography.sizes.sm },
  lgText: { fontSize: typography.sizes.base },
});
