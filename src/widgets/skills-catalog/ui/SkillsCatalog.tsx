import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BRANCH_RESOURCE,
  calculateBulkPurchase,
  calculateSkillEffects,
  skillById,
  type PurchaseMode,
  type SkillBranch,
  type SkillDefinition,
  type SkillResource,
  type Upgrade,
} from '@entities/skill';
import { getUnlockedResources } from '@entities/career-rank';
import { useCurrencyStore } from '@entities/currency';
import type { Decimal } from '@shared/lib/decimal';
import { formatCurrency, formatDecimal } from '@shared/lib/formatters';
import { DENSE_TEXT_MAX_FONT_SCALE, DevGlyph, FadeSlideIn, MIN_TOUCH_TARGET, ResourceValue, type GlyphName } from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import { useMotionPreference } from '@shared/lib/motion';
import {
  getSkillContribution,
  isSkillUnlocked,
  previewSkillGain,
  previewUpgrade,
  useSkillStore,
  type RateChange,
  type SkillContribution,
  type UpgradePreview,
} from '@features/purchase-skill';
import { getCatalogEntries, getCatalogTabs, getLockedTeaser, type CatalogTab } from '../model/catalogTabs';
import { getNewSkillIds, sortUpgradesByStatus } from '../model/catalogOrder';

function isBranchTab(tab: CatalogTab): tab is SkillBranch {
  return tab !== 'perks' && tab !== 'upgrades';
}

function tabLabel(tab: CatalogTab): string {
  if (tab === 'upgrades') return t('skills.upgradesTab');
  if (tab === 'perks') return t('skills.perksTab');
  return t(`skills.branches.${tab}`);
}

const FORMAT: Record<SkillResource, (value: Decimal) => string> = {
  cognitive: (value) => formatDecimal(value),
  capital: (value) => formatCurrency(value),
  influence: (value) => formatDecimal(value),
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

function skillName(id: string): string {
  return t(`skills.items.${id}.name`);
}

function upgradeName(upgrade: Upgrade): string {
  if (upgrade.kind === 'leadership') return t(`skills.leadership.${upgrade.id}.name`);
  const target = upgrade.effect.type === 'skillMultiplier' ? upgrade.effect.skillId : '';
  const branch = skillById(target)?.branch ?? 'knowledge';
  return t('skills.upgradeTier', { skill: skillName(target), tier: t(`skills.upgradeTiers.${branch}.${upgrade.tier ?? 1}`) });
}

function upgradeEffectText(upgrade: Upgrade): string {
  const { effect } = upgrade;
  if (effect.type === 'branchMultiplier') {
    return t('skills.branchBoost', { branch: t(`skills.branches.${effect.branch}`), mult: effect.multiplier });
  }
  return t('skills.multiplier', { mult: effect.multiplier });
}

function formatPercent(share: number): string {
  const pct = Math.round(share * 100);
  return pct < 1 && share > 0 ? t('skills.lessThanPct') : String(pct);
}

/** Resources of a tap perk the player can actually earn at this rank, with a positive change. */
function tapPerkResources(skill: SkillDefinition, rank: number, perTap: RateChange['perTap']): SkillResource[] {
  if (skill.kind !== 'perk' || skill.effect.type !== 'tapPower') return [];
  const unlocked = getUnlockedResources(rank);
  return skill.effect.resources.filter((resource) => unlocked.includes(resource) && perTap[resource].isPositive());
}

/**
 * What buying the chosen amount gives. Numbers come from the model (same function as the real
 * rates), so upgrades, milestones and perks are already in them.
 */
function GainText({ skill, gain, rank }: { skill: SkillDefinition; gain: RateChange; rank: number }) {
  if (skill.kind === 'producer') {
    return (
      <ResourceValue kind={skill.produces}>{t('skills.rateLabel', { amount: FORMAT[skill.produces](gain.perSec[skill.produces]) })}</ResourceValue>
    );
  }
  if (skill.effect.type === 'tapPower') {
    const shown = tapPerkResources(skill, rank, gain.perTap);
    if (shown.length === 0) return <Text>{t('skills.perkTapAll', { pct: 0 })}</Text>;
    return (
      <Text>
        {shown.map((resource, index) => (
          <Text key={resource}>
            {index > 0 ? ' · ' : ''}
            <ResourceValue kind={resource}>
              {t('skills.perkTapGain', { amount: FORMAT[resource](gain.perTap[resource]) })}
            </ResourceValue>
          </Text>
        ))}
      </Text>
    );
  }
  return <Text>{t('skills.perkStress', { pct: Math.round(gain.stressPerTapReduction * 100) })}</Text>;
}

/** "Gives now" line for an owned skill; null when it gives nothing yet. */
function ContributionText({ skill, contribution, rank }: { skill: SkillDefinition; contribution: SkillContribution; rank: number }) {
  if (skill.kind === 'producer' && contribution.resource !== null && contribution.share !== null) {
    return (
      <ResourceValue kind={contribution.resource}>
        {t('skills.contribution', {
          amount: FORMAT[contribution.resource](contribution.perSec[contribution.resource]),
          pct: formatPercent(contribution.share),
        })}
      </ResourceValue>
    );
  }
  if (skill.kind === 'perk' && skill.effect.type === 'tapPower') {
    const shown = tapPerkResources(skill, rank, contribution.perTap);
    if (shown.length === 0) return null;
    return (
      <Text>
        {shown.map((resource, index) => (
          <Text key={resource}>
            {index > 0 ? ' · ' : ''}
            <ResourceValue kind={resource}>
              {t('skills.perkNowTap', { amount: FORMAT[resource](contribution.perTap[resource]) })}
            </ResourceValue>
          </Text>
        ))}
      </Text>
    );
  }
  if (skill.kind === 'perk') {
    return <Text>{t('skills.perkNowStress', { pct: Math.round(contribution.stressPerTapReduction * 100) })}</Text>;
  }
  return null;
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

  const tabs = useMemo(() => getCatalogTabs(currentRank), [currentRank]);
  const activeTab = tabs.includes(category) ? category : 'knowledge';
  const branchTab = isBranchTab(activeTab) ? activeTab : null;

  const seenSkillIds = useSkillStore((state) => state.seenSkillIds);
  const markSkillsSeen = useSkillStore((state) => state.markSkillsSeen);

  const { skills: visibleSkills, upgrades: unsortedUpgrades } = useMemo(
    () => getCatalogEntries(activeTab, currentRank, (skillId) => isSkillUnlocked(skillId, levels, currentRank)),
    [activeTab, currentRank, levels],
  );
  // Available first, bought last; independent of balances so the list never jumps.
  const visibleUpgrades = useMemo(
    () => sortUpgradesByStatus(unsortedUpgrades, purchasedUpgrades, levels),
    [unsortedUpgrades, purchasedUpgrades, levels],
  );
  const newSkillIds = useMemo(() => getNewSkillIds(visibleSkills, seenSkillIds), [visibleSkills, seenSkillIds]);
  const teaser = useMemo(() => getLockedTeaser(activeTab, currentRank), [activeTab, currentRank]);

  // NEW badges stay while the tab is on screen; they are marked seen when the player leaves it.
  const viewedRef = useRef(new Set<string>());
  useEffect(() => {
    visibleSkills.forEach((skill) => viewedRef.current.add(skill.id));
  }, [visibleSkills]);
  useEffect(() => () => {
    markSkillsSeen([...viewedRef.current]);
    viewedRef.current.clear();
  }, [activeTab, markSkillsSeen]);

  // Contributions and upgrade previews depend only on levels and upgrades, not on balances.
  const contributions = useMemo(() => {
    const map = new Map<string, SkillContribution>();
    for (const skill of visibleSkills) {
      if ((levels[skill.id] ?? 0) > 0) map.set(skill.id, getSkillContribution({ levels, purchasedUpgrades }, skill.id));
    }
    return map;
  }, [visibleSkills, levels, purchasedUpgrades]);
  const upgradePreviews = useMemo(() => {
    const map = new Map<string, UpgradePreview | null>();
    for (const upgrade of visibleUpgrades) map.set(upgrade.id, previewUpgrade({ levels, purchasedUpgrades }, upgrade.id));
    return map;
  }, [visibleUpgrades, levels, purchasedUpgrades]);

  const effects = useMemo(
    () => calculateSkillEffects(levels, purchasedUpgrades),
    [levels, purchasedUpgrades],
  );
  const headingRate = branchTab === null
    ? null
    : FORMAT[BRANCH_RESOURCE[branchTab]](
      BRANCH_RESOURCE[branchTab] === 'capital'
        ? effects.capitalPerSec
        : BRANCH_RESOURCE[branchTab] === 'cognitive' ? effects.cognitivePerSec : effects.influencePerSec,
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

  const renderUpgrade = (upgrade: Upgrade) => {
    const isOwned = purchasedUpgrades.includes(upgrade.id);
    const required = upgrade.requiredSkill;
    const targetLevel = required ? levels[required.skillId] ?? 0 : 0;
    const meetsLevel = !required || targetLevel >= required.level;
    const affordable = !isOwned && meetsLevel && balances[upgrade.costResource].gte(upgrade.cost);
    const glyphName = upgrade.effect.type === 'branchMultiplier'
      ? BRANCH_GLYPHS[upgrade.effect.branch]
      : SKILL_GLYPHS[upgrade.effect.skillId] ?? BRANCH_GLYPHS[skillById(upgrade.effect.skillId)?.branch ?? 'knowledge'];
    const name = upgradeName(upgrade);
    const preview = upgradePreviews.get(upgrade.id) ?? null;

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
            {preview && meetsLevel && (preview.before.gt(0) || preview.after.gt(0)) ? (
              <Text style={styles.bonus} numberOfLines={1}>
                {preview.skillId ? `${skillName(preview.skillId)}: ` : `${t(`skills.branches.${upgrade.effect.type === 'branchMultiplier' ? upgrade.effect.branch : 'knowledge'}`)}: `}
                <ResourceValue kind={preview.resource}>
                  {t('skills.upgradeFromTo', {
                    from: FORMAT[preview.resource](preview.before),
                    to: FORMAT[preview.resource](preview.after),
                  })}
                </ResourceValue>
              </Text>
            ) : null}
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
            <Text
              style={[styles.buyText, isOwned && { color: colors.text.muted }]}
              numberOfLines={1}
              maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
            >
              {isOwned ? t('skills.purchased') : (
                <ResourceValue kind={upgrade.costResource}>
                  {FORMAT[upgrade.costResource](upgrade.cost)}
                </ResourceValue>
              )}
            </Text>
            <Text style={styles.buyLabel}>{isOwned ? t('skills.active') : t('skills.buy')}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSkill = (skill: SkillDefinition) => {
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
    const contribution = contributions.get(skill.id) ?? null;

    const isNew = newSkillIds.has(skill.id);
    const card = (
      <View style={styles.cardWrapper}>
        {pulseOverlay(skill.id)}
        <View style={[styles.card, isNew && styles.cardNew]}>
          <View style={styles.cardIcon}>
            <DevGlyph name={glyphName} size={15} color={colors.accent.phosphorBright} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.skillName} numberOfLines={1}>{name}</Text>
              {isNew ? (
                <Text style={styles.newBadge} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>{t('skills.newBadge')}</Text>
              ) : null}
              <Text style={styles.level}>{t('skills.lvl', { level })}</Text>
            </View>
            <Text style={styles.description} numberOfLines={1}>
              {unlocked ? t(`skills.items.${skill.id}.desc`) : requirementText(skill)}
            </Text>
            <Text style={styles.bonus}>
              <GainText
                skill={skill}
                gain={previewSkillGain({ levels, purchasedUpgrades }, skill.id, effectiveGain)}
                rank={currentRank}
              />
            </Text>
            {contribution ? (
              <Text style={styles.contribution} numberOfLines={1}>
                <ContributionText skill={skill} contribution={contribution} rank={currentRank} />
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('skills.buy')} ${name}`}
            accessibilityState={{ disabled: !affordable }}
            disabled={!affordable}
            onPress={() => handleBuy(skill.id)}
            style={[styles.buyButton, !affordable && styles.buyDisabled]}
          >
            <Text style={styles.buyText} numberOfLines={1} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
              {isMaxed ? 'MAX' : (
                <ResourceValue kind={skill.costResource}>{FORMAT[skill.costResource](cost)}</ResourceValue>
              )}
            </Text>
            <Text style={styles.buyLabel}>{t('skills.buy')}</Text>
          </Pressable>
        </View>
      </View>
    );
    // New skills slide in from the top (a plain fade under reduced motion, handled by FadeSlideIn).
    return isNew ? <FadeSlideIn key={skill.id} from="top">{card}</FadeSlideIn> : <View key={skill.id}>{card}</View>;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>{t('skills.heading')}</Text>
        {headingRate && branchTab ? (
          <Text style={styles.rate} numberOfLines={1} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
            <ResourceValue kind={BRANCH_RESOURCE[branchTab]}>
              {t('skills.rateLabel', { amount: headingRate })}
            </ResourceValue>
          </Text>
        ) : null}
      </View>
      {visibleSkills.length > 0 ? (
        <View style={styles.purchaseModes}>
          {([1, 10, 100, 'max'] as PurchaseMode[]).map((mode) => (
            <Pressable
              key={String(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: purchaseMode === mode }}
              onPress={() => setPurchaseMode(mode)}
              style={[styles.modeButton, purchaseMode === mode && styles.modeButtonActive]}
            >
              <Text
                style={[styles.modeText, purchaseMode === mode && styles.modeTextActive]}
                maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
              >
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
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
              numberOfLines={1}
              maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
            >
              {tabLabel(tab)}
            </Text>
          </Pressable>
        ))}
      </View>
      {/* Plain list: the page ScrollView is the only vertical scroll on this tab (no nested scroll). */}
      <View style={styles.listContent}>
        {teaser ? (
          <View style={styles.teaser} accessibilityLabel={t('skills.teaser', { rank: t(`career.ranks.${teaser.unlockRank}.title`) })}>
            <Text style={styles.teaserText} numberOfLines={2} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
              {t('skills.teaser', { rank: t(`career.ranks.${teaser.unlockRank}.title`) })}
            </Text>
          </View>
        ) : null}
        {visibleSkills.map(renderSkill)}
        {visibleUpgrades.map(renderUpgrade)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
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
    flexShrink: 1,
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
    minHeight: MIN_TOUCH_TARGET,
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
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  contribution: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: 9,
    marginTop: 1,
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
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  cardNew: {
    borderColor: colors.accent.amber,
    backgroundColor: colors.accent.amberBg,
  },
  newBadge: {
    color: colors.accent.amberBright,
    fontFamily: typography.mono,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    borderRadius: radii.xs,
    paddingHorizontal: 3,
  },
  teaser: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: 6,
    backgroundColor: colors.bg.inset,
  },
  teaserText: {
    color: colors.text.muted,
    fontFamily: typography.mono,
    fontSize: typography.sizes.xxs,
    fontWeight: '800',
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
