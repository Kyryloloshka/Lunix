import { StyleSheet, Text, View } from 'react-native';
import { formatDecimal } from '@shared/lib/formatters/formatDecimal';
import type { Decimal } from '@shared/lib/decimal';
import { colors, radii, spacing, typography } from '@shared/theme';

type ResourceKind = 'capital' | 'cognitive' | 'influence';

const RESOURCE_META: Record<ResourceKind, { label: string; icon: string; tone: string; background: string }> = {
  capital: { label: 'CAPITAL', icon: '＄', tone: colors.accent.greenLight, background: colors.accent.greenBg },
  cognitive: { label: 'COGNITION', icon: '◈', tone: colors.accent.indigoLight, background: colors.accent.indigoBg },
  influence: { label: 'INFLUENCE', icon: '↗', tone: colors.accent.roseLight, background: colors.accent.roseBg },
};

interface ResourcePillProps {
  kind: ResourceKind;
  value: Decimal;
  rate?: Decimal;
  compact?: boolean;
}

export function ResourcePill({ kind, value, rate, compact = false }: ResourcePillProps) {
  const meta = RESOURCE_META[kind];
  return (
    <View style={[styles.container, compact && styles.compact, { backgroundColor: meta.background }]}>
      <View style={[styles.iconBox, { backgroundColor: `${meta.tone}20` }]}>
        <Text style={[styles.icon, { color: meta.tone }]}>{meta.icon}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: meta.tone }]}>{meta.label}</Text>
        <Text style={styles.value}>{formatDecimal(value, kind === 'capital' ? { prefix: '$' } : undefined)}</Text>
        {rate && !rate.isZero() ? (
          <Text style={[styles.rate, { color: meta.tone }]}>+{formatDecimal(rate)}/s</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', flex: 1, padding: spacing.sm, borderRadius: radii.md, minWidth: 0 },
  compact: { padding: 6 },
  iconBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, marginRight: spacing.sm },
  icon: { fontSize: 16, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  value: { color: colors.text.primary, fontSize: typography.sizes.sm, fontWeight: '900', marginTop: 2 },
  rate: { fontSize: 9, fontWeight: '700', marginTop: 1 },
});
