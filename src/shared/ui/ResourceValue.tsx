import { Text, type StyleProp, type TextStyle } from 'react-native';
import { t } from '@shared/i18n';
import { resources, typography, type ResourceKind } from '@shared/theme';
import { glyphSymbols } from './DevGlyph';

export interface ResourceValueParts {
  text: string;
  /** Glyph drawn after the number, or null when the text already carries the unit (`$`). */
  glyph: string | null;
  glyphColor: string;
  accessibilityLabel: string;
}

/**
 * Pure: how a formatted resource amount is shown. Capital keeps `$` as its unit; every other
 * resource gets its token glyph in its token color (no emoji in strings).
 */
export function getResourceValueParts(kind: ResourceKind, text: string, label = t(resources[kind].labelKey)): ResourceValueParts {
  const meta = resources[kind];
  return {
    text,
    glyph: kind === 'capital' ? null : glyphSymbols[meta.glyph],
    glyphColor: meta.color,
    accessibilityLabel: `${text} ${label}`,
  };
}

interface ResourceValueProps {
  kind: ResourceKind;
  /** Already formatted amount, e.g. `formatDecimal(value)` or `+1.20K/s`. */
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * A formatted amount followed by the resource glyph. It is a `Text`, so it can sit inline inside
 * other text and inherits the caller's typography.
 */
export function ResourceValue({ kind, children, style, numberOfLines }: ResourceValueProps) {
  const parts = getResourceValueParts(kind, children);
  return (
    <Text style={style} numberOfLines={numberOfLines} accessibilityLabel={parts.accessibilityLabel}>
      {parts.text}
      {parts.glyph ? (
        <Text style={{ color: parts.glyphColor, fontFamily: typography.mono }}>{` ${parts.glyph}`}</Text>
      ) : null}
    </Text>
  );
}
