import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BRANCH_RESOURCE,
  SKILLS,
  UPGRADES,
  calculateBulkPurchase,
  calculateSkillEffects,
  skillById,
  type PurchaseMode,
  type SkillBranch,
  type SkillDefinition,
  type SkillResource,
  type Upgrade,
} from '@entities/skill';
import { isResourceUnlocked } from '@entities/career-rank';
import { useCurrencyStore } from '@entities/currency';
import type { Decimal } from '@shared/lib/decimal';
import { formatCognitive, formatCurrency, formatInfluence } from '@shared/lib/formatters';
import { DevGlyph, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { useMotionPreference } from '@shared/lib/motion';
import { isSkillUnlocked, useSkillStore } from '@features/purchase-skill';

type CatalogTab = SkillBranch | 'upgrades';

const BRANCH_TABS: SkillBranch[] = ['knowledge', 'work', 'influence'];

const FORMAT: Record<SkillResource, (value: Decimal) => string> = {
  cognitive: formatCognitive,
  capital: formatCurrency,
  influence: formatInfluence,
};

const BRANCH_GLYPHS: Record<SkillBranch, GlyphName> = {
  knowledge: 'brain',
  work: 'code',
  influence: 'network',
};

const SKILL_GLYPHS: Record<string, GlyphName> = {
  'html-tags': 'html',
  'js-basics': 'javascript',
  git: 'git-branch',
  reakt: 'react',
  nodle: 'server',
  dokker: 'docker',
  'distributed-systems': 'system-design',
  'internal-crm': 'database',
  'tech-blog': 'linkedin',
  'code-review': 'daily',
  aeropress: 'coffee',
  'mech-keyboard': 'terminal',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

function skillName(id: string): string {
  return t(`skills.items.${id}.name`);
}

function upgradeName(upgrade: Upgrade): string {
  if (upgrade.kind === 'leadership') return t(`skills.leadership.${upgrade.id}.name`);
  const target = upgrade.effect.type === 'skillMultiplier' ? upgrade.effect.skillId : '';
  return t('skills.upgradeTier', { skill: skillName(target), tier: ROMAN[(upgrade.tier ?? 1) - 1] ?? String(upgrade.tier) });
}

function upgradeEffectText(upgrade: Upgrade): string {
  const { effect } = upgrade;
  if (effect.type === 'branchMultiplier') {
    return t('skills.branchBoost', { branch: t(`skills.branches.${effect.branch}`), mult: effect.multiplier });
  }
  return t('skills.multiplier', { mult: effect.multiplier });
}

/** One line that says what one more level (or the chosen bulk) gives. Full numbers with multipliers are T-017. */
function skillEffectText(skill: SkillDefinition, gain: number): string {
  if (skill.kind === 'producer') {
    return `+${FORMAT[skill.produces](skill.perLevel.multiplyScalar(gain))}/s`;
  }
  if (skill.effect.type === 'tapPower') {
    const key = skill.effect.resources.length > 1 ? 'skills.perkTapAll' : 'skills.perkTapWork';
    return t(key, { pct: Math.round(skill.effect.perLevel * 100 * gain) });
  }
  return t('skills.perkStress', { pct: Math.round(skill.effect.perLevel * gain) });
}

function requirementText(skill: SkillDefinition): string {
  return (skill.prerequisites ?? [])
    .map((item) => t('skills.reqLevel', { skill: skillName(item.skillId), level: item.level }))
    .join(' · ');
}

export function SkillsCatalog() {
  useLocale();
  const [category, setCategory] = useState<CatalogTab>('knowledge');
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>(1);
  const [upgradedSkillId, setUpgradedSkillId] = useState<string | null>(null);
  const upgradePulse = useRef(new Animated.Value(0)).current;
  const capital = useCurrencyStore((state) => state.capital);
  const cognitive = useCurrencyStore((state) => state.cognitive);
  const influence = useCurrencyStore((state) => state.influence);
  const { reducedMotion } = useMotionPreference();
  const currentRank = useSkillStore((state) => state.currentRank);
  const buy = useSkillStore((state) => state.buy);
  const buyUpgrade = useSkillStore((state) => state.buyUpgrade);
  const levels = useSkillStore((state) => state.levels);
  const purchasedUpgrades = useSkillStore((state) => state.purchasedUpgrades);

  const balances: Record<SkillResource, Decimal> = { capital, cognitive, influence };

  const tabs = useMemo<CatalogTab[]>(
    () => [...BRANCH_TABS.filter((branch) => isResourceUnlocked(BRANCH_RESOURCE[branch], currentRank)), 'upgrades'],
    [currentRank],
  );
  const activeTab = tabs.includes(category) ? category : 'knowledge';

  const visibleSkills = useMemo(() => {
    if (activeTab === 'upgrades') return [];
    return SKILLS.filter((skill) => skill.branch === activeTab && skill.unlockRank <= currentRank);
  }, [activeTab, currentRank]);

  const visibleUpgrades = useMemo(() => UPGRADES.filter((upgrade) => {
    if (upgrade.unlockRank > currentRank) return false;
    if (upgrade.kind === 'leadership') return true;
    const target = upgrade.requiredSkill?.skillId;
    return target ? isSkillUnlocked(target, levels, currentRank) : false;
  }), [currentRank, levels]);

  const effects = useMemo(
    () => calculateSkillEffects(levels, purchasedUpgrades),
    [levels, purchasedUpgrades],
  );
  const headingRate = activeTab === 'upgrades'
    ? null
    : FORMAT[BRANCH_RESOURCE[activeTab]](
      BRANCH_RESOURCE[activeTab] === 'capital'
        ? effects.capitalPerSec
        : BRANCH_RESOURCE[activeTab] === 'cognitive' ? effects.cognitivePerSec : effects.influencePerSec,
    );

  const pulse = (id: string) => {
    if (reducedMotion) return;
    setUpgradedSkillId(id);
    upgradePulse.setValue(0);
    Animated.timing(upgradePulse, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start(() => setUpgradedSkillId(null));
  };

  const handleBuy = (id: string) => {
    if (buy(id, purchaseMode) > 0) pulse(id);
  };

  const handleBuyUpgrade = (upgrade: Upgrade) => {
    if (buyUpgrade(upgrade.id)) pulse(upgrade.id);
  };

  const pulseOverlay = (id: string) => (upgradedSkillId === id ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseClone,
        {
          transform: [{ scale: upgradePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
          opacity: upgradePulse.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.8, 0.6, 0] }),
        },
      ]}
    />
  ) : null);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{t('skills.heading')}</Text>
        {headingRate ? <Text style={styles.rate}>{t('skills.rateLabel', { amount: headingRate })}</Text> : null}
      </View>
      {activeTab !== 'upgrades' ? (
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
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
            onPress={() => setCategory(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'upgrades' ? t('skills.upgradesTab') : t(`skills.branches.${tab}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {activeTab === 'upgrades' ? (
          visibleUpgrades.map((upgrade) => {
            const isOwned = purchasedUpgrades.includes(upgrade.id);
            const required = upgrade.requiredSkill;
            const targetLevel = required ? levels[required.skillId] ?? 0 : 0;
            const meetsLevel = !required || targetLevel >= required.level;
            const affordable = !isOwned && meetsLevel && balances[upgrade.costResource].gte(upgrade.cost);
            const glyphName = upgrade.effect.type === 'branchMultiplier'
              ? BRANCH_GLYPHS[upgrade.effect.branch]
              : SKILL_GLYPHS[upgrade.effect.skillId] ?? BRANCH_GLYPHS[skillById(upgrade.effect.skillId)?.branch ?? 'knowledge'];
            const name = upgradeName(upgrade);

            return (
              <View key={upgrade.id} style={styles.cardWrapper}>
                {pulseOverlay(upgrade.id)}
                <View style={[styles.card, isOwned && styles.cardOwned]}>
                  <View style={styles.cardIcon}>
                    <DevGlyph name={glyphName} size={15} color={colors.accent.amber} />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.skillName} numberOfLines={1}>{name}</Text>
                    </View>
                    <Text style={[styles.level, styles.upgradeEffect]}>{upgradeEffectText(upgrade)}</Text>
                    <Text style={[styles.bonus, !meetsLevel && { color: colors.accent.rustBright }]}>
                      {required
                        ? (meetsLevel
                          ? t('skills.targetLevel', { skill: skillName(required.skillId), level: targetLevel })
                          : t('skills.reqLevel', { skill: skillName(required.skillId), level: required.level }))
                        : t('skills.leadershipHint')}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('skills.buy')} ${name}`}
                    accessibilityState={{ disabled: !affordable || isOwned }}
                    disabled={!affordable || isOwned}
                    onPress={() => handleBuyUpgrade(upgrade)}
                    style={[
                      styles.buyButton,
                      (!affordable || isOwned) && styles.buyDisabled,
                      isOwned && styles.buyOwned,
                    ]}
                  >
                    <Text style={[styles.buyText, isOwned && { color: colors.text.muted }]}>
                      {isOwned ? t('skills.purchased') : FORMAT[upgrade.costResource](upgrade.cost)}
                    </Text>
                    <Text style={styles.buyLabel}>{isOwned ? t('skills.active') : t('skills.buy')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          visibleSkills.map((skill) => {
            const level = levels[skill.id] ?? 0;
            const unlocked = isSkillUnlocked(skill.id, levels, currentRank);
            const isMaxed = skill.maxLevel !== undefined && level >= skill.maxLevel;
            const budget = balances[skill.costResource];
            const purchase = calculateBulkPurchase(skill.baseCost, skill.costGrowth, level, budget, purchaseMode);
            const cost = purchaseMode === 'max' && purchase.levels === 0
              ? calculateBulkPurchase(skill.baseCost, skill.costGrowth, level, budget, 1).totalCost
              : purchase.totalCost;
            const affordable = unlocked && !isMaxed && (purchaseMode === 'max' ? purchase.levels > 0 : budget.gte(cost));
            const effectiveGain = purchaseMode === 'max' && purchase.levels === 0 ? 1 : purchase.levels;
            const glyphName = SKILL_GLYPHS[skill.id] ?? BRANCH_GLYPHS[skill.branch];
            const name = skillName(skill.id);

            return (
              <View key={skill.id} style={styles.cardWrapper}>
                {pulseOverlay(skill.id)}
                <View style={styles.card}>
                  <View style={styles.cardIcon}>
                    <DevGlyph name={glyphName} size={15} color={colors.accent.phosphorBright} />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.skillName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.level}>{t('skills.lvl', { level })}</Text>
                    </View>
                    <Text style={styles.description} numberOfLines={1}>
                      {unlocked ? t(`skills.items.${skill.id}.desc`) : requirementText(skill)}
                    </Text>
                    <Text style={styles.bonus}>{skillEffectText(skill, effectiveGain)}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('skills.buy')} ${name}`}
                    accessibilityState={{ disabled: !affordable }}
                    disabled={!affordable}
                    onPress={() => handleBuy(skill.id)}
                    style={[styles.buyButton, !affordable && styles.buyDisabled]}
                  >
                    <Text style={styles.buyText}>{isMaxed ? 'MAX' : FORMAT[skill.costResource](cost)}</Text>
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
    ...StyleSheet.absoluteFill,
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
  upgradeEffect: { marginLeft: 0, marginTop: 2, color: colors.accent.phosphorBright },
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
