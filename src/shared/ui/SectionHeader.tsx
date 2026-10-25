import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, spacing, typography } from '@shared/theme';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ eyebrow, title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { ...typography.roles.label, color: colors.text.muted, letterSpacing: 1.4, marginBottom: 3 },
  title: { ...typography.roles.title, color: colors.text.primary },
});
