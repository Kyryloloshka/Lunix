export {
  CAREER_RANKS,
  MAX_RANK,
  RESOURCE_UNLOCK_RANK,
  areRankRequirementsMet,
  clampRank,
  getCareerPhase,
  getRankProgress,
  getRequirementProgress,
  getUnlockedResources,
  isResourceUnlocked,
} from './model/ranks';
export type {
  CareerPhase,
  CareerRank,
  RankProgressContext,
  RankRequirement,
  RankResource,
  RequirementProgress,
} from './model/ranks';
