import { useOnboardingStore } from '@features/onboarding';
import { PROMOTION_MODAL_KIND, PromotionCelebration, type PromotionModalPayload } from '@widgets/career-roadmap';
import { RESOURCE_UNLOCK_KIND, ResourceUnlockCard, useResourceUnlockQueue, type ResourceUnlockPayload } from '@widgets/resource-unlock';
import { OFFLINE_REPORT_KIND, WelcomeBackModal, type OfflineReport } from '@widgets/welcome-back';
import { selectCurrentModal, useModalQueue } from '@shared/lib/modal-queue';

/**
 * The only place full-screen modals are mounted (T-019): renders the queue's current request, so two
 * modals never stack. Waits while the intro covers the game (first launch or replay).
 */
export function ModalHost() {
  useResourceUnlockQueue();
  const introVisible = useOnboardingStore((state) => !state.introDone || state.replayingIntro);
  const current = useModalQueue(selectCurrentModal);
  const dismiss = useModalQueue((state) => state.dismiss);

  if (!current || introVisible) return null;
  const close = () => dismiss(current.id);

  switch (current.kind) {
    case OFFLINE_REPORT_KIND:
      return <WelcomeBackModal key={current.id} report={current.payload as OfflineReport} onDismiss={close} />;
    case PROMOTION_MODAL_KIND:
      return <PromotionCelebration key={current.id} rankId={(current.payload as PromotionModalPayload).rankId} onDismiss={close} />;
    case RESOURCE_UNLOCK_KIND:
      return <ResourceUnlockCard key={current.id} resource={(current.payload as ResourceUnlockPayload).resource} onDismiss={close} />;
    default:
      return null;
  }
}
