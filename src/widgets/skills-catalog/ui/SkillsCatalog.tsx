import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SKILLS,
  TECH_UPGRADES,
  calculateBulkPurchase,
  calculateSkillEffects,
  skillById,
  type PurchaseMode,
  type TechUpgrade,
} from '@entities/skill';
import { useCurrencyStore } from '@entities/currency';
import { formatCognitive, formatCurrency, formatInfluence } from '@shared/lib/formatters';
import { DevGlyph, type GlyphName } from '@shared/ui';
import { colors, getRankTheme, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { useSettingsStore } from '@features/settings';
import { isSkillUnlocked, useSkillStore } from '../model/skillStore';

const SKILL_GLYPHS: Record<string, GlyphName> = {
  'html-css': 'html',
  javascript: 'javascript',
  react: 'react',
  node: 'server',
  docker: 'docker',
  'system-design': 'system-design',
  coffee: 'coffee',
  daily: 'daily',
  linkedin: 'linkedin',
  delegate: 'delegate',
};

export function SkillsCatalog() {
  useLocale();
  const [category, setCategory] = useState<'hard' | 'soft' | 'upgrades'>('hard');
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>(1);
  const [upgradedSkillId, setUpgradedSkillId] = useState<string | null>(null);
  const upgradePulse = useRef(new Animated.Value(0)).current;
  const capital = useCurrencyStore((state) => state.capital);
  const cognitive = useCurrencyStore((state) => state.cognitive);
  const influence = useCurrencyStore((state) => state.influence);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const currentRank = useSkillStore((state) => state.currentRank);
  const buy = useSkillStore((state) => state.buy);
  const buyUpgrade = useSkillStore((state) => state.buyUpgrade);
  const levels = useSkillStore((state) => state.levels);
  const purchasedUpgrades = useSkillStore((state) => state.purchasedUpgrades);
  const updateRates = useCurrencyStore((state) => state.updateRates);

  const visibleSkills = useMemo(() => {
    if (category === 'upgrades') return [];
    return SKILLS.filter(
      (skill) => skill.category === category && skill.unlockRank <= currentRank,
    );
  }, [category, currentRank]);

  const effects = useMemo(
    () => calculateSkillEffects(levels, purchasedUpgrades),
    [levels, purchasedUpgrades],
  );

  const syncRates = () => {
    const nextEffects = calculateSkillEffects(
      useSkillStore.getState().levels,
      useSkillStore.getState().purchasedUpgrades,
    );
    updateRates({
      capitalPerSec: nextEffects.capitalPerSec,
      cognitivePerSec: nextEffects.cognitivePerSec,
      influencePerSec: nextEffects.influencePerSec,
      capitalPerClick: nextEffects.capitalPerClick,
    });
  };

  const handleBuy = (id: string) => {
    if (buy(id, capital, purchaseMode) > 0) {
      if (!reducedMotion) {
        setUpgradedSkillId(id);
        upgradePulse.setValue(0);
        Animated.timing(upgradePulse, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start(() => setUpgradedSkillId(null));
      }
      syncRates();
    }
  };

  const handleBuyUpgrade = (upgrade: TechUpgrade) => {
    if (buyUpgrade(upgrade.id)) {
      if (!reducedMotion) {
        setUpgradedSkillId(upgrade.id);
        upgradePulse.setValue(0);
        Animated.timing(upgradePulse, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start(() => setUpgradedSkillId(null));
      }
      syncRates();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{t('skills.heading')}</Text>
        <Text style={styles.rate}>
          {t('skills.rateLabel', { amount: formatCurrency(effects.capitalPerSec) })}
        </Text>
      </View>
      {category !== 'upgrades' ? (
        <View style={styles.purchaseModes}>
          {([1, 10, 100, 'max'] as PurchaseMode[]).map((mode) => (
            <Pressable
              key={String(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: purchaseMode === mode }}
              onPress={() => setPurchaseMode(mode)}
              style={[styles.modeButton, purchaseMode === mode && styles.modeButtonActive]}
            >
              <Text style={[styles.modeText, purchaseMode === mode && styles.modeTextActive]}>
                {mode === 'max' ? 'MAX' : `x${mode}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: category === 'hard' }}
          onPress={() => setCategory('hard')}
          style={[styles.tab, category === 'hard' && styles.tabActive]}
        >
          <Text style={[styles.tabText, category === 'hard' && styles.tabTextActive]}>
            {t('skills.hardTab')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: category === 'soft' }}
          onPress={() => setCategory('soft')}
          style={[styles.tab, category === 'soft' && styles.tabActive]}
        >
          <Text style={[styles.tabText, category === 'soft' && styles.tabTextActive]}>
            {t('skills.softTab')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: category === 'upgrades' }}
          onPress={() => setCategory('upgrades')}
          style={[styles.tab, category === 'upgrades' && styles.tabActive]}
        >
          <Text style={[styles.tabText, category === 'upgrades' && styles.tabTextActive]}>
            {t('skills.upgradesTab')}
          </Text>
        </Pressable>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {category === 'upgrades' ? (
          TECH_UPGRADES.map((upgrade) => {
            const isOwned = purchasedUpgrades.includes(upgrade.id);
            const targetSkill = skillById(upgrade.targetSkillId);
            const targetLevel = levels[upgrade.targetSkillId] ?? 0;
            const meetsLevel = targetLevel >= upgrade.requiredSkillLevel;
            const currentCurrency = upgrade.currency === 'capital'
              ? capital
              : upgrade.currency === 'cognitive'
                ? cognitive
                : influence;
            const affordable = !isOwned && meetsLevel && currentCurrency.gte(upgrade.cost);
            const glyphName = SKILL_GLYPHS[upgrade.targetSkillId] || 'code';

            return (
              <View key={upgrade.id} style={styles.cardWrapper}>
                {upgradedSkillId === upgrade.id ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.pulseClone,
                      {
                        transform: [
                          {
                            scale: upgradePulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.12],
                            }),
                          },
                        ],
                        opacity: upgradePulse.interpolate({
                          inputRange: [0, 0.2, 1],
                          outputRange: [0.8, 0.6, 0],
                        }),
                      },
                    ]}
                  />
                ) : null}
                <View
                  style={[
                    styles.card,
                    isOwned && styles.cardOwned,
                  ]}
                >
                <View style={styles.cardIcon}>
                  <DevGlyph name={glyphName} size={15} color={colors.accent.amber} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.skillName} numberOfLines={1}>
                      {upgrade.name}
                    </Text>
                    <Text style={[styles.level, { color: colors.accent.phosphorBright }]}>
                      {t('skills.multiplier', { mult: upgrade.multiplier })}
                    </Text>
                  </View>
                  <Text style={styles.description} numberOfLines={1}>
                    {upgrade.description}
                  </Text>
                  <Text style={[styles.bonus, !meetsLevel && { color: colors.accent.rustBright }]}>
                    {meetsLevel
                      ? `Target: ${targetSkill?.name ?? upgrade.targetSkillId} (LVL ${targetLevel})`
                      : t('skills.reqLevel', {
                          skill: targetSkill?.name ?? upgrade.targetSkillId,
                          level: upgrade.requiredSkillLevel,
                        })}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${upgrade.name}`}
                  disabled={!affordable || isOwned}
                  onPress={() => handleBuyUpgrade(upgrade)}
                  style={[
                    styles.buyButton,
                    (!affordable || isOwned) && styles.buyDisabled,
                    isOwned && styles.buyOwned,
                  ]}
                >
                  <Text style={[styles.buyText, isOwned && { color: colors.text.muted }]}>
                    {isOwned ? t('skills.purchased') : formatCurrency(upgrade.cost)}
                  </Text>
                  <Text style={styles.buyLabel}>
                    {isOwned ? 'ACTIVE' : t('skills.buy')}
                  </Text>
                </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          visibleSkills.map((skill) => {
            const level = levels[skill.id] ?? 0;
            const unlocked = isSkillUnlocked(skill.id, levels, currentRank);
            const purchase = calculateBulkPurchase(
              skill.baseCost,
              skill.costGrowth,
              level,
              capital,
              purchaseMode,
            );
            const cost = purchaseMode === 'max' && purchase.levels === 0
              ? calculateBulkPurchase(skill.baseCost, skill.costGrowth, level, capital, 1).totalCost
              : purchase.totalCost;
            const affordable = unlocked && (purchaseMode === 'max' ? purchase.levels > 0 : capital.gte(cost));
            const effectiveGain = purchaseMode === 'max' && purchase.levels === 0 ? 1 : purchase.levels;
            const capitalGain = skill.capitalPerLevel.multiplyScalar(effectiveGain);
            const cognitiveGain = skill.cognitivePerLevel.multiplyScalar(effectiveGain);
            const influenceGain = skill.influencePerLevel.multiplyScalar(effectiveGain);
            const glyphName = SKILL_GLYPHS[skill.id] || 'code';
            const name = t(`skills.items.${skill.id}.name`);
            const desc = t(`skills.items.${skill.id}.desc`);

            return (
              <View key={skill.id} style={styles.cardWrapper}>
                {upgradedSkillId === skill.id ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.pulseClone,
                      {
                        transform: [
                          {
                            scale: upgradePulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.12],
                            }),
                          },
                        ],
                        opacity: upgradePulse.interpolate({
                          inputRange: [0, 0.2, 1],
                          outputRange: [0.8, 0.6, 0],
                        }),
                      },
                    ]}
                  />
                ) : null}
                <View style={styles.card}>
                <View style={styles.cardIcon}>
                  <DevGlyph name={glyphName} size={15} color={colors.accent.phosphorBright} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.skillName} numberOfLines={1}>
                      {name !== `skills.items.${skill.id}.name` ? name : skill.name}
                    </Text>
                    <Text style={styles.level}>{t('skills.lvl', { level })}</Text>
                  </View>
                  <Text style={styles.description} numberOfLines={1}>
                    {unlocked
                      ? (desc !== `skills.items.${skill.id}.desc` ? desc : skill.description)
                      : `🔒 ${skill.prerequisites?.map((item) => `${item.skillId} ${item.level}`).join(' · ') || `Rank ${skill.unlockRank + 1}`}`}
                  </Text>
                  <Text style={styles.bonus}>
                    {capitalGain.gt(0) ? `+${formatCurrency(capitalGain)}/s ` : ''}
                    {cognitiveGain.gt(0) ? `+${formatCognitive(cognitiveGain)}/s ` : ''}
                    {influenceGain.gt(0) ? `+${formatInfluence(influenceGain)}/s` : ''}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('skills.buy')} ${skill.name}`}
                  disabled={!affordable}
                  onPress={() => handleBuy(skill.id)}
                  style={[styles.buyButton, !affordable && styles.buyDisabled]}
                >
                  <Text style={styles.buyText}>{formatCurrency(cost)}</Text>
                  <Text style={styles.buyLabel}>{t('skills.buy')}</Text>
                </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, marginTop: spacing.sm },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  heading: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  rate: {
    color: colors.accent.phosphor,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  purchaseModes: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  modeButton: {
    flex: 1,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.xs,
    backgroundColor: colors.bg.surface,
    paddingVertical: 2,
  },
  modeButtonActive: {
    borderColor: colors.accent.amber,
    backgroundColor: colors.accent.amberBg,
  },
  modeText: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: 9,
    fontWeight: '900',
  },
  modeTextActive: { color: colors.accent.amberBright },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabActive: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.active,
  },
  tabText: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '800',
  },
  tabTextActive: {
    color: colors.accent.phosphorBright,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  cardWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  pulseClone: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.accent.amber,
    borderRadius: radii.md,
    backgroundColor: colors.accent.phosphorBg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.inset,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.sm,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillName: {
    color: colors.text.primary,
    fontFamily: typography.mono,
    fontWeight: '800',
    fontSize: typography.sizes.xs,
    flexShrink: 1,
  },
  level: {
    color: colors.accent.amber,
    fontFamily: typography.mono,
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 10,
    marginTop: 2,
  },
  bonus: {
    color: colors.accent.phosphor,
    fontFamily: typography.mono,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  buyButton: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.accent.phosphorDim,
    minWidth: 68,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  cardOwned: {
    borderColor: colors.border.subtle,
    opacity: 0.75,
  },
  buyOwned: {
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  buyDisabled: {
    borderColor: colors.border.subtle,
    opacity: 0.5,
  },
  buyText: {
    color: colors.accent.phosphorBright,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '900',
  },
  buyLabel: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: 8,
    fontWeight: '900',
    marginTop: 1,
  },
});
