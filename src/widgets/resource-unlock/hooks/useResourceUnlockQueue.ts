import { useEffect } from 'react';
import { useSkillStore } from '@features/purchase-skill';
import { useModalQueue } from '@shared/lib/modal-queue';
import { findStaleUnlockIds, toUnlockRequests } from '../model/unlockQueue';

/**
 * Mirrors the skill store's `pendingResourceUnlocks` events into the shared modal queue, so the unlock
 * card waits its turn instead of stacking on another modal. Mount once, next to the modal host.
 */
export function useResourceUnlockQueue(): void {
  const pending = useSkillStore((state) => state.pendingResourceUnlocks);

  useEffect(() => {
    const { enqueue, dismiss, queue } = useModalQueue.getState();
    findStaleUnlockIds(queue, pending).forEach(dismiss);
    toUnlockRequests(pending).forEach(enqueue);
  }, [pending]);
}
