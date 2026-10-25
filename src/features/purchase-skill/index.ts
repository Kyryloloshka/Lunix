export { canPurchaseSkill, getNextSkillCost } from './model/purchaseSkill';
export { canPromote, getPromotionProgress, getReachedSkillIds, isSkillUnlocked, syncRatesFromSkills, useSkillStore } from './model/skillStore';
export type { SkillSnapshot } from './model/skillStore';
export {
  calculateRates,
  decimalShare,
  getSkillContribution,
  previewSkillGain,
  previewUpgrade,
} from './model/skillIncome';
export type { RateChange, SkillContribution, SkillIncomeState, UpgradePreview } from './model/skillIncome';
