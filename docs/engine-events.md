# Engine events (T-022)

The engine reports what happened as typed events instead of UI diffing "before/after" state (PRD §7).

- Bus: `src/shared/lib/events` (`createEventBus<E>()`): domain-agnostic, synchronous, copy-on-write
  listener list (emit allocates nothing), a throwing subscriber never breaks other subscribers or the emitter.
- Vocabulary + singleton: `src/entities/game-events` exports `gameEvents` (the bus) and the `GameEvent` union.
  Import it as `@entities/game-events`.
- Emitters: model store actions only, after the change succeeded. Failed actions, `hydrate` and `reset` emit nothing.
- Subscribers: register from `src/application` or a widget effect; always unsubscribe in cleanup
  (`const off = gameEvents.subscribe(fn)`). Handlers must be cheap: `tap` fires up to ~10 times/s.
  Hot emitters check `gameEvents.hasSubscribers()` before building the event object.

## Events

| type | payload | emitted by | when |
|---|---|---|---|
| `tap` | `resource`, `amount: Decimal`, `crit`, `flow` | `currencyStore.tap` (also via `skillStore.tap`) | every tap, after the balance changed; `flow` = Flow was active for this tap |
| `skill_bought` | `id`, `levels` (bought now) | `skillStore.buy` | after cost spent and rates synced |
| `upgrade_bought` | `id` | `skillStore.buyUpgrade` | after cost spent and rates synced |
| `rank_up` | `from`, `to` | `skillStore.promote` | after a successful promotion |
| `resource_unlocked` | `resource` | `skillStore.promote` | once per newly opened resource, right after `rank_up` |
| `flow_started` | none | `currencyStore.tap` | on the tap that opens Flow (after that tap's `tap` event) |
| `flow_ended` | none | `currencyStore.tick` | when the Flow timer runs out |
| `stress_overload_entered` | `stress` | `currencyStore.tap`, `addStress` | stress crosses above the overload threshold; not repeated while above it |
| `offline_claimed` | `seconds` | not emitted yet | type reserved; T-019 (offline screen) owns the offline function and will emit it |

Order within one tap: `tap`, then `flow_started`, then `stress_overload_entered`.

## Adding an event
Add a member to `GameEvent`, emit it from the model action after the successful `set(...)`, add a row here
and a test (exactly one event on success, none on failure, none on hydrate/reset).

## Current subscribers
- `widgets/header-hud` `useStressZoneFeedback`: haptic + shake on `stress_overload_entered`.
- Not migrated (moved to the T-019 modal queue): promotion celebration, resource unlock card.
