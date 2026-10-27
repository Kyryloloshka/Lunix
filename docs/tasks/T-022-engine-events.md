---
id: T-022
title: Шина подій рушія: що сталося в грі — одна подія, яку слухають усі
type: refactor
priority: P0
size: M
status: done
epic: E1 (Рушій)
hook: — (фундамент для E5, E7, E9)
metric: —
needs-approval: no
---

# T-022 · Рушій повідомляє про події, а не викликає UI напряму

## Навіщо (людською мовою)
Ачівки (T-025), Golden Commit (T-023), інциденти (T-024), хаптика і анімації мають реагувати на ті самі
моменти: купив навичку, підвищився, тапнув критом, увійшов у Flow. Зараз кожен такий момент або не
видно ззовні, або UI порівнює стан «до/після». PRD §7: рушій видає `events[]`, а підсистеми на них
підписуються. Це мінімальний крок до цільової архітектури без переписування всіх сторів.

## Що бачимо зараз
- Стори `entities/currency` і `features/purchase-skill` змінюють стан і повертають результати дій.
- `pendingResourceUnlocks` у skill store — локальний приклад «події через стан» (T-016 ет. 5).
- Свято промоушну запускається з UI після успішного `promote()` (T-008).

## Що зробити
1. Типізована подія `GameEvent` (discriminated union): `tap` (resource, amount, crit, flow),
   `skill_bought` (id, levels), `upgrade_bought`, `rank_up` (from, to), `resource_unlocked`,
   `flow_started`/`flow_ended`, `stress_overload_entered`, `offline_claimed`. Розширюється без змін рушія.
2. Шина в `shared` (порт, без ігрових правил) з `subscribe`/`emit`, синхронна, безпечна до винятків
   підписника; адаптер у `src/application`. Події емітить модель (store actions) після успішної зміни,
   ніколи UI.
3. Перевести наявних споживачів: свято промоушну, картка відкриття ресурсу, хаптика стресу
   (T-015) — на підписку, де це спрощує код. Не ламати поведінку.
4. Тести: кожна дія емітить рівно одну правильну подію; невдала дія (не вистачає грошей) — жодної;
   hydrate/reset/offline не емітять ігрових подій, крім `offline_claimed`.

## Критерії готовності
- [x] Повний перелік подій задокументований у `docs/design-system.md` або новому `docs/engine-events.md`.
- [x] Покупка, підвищення, тап, Flow, перевантаження емітять події (тести).
- [x] Наявні компонентні тести T-011 і симуляція балансу зелені.
- [x] `npm run ts:check`, `npm test`, web export пройшли.

## Поза скоупом
Повний перехід на єдиний `GameState` + `reduce(state, action)` (окремий етап E1 пізніше), аналітика (E16).

## Де в коді
`src/shared/lib/events` (шина), `entities/currency`, `features/purchase-skill`, підписники у `widgets/*`,
проводка в `src/application`.

## Ризики і відкриті питання
- Тап — гаряча подія (до 10/с + 200 мс тік): шина має бути дешевою, без алокацій масивів підписників на кожну подію.

## Результат (виконано)
- Шина: `src/shared/lib/events` (`createEventBus`); словник подій і синглтон `gameEvents`: `src/entities/game-events`.
- Емітять `currencyStore` (tap, flow_started/ended, stress_overload_entered) і `skillStore` (skill_bought, upgrade_bought, rank_up, resource_unlocked). hydrate/reset/невдалі дії не емітять.
- Підписник: haptic + shake стресу (`useStressZoneFeedback`); мертву `enteredStressZone` видалено.
- Документація: `docs/engine-events.md`. Тести: шина, currency, skill store.
- Відкладено: `offline_claimed` (тип є, емітить T-019); свято промоушну і картка ресурсу переїжджають у модальну чергу T-019 і мають підписатися на `rank_up`/`resource_unlocked`. TODO: окрема точка підписки в `src/application` з'явиться разом з T-023/T-025.
