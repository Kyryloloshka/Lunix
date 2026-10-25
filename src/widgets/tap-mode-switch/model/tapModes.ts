import { getUnlockedResources } from '@entities/career-rank';
import type { SkillResource } from '@entities/skill';

/** i18n key of each tap mode's name ("Study" / "Work" / "Network"). */
export const TAP_MODE_LABEL_KEY: Record<SkillResource, string> = {
  cognitive: 'tapMode.modes.cognitive',
  capital: 'tapMode.modes.capital',
  influence: 'tapMode.modes.influence',
};

export interface TapModeOption {
  resource: SkillResource;
  labelKey: string;
  selected: boolean;
}

/**
 * One mode per unlocked resource, in unlock order. Locked modes are not listed at all; the store's
 * `setTapResource` still validates every choice.
 */
export function getTapModeOptions(rank: number, active: SkillResource): TapModeOption[] {
  return getUnlockedResources(rank).map((resource) => ({
    resource,
    labelKey: TAP_MODE_LABEL_KEY[resource],
    selected: resource === active,
  }));
}

/** A switch with a single option is noise: it appears with the second resource (first job). */
export function shouldShowTapModeSwitch(rank: number): boolean {
  return getUnlockedResources(rank).length > 1;
}
