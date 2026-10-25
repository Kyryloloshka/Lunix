import type { SkillResource } from '@entities/skill';

export interface ResourceUnlockCopy {
  /** "New: Capital — your first salary". */
  titleKey: string;
  /** Where the resource comes from. */
  sourceKey: string;
  /** What the resource is spent on. */
  useKey: string;
  /** Name of the tap mode that earns it. */
  modeKey: string;
}

/** i18n keys of the unlock card for one resource (texts per phases.md §7). */
export function getResourceUnlockCopy(resource: SkillResource): ResourceUnlockCopy {
  return {
    titleKey: `resourceUnlock.items.${resource}.title`,
    sourceKey: `resourceUnlock.items.${resource}.source`,
    useKey: `resourceUnlock.items.${resource}.use`,
    modeKey: `tapMode.modes.${resource}`,
  };
}
