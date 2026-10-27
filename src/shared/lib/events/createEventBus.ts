/** Anything with a string discriminant can travel on a bus. */
export interface BusEvent {
  readonly type: string;
}

export type EventListener<E extends BusEvent> = (event: E) => void;

export interface EventBus<E extends BusEvent> {
  /** Calls every listener synchronously, in subscription order. A throwing listener never stops the others or the caller. */
  emit: (event: E) => void;
  /** Returns an idempotent unsubscribe function. */
  subscribe: (listener: EventListener<E>) => () => void;
  /** Lets hot emitters skip building the event object when nobody listens. */
  hasSubscribers: () => boolean;
  /** Test helper: drops every listener. */
  clear: () => void;
}

function defaultOnListenerError(error: unknown): void {
  console.warn('[events] listener threw', error);
}

/**
 * Domain-agnostic synchronous event bus (PRD §7 port). Copy-on-write listener list: `emit` iterates the
 * current array without copying it, so emitting allocates nothing; only (un)subscribing allocates.
 * A listener added or removed during an emit takes effect from the next emit.
 */
export function createEventBus<E extends BusEvent>(
  onListenerError: (error: unknown, event: E) => void = defaultOnListenerError,
): EventBus<E> {
  let listeners: readonly EventListener<E>[] = [];

  return {
    emit: (event) => {
      const current = listeners;
      for (let index = 0; index < current.length; index += 1) {
        try {
          current[index](event);
        } catch (error) {
          try {
            onListenerError(error, event);
          } catch {
            // The error reporter must not break the emitter either.
          }
        }
      }
    },
    subscribe: (listener) => {
      listeners = [...listeners, listener];
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners = [...listeners.slice(0, index), ...listeners.slice(index + 1)];
      };
    },
    hasSubscribers: () => listeners.length > 0,
    clear: () => {
      listeners = [];
    },
  };
}
