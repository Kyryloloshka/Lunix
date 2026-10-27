import { create } from 'zustand';
import { enqueueRequest, pickNext, removeRequest, type ModalRequest } from './modalQueue';

interface ModalQueueState {
  queue: ModalRequest[];
  enqueue: (request: ModalRequest) => void;
  /** Closes a request (the visible one or one still waiting). */
  dismiss: (id: string) => void;
  clear: () => void;
}

/** Session-only; modal requests are never saved (they are re-derived from game events). */
export const useModalQueue = create<ModalQueueState>((set) => ({
  queue: [],
  enqueue: (request) => set((state) => ({ queue: enqueueRequest(state.queue, request) })),
  dismiss: (id) => set((state) => ({ queue: removeRequest(state.queue, id) })),
  clear: () => set({ queue: [] }),
}));

/** The request to show now; subscribe in the host only. */
export const selectCurrentModal = (state: Pick<ModalQueueState, 'queue'>): ModalRequest | null => pickNext(state.queue);

/** Priorities of the known modals, in one place so their order is a decision, not an accident. */
export const MODAL_PRIORITY = {
  /** Greets the player on return, before anything else. */
  offlineReport: 100,
  /** The promotion moment explains what just unlocked; the unlock cards follow it. */
  promotion: 50,
  resourceUnlock: 40,
} as const;
