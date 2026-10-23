import type { Decimal } from '@shared/lib/decimal';

export type SkillCategory = 'hard' | 'soft';

export interface SkillPrerequisite {
  skillId: string;
  level: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: SkillCategory;
  baseCost: Decimal;
  costGrowth: number;
  unlockRank: number;
  prerequisites?: SkillPrerequisite[];
  maxLevel?: number;
  capitalPerLevel: Decimal;
  cognitivePerLevel: Decimal;
  influencePerLevel: Decimal;
  clickCapitalPerLevel: Decimal;
  stressReductionPerLevel: number;
}
