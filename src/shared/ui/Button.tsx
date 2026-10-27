import { memo, useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressScale } from '@shared/lib/motion';
import { colors, radii, spacing, typography } from '@shared/theme';
import { DENSE_TEXT_MAX_FONT_SCALE, MIN_TOUCH_TARGET } from './layout';

export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

/** Tones with a filled background; their label uses `text.onAccent` (contrast-tested). */
export const FILLED_BUTTON_TONES: ReadonlySet<ButtonTone> = new Set<ButtonTone>(['primary', 'danger']);

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children' | 'disabled'> {
  /** A string/number is wrapped in the label `Text`; any other node is rendered as is (e.g. a two-line price). */
  children: ReactNode;
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Not pressable. Pair with `disabledReason` so screen readers hear why. */
  disabled?: boolean;
  /** Why the button is disabled; appended to the accessible name while disabled. */
  disabledReason?: string;
  /** Shows a spinner, blocks presses and reports `busy`. */
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const isText = (node: ReactNode): node is string | number => typeof node === 'string' || typeof node === 'number';

/**
 * The one action button. Always at least 44 pt tall, has a role, a pressed state and a disabled
 * state that is visible without color (dimmed + dashed border). A disabled button explains itself
 * through `disabledReason` instead of just going quiet.
 */
export const Button = memo(function Button({
  children,
  tone = 'primary',
  size = 'md',
  disabled = false,
  disabledReason,
  loading = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityState,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const inactive = disabled || loading;
  const name = accessibilityLabel ?? (isText(children) ? String(children) : undefined);
  const label = disabled && disabledReason && name ? `${name}. ${disabledReason}` : name;
  const filled = FILLED_BUTTON_TONES.has(tone);

  // Press feedback: a spring scale on the UI thread (none under reduced motion) plus a dim, which stays
  // as the non-motion pressed state. The dim needs a tiny state; it only re-renders this button.
  const [pressed, setPressed] = useState(false);
  const press = usePressScale({ disabled: inactive });
  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    setPressed(true);
    press.onPressIn();
    onPressIn?.(event);
  }, [onPressIn, press]);
  const handlePressOut = useCallback((event: GestureResponderEvent) => {
    setPressed(false);
    press.onPressOut();
    onPressOut?.(event);
  }, [onPressOut, press]);

  return (
    <AnimatedPressable
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ ...accessibilityState, disabled: inactive, busy: loading }}
      disabled={inactive}
      style={[
        styles.base,
        styles[tone],
        size === 'sm' ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        pressed && !inactive && styles.pressed,
        disabled && styles.disabled,
        style,
        press.animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={filled ? colors.text.onAccent : colors.text.secondary} />
      ) : isText(children) ? (
        <Text
          style={[styles.label, filled && styles.onAccent]}
          numberOfLines={1}
          maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
  },
  sm: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  md: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.85 },
  // Dimmed AND dashed: the disabled state does not rely on opacity alone.
  disabled: { opacity: 0.55, borderStyle: 'dashed' },
  primary: { backgroundColor: colors.feedback.warning, borderColor: colors.accent.amberBright },
  secondary: { backgroundColor: colors.surface.overlay, borderColor: colors.border.active },
  ghost: { backgroundColor: 'transparent', borderColor: colors.border.default },
  danger: { backgroundColor: colors.feedback.danger, borderColor: colors.accent.redBright },
  label: { ...typography.roles.label, color: colors.text.primary, textAlign: 'center' },
  onAccent: { color: colors.text.onAccent },
});
