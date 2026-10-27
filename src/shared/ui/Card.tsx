import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@shared/theme';

export type CardTone = 'default' | 'highlight' | 'owned' | 'dashed';

interface CardProps extends PropsWithChildren {
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
}

/** Bordered surface. `highlight` = new/ready, `owned` = done (dimmed), `dashed` = locked/teaser. */
export function Card({ tone = 'default', style, children }: CardProps) {
  return <View style={[styles.card, tone !== 'default' && styles[tone], style]}>{children}</View>;
}

interface ListRowProps {
  /** Icon tile on the left (usually a `DevGlyph`). */
  icon?: ReactNode;
  /** Text block in the middle; takes the free width. */
  children: ReactNode;
  /** Action or value on the right (usually a `Button`). Keeps its size. */
  trailing?: ReactNode;
  tone?: CardTone;
  /** Absolutely positioned decoration drawn over the row (e.g. a purchase pulse). */
  overlay?: ReactNode;
}

/** Icon + body + trailing action in a `Card`: skills, upgrades, ranks, leaders. */
export function ListRow({ icon, children, trailing, tone = 'default', overlay }: ListRowProps) {
  return (
    <View style={styles.wrapper}>
      {overlay}
      <Card tone={tone} style={styles.row}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <View style={styles.body}>{children}</View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.raised,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  highlight: { borderColor: colors.accent.amber, backgroundColor: colors.accent.amberBg },
  owned: { opacity: 0.75 },
  dashed: { borderStyle: 'dashed', borderColor: colors.border.default, backgroundColor: colors.surface.inset },
  wrapper: { position: 'relative', marginBottom: spacing.xs + 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.inset,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.sm,
  },
  // Sizes the width inside a ROW; flexGrow/flexShrink, never `flex: 1` on a column child of an auto-height parent.
  body: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  trailing: { flexShrink: 0, marginLeft: spacing.sm },
});
