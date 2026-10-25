import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, radii, spacing, typography } from '@shared/theme';

interface StatPlateProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: 'default' | 'phosphor' | 'amber' | 'cyan' | 'rust';
}

const TONE_COLOR = {
  default: colors.text.secondary,
  phosphor: colors.accent.phosphor,
  amber: colors.accent.amber,
  cyan: colors.accent.cyan,
  rust: colors.accent.rust,
} as const;

export function StatPlate({ label, value, detail, icon, tone = 'default' }: StatPlateProps) {
  const accent = TONE_COLOR[tone];
  return (
    <View style={styles.plate}>
      <View style={styles.header}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {detail ? <Text style={[styles.detail, { color: accent }]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { flex: 1, minWidth: 84, backgroundColor: colors.surface.inset, borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radii.sm, padding: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  icon: { width: 16, alignItems: 'center' },
  label: { ...typography.roles.label },
  value: { ...typography.roles.monoNum, color: colors.text.primary, marginTop: 5 },
  detail: { ...typography.roles.label, fontWeight: typography.weights.regular, letterSpacing: 0, marginTop: 3 },
});
