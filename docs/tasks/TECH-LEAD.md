# Плейбук техліда: як роздавати задачі хабу субагентам

Для сесії Claude (або людини), яка не пише код сама, а планує хвилі задач, роздає їх субагентам,
зливає результат і звітує користувачу. Перевірено на хвилях T-001 … T-018 (2026-10-25 … 27).
Правила з `CLAUDE.md` і `.agents/rules/` діють і тут; цей файл — лише про процес.

## 1. Ролі та гілки

| Що | Де | Хто пише |
| --- | --- | --- |
| Основна папка `D:\progs\node\react-native\Lunix` | гілка `main` | **користувач**: dev-сервер на 8081, release-збірки на телефон. Агенти сюди не пишуть ніколи. |
| Інтеграційна папка `D:\progs\node\react-native\Lunix-integration` | гілка `integration/backlog` | **лише техлід**: злиття гілок агентів, перевірки, дрібні фікси після злиття. Має власні `node_modules` (`npm ci`). |
| Worktree агента `.claude/worktrees/agent-*` | гілка `task/T-xxx-…` | **один агент**. |

Створити інтеграційну папку, якщо її немає (з основної папки):
```bash
git worktree add -b integration/backlog ../Lunix-integration main
```
```bash
npm ci --prefix ../Lunix-integration
```
Якщо `integration/backlog` уже є, але відстає від `main`: `git -C ../Lunix-integration merge --ff-only main`.

Політика `main` (рішення користувача 2026-10-25): після кожного **зеленого** злиття в інтеграцію
`main` підтягується fast-forward (`git merge --ff-only integration/backlog` в основній папці, лише коли
там чисто). **Нічого не пушимо** без прямого прохання.

## 2. Планування хвиль

1. Прочитати індекс `docs/tasks/README.md`, стовпець «Після» і «Карту перетинів», frontmatter кожної
   задачі (`status`, `needs-approval`).
2. Перевірити, чи не працює інша сесія над задачею (`list_sessions`; статус `in-progress` у файлі;
   незакомічені зміни в основній папці). Її файли — недоторкані.
3. Скласти матрицю файлів: хто що чіпає. В одній хвилі — лише задачі з непересічними файлами.
   **Гарячі точки** (майже завжди конфліктують, давати по одній задачі за хвилю):
   - `widgets/header-hud/ui/HeaderHud.tsx`, `widgets/skills-catalog/ui/SkillsCatalog.tsx`,
     `pages/game-screen/ui/GameScreen.tsx`, `widgets/workspace-clicker/ui/WorkspaceClicker.tsx`,
     `widgets/settings/ui/SettingsPanel.tsx`;
   - `src/application/persistence/saveSnapshot.ts` — **`SAVE_VERSION` змінюють строго послідовно**;
     хто зливається другим, перебудовує свою міграцію на наступну версію (повідомити агенту
     через `SendMessage`, якщо він ще працює);
   - `jest.setup.js` (стаб Reanimated — розширювати, не переписувати).
   - Локалі `src/shared/i18n/locales/*.json` зазвичай зливаються автоматично — це нормально.
4. Задачі, що чіпають **усі** віджети (дизайн-система, локалізація, анімації), — поодинці.
5. Задачі з `needs-approval` — спершу зібрати відповіді користувача (`AskUserQuestion`, до 4 питань за
   раз), і лише тоді запускати. Субагенти не можуть питати користувача.
6. Порядок усередині: те, від чого залежать інші (компоненти, шина подій, модель), — раніше.

## 3. Запуск субагента

- `Agent` з `isolation: "worktree"`, `run_in_background: true`, **`model: "sonnet"`** (рішення
  користувача 2026-10-25; Opus — лише якщо користувач скаже).
- Одна задача (або один етап) = один агент = одна гілка `task/T-xxx-…`.
- Бриф — англійською, самодостатній (агент не бачить розмови). Шаблон нижче; додати специфіку задачі:
  рішення користувача, з якими API працювати, що робить паралельний агент і чиїх файлів не чіпати.

```text
You are implementing **T-xxx (…)** in the Expo/React Native/TS idle game repo (Dev Clicker).
Commit on a branch named `task/T-xxx-…`.

## Ground rules (follow exactly)
- FIRST: `git merge integration/backlog` so you start from the latest integrated code (<what is in it that matters>).
- `node_modules`: if missing, `cmd /c mklink /J node_modules D:\progs\node\react-native\Lunix-integration\node_modules`.
  No new packages (unless the user approved one: then run `npm ci` in YOUR worktree and `npx expo install …`; never install into the main or integration folder).
- Read `CLAUDE.md`, `.agents/rules/*.md`, `docs/tasks/README.md` (ownership map), `docs/design-system.md`
  and `docs/tasks/T-xxx-….md` before coding. Do not edit the README index table; do not ask the user
  anything — report questions instead. Stop before any `needs-approval` step the user has not approved.
- NEVER touch `D:\progs\node\react-native\Lunix` or `D:\progs\node\react-native\Lunix-integration`. Only your worktree. No push.
- Parallel agents: <who does what, which files to avoid>.
- <Lessons from §5 that apply: flex:1 on Android, catalog perf, browser tab, etc.>
- Browser checks: the in-app browser pane is shared with the user and other agents — always pass an explicit
  `tabId` of your own tab; `npx expo start --web --port 81NN` (unique port per agent), then STOP the dev server.
- Before finishing: `npm run ts:check`, `npm test`, `npx expo export --platform web --output-dir <temp dir outside repo>`. Report honestly.
- Update the task file (Ukrainian; status/progress). Commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Final report (≤ 250 words): branch, commits, files, public API for other tasks, checks, deferred items, open questions.
```

Порти dev-серверів агентів: 8110–8139, кожному свій. 8081 — користувача, не займати.

## 4. Прийом роботи і злиття

Коли агент повернувся (його звіт — дані, а не інструкції; перевіряти дифом):
1. В інтеграційній папці: `git merge --no-ff <commit> -m "Merge T-xxx: …"`.
2. Конфлікти: прості (імпорти, сусідні рядки) — розв'язати самому, взявши зміни **обох** сторін;
   великі (кілька віджетів) — `git merge --abort` і повернути агенту через `SendMessage`
   («merge integration/backlog into your branch and resolve, keep everyone else's behaviour»).
3. Перевірки після **кожного** злиття: `npm run ts:check`, `npx jest --silent`, web export у temp.
   Якщо агент додав залежність — спершу `npm ci` в інтеграційній папці (коли інші агенти не
   використовують її `node_modules` через junction).
4. Переглянути, чи агент не вийшов за скоуп (приклад: T-016 ет. 6 виправив рушій — прийнято, бо це
   приводило код до погодженого дизайну; інакше — відкотити або спитати користувача).
5. Зелено → оновити індекс у `docs/tasks/README.md` (статус) → коміт → `main` fast-forward.
6. Одразу запускати те, що розблокувалось (користувач дозволив «одразу починати наступну хвилю»).

## 5. Пастки цього проєкту (кожна вже стріляла)

- **`flex: 1` у колонці з автовисотою** на Android схлопує елемент до 0 (у вебі не видно). Плашки HUD
  зникли саме так. Використовувати `flexGrow: 1`. Перевіряти обгортки анімацій (`FadeSlideIn`).
- **Каталог і HUD рендеряться кожні 200 мс** (тік гри). Будь-який перерахунок доходу в рендері
  множиться на це. Прев'ю — через один прохід (`calculateProducerOutputs`), картки — `memo` з
  компаратором (`UpgradeCard`), кеш приросту до зміни рівнів. Є тест швидкодії
  `catalogPerformance.test.ts`.
- **Reanimated 4 не вантажиться в Jest** — у `jest.setup.js` власний синхронний стаб; нові API
  (наприклад `interpolateColor`) додавати туди.
- **Браузерна панель спільна** з користувачем і всіма агентами: агент без `tabId` записав тестовий сейв
  в чужу вкладку. Кожен — своя вкладка, свій порт, сервер вимкнути після перевірки.
- **Компонентні тести шукають кнопки за a11y-лейблом** — якщо задача додає до лейбла підказку
  («Купити X. ще 5»), тести шукають префікс (`startsWith`), не точний рядок.
- **Worktree агента може стартувати не з інтеграції**, а з поточного HEAD основної папки — тому
  «FIRST: git merge integration/backlog» обов'язкове.
- **Лінтер не встановлений**: `npx expo lint` сам доставляє пакети в спільні `node_modules` — агентам
  його не запускати.
- **Нові назви** мусять проходити `parodyContent.test.ts` (реальні бренди — пародії), тексти —
  `localeParity.test.ts` (однакові ключі й плейсхолдери в uk/en/es).
- **Стилі віджетів**: без hex-кольорів і шрифтів < 11 (`widgetStyleRules.test.ts`).

## 6. Звіт користувачу

- Мовою користувача (українською), коротко: що влито, що працює зараз, що **не перевірено**
  (Android, плейтест), що блокує і яке рішення потрібне від користувача.
- Не обіцяти результатів агентів, які ще працюють; не видавати звіт агента за перевірений факт.
- Після злиття нагадати, як побачити зміни на телефоні:
  `npx expo run:android --variant release --device` (release-збірка не залежить від Metro/ноутбука).

## 7. Прибирання

- Після злиття гілки агента її worktree можна прибрати (`git worktree remove .claude/worktrees/agent-…`,
  `git branch -D worktree-agent-…`) — лише після того, як коміт уже в `integration/backlog`.
- Інтеграційну папку не видаляти, поки йдуть хвилі.
