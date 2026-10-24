# Dev Clicker: Junior → CEO

Offline-first Expo + React Native + TypeScript incremental game. Read both rule files below before
changing code; they are binding for every task in this repo.

@.agents/rules/project.md
@.agents/rules/safe-code.md

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
