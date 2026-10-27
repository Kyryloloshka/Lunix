import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import type { Decimal } from '@shared/lib/decimal';
import { useCountUp, type CountUpOptions } from '@shared/lib/motion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CountUpTextProps extends CountUpOptions {
  value: Decimal;
  /** Formatter for the value, e.g. `formatCurrency`. Should be stable or cheap. */
  format: (value: Decimal) => string;
  style?: StyleProp<TextStyle>;
  /** Screen reader label. Defaults to the final formatted value (never the in-between frames). */
  accessibilityLabel?: string;
  maxFontSizeMultiplier?: number;
  testID?: string;
}

/**
 * Text that counts up/down to a Decimal value on the UI thread (no React render per frame).
 * Rendered as a read-only, non-focusable TextInput because its text can be updated natively.
 */
export function CountUpText({ value, format, style, accessibilityLabel, maxFontSizeMultiplier, testID, ...options }: CountUpTextProps) {
  const { text, animatedProps } = useCountUp(value, format, options);
  return (
    <AnimatedTextInput
      testID={testID}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      animatedProps={animatedProps}
      defaultValue={text}
      editable={false}
      focusable={false}
      caretHidden
      contextMenuHidden
      scrollEnabled={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={[styles.reset, style]}
    />
  );
}

const styles = StyleSheet.create({
  // TextInput has platform padding that Text does not.
  reset: { padding: 0, margin: 0, borderWidth: 0 },
});
