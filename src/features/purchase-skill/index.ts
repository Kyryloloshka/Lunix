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
export { canPromoteNow, getNextLevelCost, hasAffordablePurchase, selectNextGoal } from './model/nextGoal';
export type { NextGoal, NextGoalContent, NextGoalState, NextGoalTab } from './model/nextGoal';
export { MAX_WAIT_SECONDS, getWaitHint, getWaitIncome } from './model/waitHint';
export type { WaitHint } from './model/waitHint';
export type { RateChange, SkillContribution, SkillIncomeState, UpgradePreview } from './model/skillIncome';
