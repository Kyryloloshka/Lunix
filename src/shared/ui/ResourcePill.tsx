import { StyleSheet, Text, View } from 'react-native';
import { formatDecimal } from '@shared/lib/formatters/formatDecimal';
import type { Decimal } from '@shared/lib/decimal';
import { t } from '@shared/i18n';
import { colors, radii, resources, spacing, typography } from '@shared/theme';
import { DevGlyph } from './DevGlyph';

type ResourceKind = 'capital' | 'cognitive' | 'influence';

interface ResourcePillProps {
  kind: ResourceKind;
  value: Decimal;
  rate?: Decimal;
  compact?: boolean;
}

export function ResourcePill({ kind, value, rate, compact = false }: ResourcePillProps) {
  const meta = resources[kind];
  return (
    <View style={[styles.container, compact && styles.compact, { backgroundColor: meta.bg }]}>
      <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
        <DevGlyph name={meta.glyph} size={16} color={meta.color} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: meta.color }]}>{t(meta.labelKey).toUpperCase()}</Text>
        <Text style={styles.value}>{formatDecimal(value, kind === 'capital' ? { prefix: '$' } : undefined)}</Text>
        {rate && !rate.isZero() ? (
          <Text style={[styles.rate, { color: meta.color }]}>+{formatDecimal(rate)}/s</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', flex: 1, padding: spacing.sm, borderRadius: radii.md, minWidth: 0 },
  compact: { padding: 6 },
  iconBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, marginRight: spacing.sm },
  copy: { flex: 1, minWidth: 0 },
  label: { ...typography.roles.label },
  value: { ...typography.roles.monoNum, color: colors.text.primary, marginTop: 2 },
  rate: { ...typography.roles.label, fontWeight: typography.weights.regular, letterSpacing: 0, marginTop: 1 },
});
