import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors, radii, resources, spacing, typography } from '@shared/theme';

type BadgeTone = 'neutral' | 'success' | 'cognitive' | 'influence' | 'warning' | 'danger' | 'flow';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: string;
  compact?: boolean;
}

export function Badge({ children, tone = 'neutral', icon, compact = false }: BadgeProps) {
  return (
    <View style={[styles.base, styles[tone], compact && styles.compact]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.label, compact && styles.compactLabel]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  compact: { paddingHorizontal: 6, paddingVertical: 3 },
  icon: { fontSize: typography.sizes.xs, marginRight: 4 },
  label: { fontSize: typography.sizes.xs, fontWeight: '800', color: colors.text.primary },
  compactLabel: { fontSize: typography.sizes.xs, lineHeight: typography.roles.label.lineHeight },
  neutral: { backgroundColor: colors.surface.overlay },
  success: { backgroundColor: colors.feedback.successBg },
  cognitive: { backgroundColor: resources.cognitive.bg },
  influence: { backgroundColor: resources.influence.bg },
  warning: { backgroundColor: colors.feedback.warningBg },
  danger: { backgroundColor: colors.feedback.dangerBg },
  flow: { backgroundColor: resources.flow.bg },
});
