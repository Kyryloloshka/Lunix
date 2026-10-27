import type { SkillResource } from '@entities/skill';
import { MODAL_PRIORITY, type ModalRequest } from '@shared/lib/modal-queue';

export const RESOURCE_UNLOCK_KIND = 'resource-unlock';

export interface ResourceUnlockPayload {
  resource: SkillResource;
}

/** Pure: one modal request per pending unlock event (ids are unique per resource). */
export function toUnlockRequests(pending: readonly SkillResource[]): ModalRequest<ResourceUnlockPayload>[] {
  return pending.map((resource) => ({
    id: `${RESOURCE_UNLOCK_KIND}:${resource}`,
    kind: RESOURCE_UNLOCK_KIND,
    priority: MODAL_PRIORITY.resourceUnlock,
    payload: { resource },
  }));
}

/** Ids of queued unlock requests whose event is gone from the store (e.g. after a reset). */
export function findStaleUnlockIds(queue: readonly ModalRequest[], pending: readonly SkillResource[]): string[] {
  return queue
    .filter((request) => request.kind === RESOURCE_UNLOCK_KIND
      && !pending.includes((request.payload as ResourceUnlockPayload).resource))
    .map((request) => request.id);
}
