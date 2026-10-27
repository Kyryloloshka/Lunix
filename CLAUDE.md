# Dev Clicker: Junior → CEO

Offline-first Expo + React Native + TypeScript incremental game. Read the rule files below before
changing code; they are binding for every task in this repo. The full product spec (market, hooks,
economy, epics E1–E20, architecture, roadmap) is in `docs/PRD.md` — open the relevant section before
designing a feature or changing balance.

@.agents/rules/project.md
@.agents/rules/safe-code.md
@.agents/rules/product.md

## Task hub
Larger features, refactors and UX batches live in `docs/tasks/` (index and format in
`docs/tasks/README.md`). When picking one up, set its `status`, follow its acceptance criteria, stop at
any `needs-approval` step, and update the index table when done.
Running several tasks in parallel through subagents (tech-lead role): follow `docs/tasks/TECH-LEAD.md`.

## Commands
- Typecheck: `npm run ts:check`
- Tests: `npm test`
- Bundle smoke check: `npx expo export --platform web --output-dir <temp dir>`

## Where things live
- Save/load and offline progress: `src/application/persistence/`
- Currency, ticks, stress, flow: `src/entities/currency/model/currencyStore.ts`
- Skill costs and effects: `src/entities/skill/model/skillEffects.ts`
- Skill purchases, upgrades, promotion, rate sync: `src/features/purchase-skill/model/skillStore.ts`
- Big numbers: `src/shared/lib/decimal/Decimal.ts`
