import { enqueueRequest, pickNext, removeRequest, type ModalRequest } from '../modalQueue';
import { MODAL_PRIORITY, selectCurrentModal, useModalQueue } from '../useModalQueue';

const req = (id: string, priority: number): ModalRequest => ({ id, kind: id.split(':')[0], priority });

describe('modal queue model', () => {
  it('picks nothing from an empty queue', () => {
    expect(pickNext([])).toBeNull();
  });

  it('shows the highest priority first and keeps enqueue order among equals', () => {
    let queue: ModalRequest[] = [];
    queue = enqueueRequest(queue, req('a:1', 40));
    queue = enqueueRequest(queue, req('b:1', 50));
    queue = enqueueRequest(queue, req('a:2', 40));
    queue = enqueueRequest(queue, req('c:1', 50));
    const order: string[] = [];
    while (queue.length > 0) {
      const next = pickNext(queue)!;
      order.push(next.id);
      queue = removeRequest(queue, next.id);
    }
    expect(order).toEqual(['b:1', 'c:1', 'a:1', 'a:2']);
  });

  it('ignores a request whose id is already waiting', () => {
    const queue = enqueueRequest(enqueueRequest([], req('a:1', 10)), { ...req('a:1', 99), payload: 'again' });
    expect(queue).toHaveLength(1);
    expect(queue[0].priority).toBe(10);
  });

  it('removes only the named request and tolerates unknown ids', () => {
    const queue = [req('a:1', 1), req('b:1', 1)];
    expect(removeRequest(queue, 'a:1').map((item) => item.id)).toEqual(['b:1']);
    expect(removeRequest(queue, 'zzz')).toHaveLength(2);
  });

  it('never exposes two modals at once: the store has one current request', () => {
    useModalQueue.getState().clear();
    const { enqueue, dismiss } = useModalQueue.getState();
    enqueue({ id: 'resource-unlock:capital', kind: 'resource-unlock', priority: MODAL_PRIORITY.resourceUnlock });
    enqueue({ id: 'promotion:2', kind: 'promotion', priority: MODAL_PRIORITY.promotion });
    enqueue({ id: 'offline-report', kind: 'offline-report', priority: MODAL_PRIORITY.offlineReport });

    const seen: string[] = [];
    for (let guard = 0; guard < 5; guard += 1) {
      const current = selectCurrentModal(useModalQueue.getState());
      if (!current) break;
      seen.push(current.id);
      dismiss(current.id);
    }
    expect(seen).toEqual(['offline-report', 'promotion:2', 'resource-unlock:capital']);
    expect(selectCurrentModal(useModalQueue.getState())).toBeNull();
  });
});
