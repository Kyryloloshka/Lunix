/**
 * The single "what to show next" model for full-screen modals (T-019). Modals never stack: only the
 * request returned by `pickNext` is on screen, everything else waits in the queue. Pure, no React.
 */
export interface ModalRequest<P = unknown> {
  /** Unique per logical modal; enqueueing the same id twice keeps the first one. */
  id: string;
  /** Which modal component renders it (resolved by the host, e.g. `offline-report`). */
  kind: string;
  /** Higher shows first. Equal priorities show in the order they were enqueued. */
  priority: number;
  payload?: P;
}

/** Appends a request; a request whose id is already waiting is ignored (events must not double up). */
export function enqueueRequest(queue: readonly ModalRequest[], request: ModalRequest): ModalRequest[] {
  if (queue.some((item) => item.id === request.id)) return [...queue];
  return [...queue, request];
}

/** Removes the request with this id (no-op when absent). */
export function removeRequest(queue: readonly ModalRequest[], id: string): ModalRequest[] {
  return queue.filter((item) => item.id !== id);
}

/** The modal that should be on screen now: highest priority, then first enqueued. Null when empty. */
export function pickNext(queue: readonly ModalRequest[]): ModalRequest | null {
  let best: ModalRequest | null = null;
  for (const item of queue) {
    if (best === null || item.priority > best.priority) best = item;
  }
  return best;
}
