# Product rules (from the PRD)

Binding summary of [`docs/PRD.md`](../../docs/PRD.md). Read the PRD section named below before
designing a feature, changing balance, or adding content. If a task conflicts with these rules, say so
instead of silently deviating.

## Vision and audience
- "Cookie Clicker that understands developers": every skill, upgrade, incident and rank is a
  recognizable dev technology or meme. Humor and recognizability are the differentiator. Content is
  parody: no real logos, no implied endorsement (e.g. parody names for Google/React/Docker-like brands).
- Naming convention: no real people at all (NPCs are fictional archetypes). Brands, companies and
  trademarked tech get a parody that still reads as the original (Reakt, Nodle, Dokker, Gooble,
  Macrosoft, TubeTube, Stack Overflaw). Generic terms stay as is (HTML, CSS, JavaScript, Git, Rust,
  SaaS, Event Loop). `src/application/__tests__/parodyContent.test.ts` enforces this for all
  locales and registry ids. Add new real names to its `FORBIDDEN` list. A temporary exception goes
  in `ALLOWLIST` with the id of the task that renames it.
- Core audience: developers/QA/DevOps 20–35; also IT students and general idle fans.
- North Star: daily actives who made ≥ 1 promotion or prestige that week. Targets 1.0: D1 45%,
  D7 20%, D30 12%, 6 sessions/day, 8 min/session.

## Core loop (PRD §5)
- Three nested loops must always show a visible next goal:
  - micro (seconds): tap / crit → combo → Flow ×3 → Golden Commit;
  - meso (minutes–hours): Capital → skills & hiring → upgrades → promotion;
  - macro (days): Exit / IPO → Equity → faster next run → new era.
- Resources: Capital, Cognitive, Influence, Stress (bounded meter 0–100, never spendable), plus planned
  Equity (prestige currency, +2% to all output per unit) and GitHub Stars (soft premium currency).
  Keep every currency distinct in types and UI.
- Formulas: `cost(n) = base · r^n` with r 1.15–1.20; income multiplies level × per-level × 2^milestones
  (levels 25/50/100/200) × upgrades × (1 + 0.02·Equity) × (1 + 0.01·achievements);
  `Equity = floor(sqrt(totalCapitalEarned / 1e12))`.
- Balance targets: first purchase ≤ 10 s; next goal ≤ 60–90 s of active play; Trainee 2 min,
  Junior 15 min, Senior ~1 h, CEO and first Exit 2–3 h. Balance changes must be checked with the
  balance simulator (E8) once it exists.

## Engagement hooks and ethics (PRD §4)
- Each new feature names the hook it serves (variable reward, goal-gradient, Zeigarnik, offline
  surprise, prestige, daily ritual, collection, simulated comparison, autonomy, juice, curiosity,
  phase shift) and the metric it moves.
- Hooks reward returning; they never punish absence. Mandatory limits:
  - no paid loot boxes or hidden odds; show all probabilities;
  - streaks have a free freeze; missing a day never deletes progress;
  - NPC leaderboard entries are always labeled simulated;
  - push notifications ≤ 2/day, quiet hours, easy opt-out;
  - ads are always optional rewarded video, never forced interstitials.

## Scope and priorities (PRD §6, §9)
- Build order: Phase 0 Foundation (E1 engine, E2 save/offline, E8 balance sim) → Phase 1 MVP
  (E3 FTUE, E4 skill content, E5 Golden Commit & incidents, E6 Exit/IPO prestige, E7 achievements,
  E9 juice) → Phase 2 1.0 (E10 interviews, E11 team, E12 dailies, E13 contracts, E14 local push,
  E15 monetization, E16 analytics) → Phase 3 (E17 eras, E18 tech tree/merge, E19 LiveOps,
  E20 cloud save & real leaderboard).
- Do not start a later phase's epic before the current phase's P0 acceptance criteria (PRD §6) pass,
  unless the user asks.
- E15, E16, E20 and anything needing network, accounts, ads SDKs or IAP require explicit user
  approval (first release is local-only).

## Architecture direction (PRD §7)
- Target: one pure engine in `entities/game-core` with a single `GameState`; player actions go through
  `reduce(state, action)`, time through `tick(state, dt, ctx)` with injected `rng` and `now`.
- Derived values (rates, multipliers) come from a memoized `computeModifiers(state, content)` selector,
  never stored or saved.
- Content is data: skills, upgrades, ranks, incidents, achievements, perks and quests live in
  registries using generic `Effect { target, op: add | mul | pow, value, scope }` and declarative
  `Condition`s. Adding content must not require engine changes. All player-facing text goes through
  i18n keys (uk/en/es).
- The engine emits `events[]` (`skill_bought`, `rank_up`, `golden_clicked`…); achievements, analytics,
  sound and haptics subscribe to them instead of being called directly.
- Side effects sit behind ports in `shared` (`SaveRepository`, `Analytics`, `Ads`, `IAP`,
  `Notifications`, `Clock`), with adapters wired in `app` and fakes in tests.
- Migrate existing stores toward this incrementally; new systems are written in the target shape.
