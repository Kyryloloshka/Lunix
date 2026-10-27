import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import {
  Button,
  DENSE_TEXT_MAX_FONT_SCALE,
  DevGlyph,
  FadeSlideIn,
  ListRow,
  PurchasePulse,
  ResourceValue,
  RollText,
  SegmentedControl,
  type GlyphName,
  type SegmentOption,
} from '@shared/ui';
import { colors, radii, spacing, typography } from '@shared/theme';
import { t, useLocale } from '@shared/i18n';
import {
  getSkillContribution,
  getWaitHint,
  getWaitIncome,
  isSkillUnlocked,
  previewSkillGain,
  previewUpgrade,
  useSkillStore,
  type RateChange,
  type SkillContribution,
  type UpgradePreview,
  type WaitHint,
} from '@features/purchase-skill';
import { getCatalogEntries, getCatalogTabs, getLockedTeaser, type CatalogTab } from '../model/catalogTabs';
import { getNewSkillIds, sortUpgradesByStatus } from '../model/catalogOrder';

function isBranchTab(tab: CatalogTab): tab is SkillBranch {
  return tab !== 'perks' && tab !== 'upgrades';
}

const PURCHASE_MODES: readonly PurchaseMode[] = [1, 10, 100, 'max'];

function purchaseModeOptions(): SegmentOption<PurchaseMode>[] {
  return PURCHASE_MODES.map((mode) => (mode === 'max'
    ? { value: mode, label: t('skills.max'), accessibilityLabel: t('skills.buyModeMaxA11y') }
    : { value: mode, label: t('skills.buyAmount', { count: mode }), accessibilityLabel: t('skills.buyModeA11y', { count: mode }) }));
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

interface WaitLabel {
  text: string;
  a11y: string;
}

/** Text for a disabled buy button: the time to afford it, or how much is missing (T-003). */
function waitLabel(hint: WaitHint, resource: SkillResource): WaitLabel | null {
  if (hint.kind === 'ready') return null;
  if (hint.kind === 'seconds') {
    const time = hint.seconds < 60
      ? t('skills.waitSeconds', { seconds: hint.seconds })
      : t('skills.waitMinutes', { minutes: Math.ceil(hint.seconds / 60) });
    return { text: time, a11y: t('skills.waitA11y', { time }) };
  }
  const amount = FORMAT[resource](hint.amount);
  return {
    text: t('skills.needMore', { amount }),
    a11y: t('skills.needMoreA11y', { amount, resource: t(`resources.${resource}`) }),
  };
}

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

interface UpgradeCardProps {
  upgrade: Upgrade;
  isOwned: boolean;
  meetsLevel: boolean;
  targetLevel: number;
  affordable: boolean;
  preview: UpgradePreview | null;
  wait: WaitLabel | null;
  /** Purchase pulse, only on the card that was just bought. */
  overlay: ReactNode;
  onBuy: (upgrade: Upgrade) => void;
}

/**
 * One upgrade card. Memoized: the Upgrades tab can hold ~150 cards and the catalog re-renders on
 * every game tick, so only cards whose props changed (affordability, wait hint) render again.
 */
const UpgradeCard = memo(function UpgradeCard({
  upgrade, isOwned, meetsLevel, targetLevel, affordable, preview, wait, overlay, onBuy,
}: UpgradeCardProps) {
  useLocale();
  const required = upgrade.requiredSkill;
  const glyphName = upgrade.effect.type === 'branchMultiplier'
    ? BRANCH_GLYPHS[upgrade.effect.branch]
    : SKILL_GLYPHS[upgrade.effect.skillId] ?? BRANCH_GLYPHS[skillById(upgrade.effect.skillId)?.branch ?? 'knowledge'];
  const name = upgradeName(upgrade);
  return (
    <ListRow
      tone={isOwned ? 'owned' : 'default'}
      overlay={overlay}
      icon={<DevGlyph name={glyphName} size={15} color={colors.accent.amber} />}
      trailing={(
        <Button
          tone="secondary"
          size="sm"
          style={styles.buyButton}
          accessibilityLabel={t('skills.buyA11y', { name })}
          disabled={!affordable || isOwned}
          disabledReason={isOwned ? undefined : wait?.a11y}
          onPress={() => onBuy(upgrade)}
        >
          <Text
            style={[styles.buyText, isOwned && styles.buyTextOwned]}
            numberOfLines={1}
            maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}
          >
            {isOwned ? t('skills.purchased') : (
              <ResourceValue kind={upgrade.costResource}>
                {FORMAT[upgrade.costResource](upgrade.cost)}
              </ResourceValue>
            )}
          </Text>
          <Text style={[styles.buyLabel, wait && styles.buyWait]} numberOfLines={1} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
            {isOwned ? t('skills.active') : (wait?.text ?? t('skills.buy'))}
          </Text>
        </Button>
      )}
    >
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
      <Text style={[styles.bonus, !meetsLevel && styles.bonusLocked]}>
        {required
          ? (meetsLevel
            ? t('skills.targetLevel', { skill: skillName(required.skillId), level: targetLevel })
            : t('skills.reqLevel', { skill: skillName(required.skillId), level: required.level }))
          : t('skills.leadershipHint')}
      </Text>
    </ListRow>
  );
}, (prev, next) => (
  // The wait label is rebuilt every tick; compare its text, not its identity.
  prev.upgrade === next.upgrade
  && prev.isOwned === next.isOwned
  && prev.meetsLevel === next.meetsLevel
  && prev.targetLevel === next.targetLevel
  && prev.affordable === next.affordable
  && prev.preview === next.preview
  && prev.wait?.text === next.wait?.text
  && prev.wait?.a11y === next.wait?.a11y
  && prev.overlay === next.overlay
  && prev.onBuy === next.onBuy
));

export function SkillsCatalog() {
  const locale = useLocale();
  const [category, setCategory] = useState<CatalogTab>('knowledge');
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>(1);
  // The purchase pulse lives on one card at a time: the bought card mounts it, so lists pay nothing for it.
  const [pulse, setPulse] = useState<{ id: string; key: number; label: ReactNode } | null>(null);
  const pulseKey = useRef(0);
  const capital = useCurrencyStore((state) => state.capital);
  const cognitive = useCurrencyStore((state) => state.cognitive);
  const influence = useCurrencyStore((state) => state.influence);
  const income = useCurrencyStore((state) => state.income);
  const rates = useCurrencyStore((state) => state.rates);
  const currentRank = useSkillStore((state) => state.currentRank);
  const buy = useSkillStore((state) => state.buy);
  const buyUpgrade = useSkillStore((state) => state.buyUpgrade);
  const levels = useSkillStore((state) => state.levels);
  const purchasedUpgrades = useSkillStore((state) => state.purchasedUpgrades);

  const balances: Record<SkillResource, Decimal> = { capital, cognitive, influence };

  const tabs = useMemo(() => getCatalogTabs(currentRank), [currentRank]);
  const activeTab = tabs.includes(category) ? category : 'knowledge';
  const branchTab = isBranchTab(activeTab) ? activeTab : null;
  // Rebuilt only when the tab set or the language changes, so the memoized control keeps equal props.
  const modeOptions = useMemo(() => purchaseModeOptions(), [locale]);
  const tabOptions = useMemo(() => tabs.map((tab) => ({ value: tab, label: tabLabel(tab) })), [tabs, locale]);

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
  // Gains only change with levels and upgrades, but the catalog renders on every tick: cache them.
  const gainCache = useMemo(() => new Map<string, RateChange>(), [levels, purchasedUpgrades]);
  const gainFor = (skillId: string, count: number): RateChange => {
    const key = `${skillId}:${count}`;
    let gain = gainCache.get(key);
    if (!gain) {
      gain = previewSkillGain({ levels, purchasedUpgrades }, skillId, count);
      gainCache.set(key, gain);
    }
    return gain;
  };
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

  const showPulse = (id: string, label: ReactNode = null) => {
    pulseKey.current += 1;
    setPulse({ id, key: pulseKey.current, label });
  };
  const clearPulse = useCallback(() => setPulse(null), []);

  const handleBuy = (id: string) => {
    const skill = skillById(id);
    const bought = buy(id, purchaseMode);
    if (bought <= 0) return;
    // Gain of this purchase for the flying "+X/s" label. `gainFor` reads the render-time levels, i.e. the ones before buying.
    const label = skill?.kind === 'producer' ? (
      <Text style={styles.flyLabel}>
        <ResourceValue kind={skill.produces}>
          {t('skills.rateLabel', { amount: FORMAT[skill.produces](gainFor(id, bought).perSec[skill.produces]) })}
        </ResourceValue>
      </Text>
    ) : null;
    showPulse(id, label);
  };

  const handleBuyUpgrade = (upgrade: Upgrade) => {
    if (buyUpgrade(upgrade.id)) showPulse(upgrade.id);
  };

  // Latest handler behind a stable callback, so memoized cards keep equal props between ticks.
  const buyUpgradeRef = useRef(handleBuyUpgrade);
  buyUpgradeRef.current = handleBuyUpgrade;
  const onBuyUpgrade = useCallback((upgrade: Upgrade) => buyUpgradeRef.current(upgrade), []);

  const pulseOverlay = (id: string) => (
    pulse?.id === id ? <PurchasePulse key={pulse.key} label={pulse.label} onDone={clearPulse} /> : null
  );

  const renderUpgrade = (upgrade: Upgrade) => {
    const isOwned = purchasedUpgrades.includes(upgrade.id);
    const required = upgrade.requiredSkill;
    const targetLevel = required ? levels[required.skillId] ?? 0 : 0;
    const meetsLevel = !required || targetLevel >= required.level;
    const affordable = !isOwned && meetsLevel && balances[upgrade.costResource].gte(upgrade.cost);
    const wait = !isOwned && meetsLevel && !affordable
      ? waitLabel(
        getWaitHint(upgrade.cost, balances[upgrade.costResource], getWaitIncome(upgrade.costResource, income, rates)),
        upgrade.costResource,
      )
      : null;
    return (
      <UpgradeCard
        key={upgrade.id}
        upgrade={upgrade}
        isOwned={isOwned}
        meetsLevel={meetsLevel}
        targetLevel={targetLevel}
        affordable={affordable}
        preview={upgradePreviews.get(upgrade.id) ?? null}
        wait={wait}
        overlay={pulseOverlay(upgrade.id)}
        onBuy={onBuyUpgrade}
      />
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
    // Disabled but reachable: say how much is missing or how long it takes (T-017 income).
    const wait = unlocked && !isMaxed && !affordable
      ? waitLabel(getWaitHint(cost, budget, getWaitIncome(skill.costResource, income, rates)), skill.costResource)
      : null;

    const isNew = newSkillIds.has(skill.id);
    const card = (
      <ListRow
        tone={isNew ? 'highlight' : 'default'}
        overlay={pulseOverlay(skill.id)}
        icon={<DevGlyph name={glyphName} size={15} color={colors.accent.phosphorBright} />}
        trailing={(
          <Button
            tone="secondary"
            size="sm"
            style={styles.buyButton}
            accessibilityLabel={t('skills.buyA11y', { name })}
            disabled={!affordable}
            disabledReason={wait?.a11y}
            onPress={() => handleBuy(skill.id)}
          >
            <Text style={styles.buyText} numberOfLines={1} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
              {isMaxed ? t('skills.max') : (
                <ResourceValue kind={skill.costResource}>{FORMAT[skill.costResource](cost)}</ResourceValue>
              )}
            </Text>
            <Text style={[styles.buyLabel, wait && styles.buyWait]} numberOfLines={1} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>
              {wait?.text ?? t('skills.buy')}
            </Text>
          </Button>
        )}
      >
        <View style={styles.cardTitleRow}>
          <Text style={styles.skillName} numberOfLines={1}>{name}</Text>
          {isNew ? (
            <Text style={styles.newBadge} maxFontSizeMultiplier={DENSE_TEXT_MAX_FONT_SCALE}>{t('skills.newBadge')}</Text>
          ) : null}
          <RollText style={styles.level} text={t('skills.lvl', { level })} />
        </View>
        {unlocked ? (
          <Text style={styles.description} numberOfLines={1}>{t(`skills.items.${skill.id}.desc`)}</Text>
        ) : (
          <View style={styles.lockedRow}>
            <DevGlyph name="lock" size={11} color={colors.text.muted} />
            <Text style={[styles.description, styles.lockedText]} numberOfLines={2}>{requirementText(skill)}</Text>
          </View>
        )}
        <Text style={styles.bonus}>
          <GainText
            skill={skill}
            gain={gainFor(skill.id, effectiveGain)}
            rank={currentRank}
          />
        </Text>
        {contribution ? (
          <Text style={styles.contribution} numberOfLines={1}>
            <ContributionText skill={skill} contribution={contribution} rank={currentRank} />
          </Text>
        ) : null}
      </ListRow>
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
        <SegmentedControl
          style={styles.purchaseModes}
          role="radio"
          tone="amber"
          options={modeOptions}
          value={purchaseMode}
          onChange={setPurchaseMode}
        />
      ) : null}
      <SegmentedControl
        style={styles.tabs}
        role="tab"
        options={tabOptions}
        value={activeTab}
        onChange={setCategory}
      />
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
    ...typography.roles.label,
    color: colors.text.muted,
    fontWeight: typography.weights.black,
    letterSpacing: 1.5,
  },
  rate: {
    ...typography.roles.label,
    flexShrink: 1,
    color: colors.accent.phosphor,
  },
  purchaseModes: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  tabs: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  flyLabel: { fontFamily: typography.mono, fontSize: typography.sizes.sm, fontWeight: '900', color: colors.text.primary },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillName: {
    ...typography.roles.label,
    color: colors.text.primary,
    flexShrink: 1,
  },
  level: {
    ...typography.roles.label,
    color: colors.accent.amber,
    marginLeft: spacing.xxs,
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  lockedText: { flexShrink: 1 },
  description: {
    ...typography.roles.body,
    color: colors.text.secondary,
    fontSize: typography.sizes.xs,
    lineHeight: 15,
    marginTop: 2,
  },
  upgradeEffect: { marginLeft: 0, marginTop: 2, color: colors.accent.phosphorBright },
  contribution: {
    ...typography.roles.label,
    color: colors.text.muted,
    marginTop: 1,
  },
  bonus: {
    ...typography.roles.label,
    color: colors.accent.phosphor,
    marginTop: 3,
  },
  bonusLocked: { color: colors.accent.rustBright },
  buyButton: { minWidth: 68, paddingHorizontal: spacing.xs },
  newBadge: {
    ...typography.roles.label,
    color: colors.accent.amberBright,
    fontWeight: typography.weights.black,
    letterSpacing: 1,
    marginLeft: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.xxs,
  },
  teaser: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xs + 1,
    backgroundColor: colors.surface.inset,
  },
  teaserText: {
    ...typography.roles.label,
    color: colors.text.muted,
  },
  buyText: {
    ...typography.roles.label,
    color: colors.accent.phosphorBright,
    fontWeight: typography.weights.black,
  },
  buyTextOwned: { color: colors.text.muted },
  buyWait: {
    color: colors.text.secondary,
  },
  buyLabel: {
    ...typography.roles.label,
    color: colors.text.muted,
    marginTop: 1,
  },
});
