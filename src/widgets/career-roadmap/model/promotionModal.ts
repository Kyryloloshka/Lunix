import { MODAL_PRIORITY, useModalQueue } from '@shared/lib/modal-queue';

export const PROMOTION_MODAL_KIND = 'promotion';

export interface PromotionModalPayload {
  /** The rank the player was just promoted to. */
  rankId: number;
}

/** Queues the promotion celebration; it shows when nothing more important is on screen. */
export function showPromotionCelebration(rankId: number): void {
  useModalQueue.getState().enqueue({
    id: `${PROMOTION_MODAL_KIND}:${rankId}`,
    kind: PROMOTION_MODAL_KIND,
    priority: MODAL_PRIORITY.promotion,
    payload: { rankId } satisfies PromotionModalPayload,
  });
}
