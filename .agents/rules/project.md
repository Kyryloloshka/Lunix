# Project rules

## Product decisions
- Build an offline-first career clicker for Expo + React Native + TypeScript.
- The player progresses from student/trainee through engineering and leadership roles toward the fictionalized “Google CEO” endgame; do not imply endorsement by or affiliation with Google.
- Core resources: Capital ($), Cognitive Power, Influence/Rep, and Burnout/Stress. These have distinct roles; stress is a bounded gameplay meter, not a spendable currency. Planned additions per the PRD: Equity (prestige) and GitHub Stars (soft premium); see `product.md`.
- Use a clearly disclosed simulated NPC leaderboard. Never present generated NPC scores as real users, friends, or live rankings.
- Include hard/soft skills, career promotions/interviews, random incidents, offline earnings, haptics, and sound as modular features.
- Keep the first release local-only; no account, backend, or real leaderboard unless explicitly approved.

## Architecture: Feature-Sliced Design
- Use `src/application` (app layer), `src/pages`, `src/widgets`, `src/features`, `src/entities`, and `src/shared` as FSD layers.
- Import only downward through layers: `app -> pages -> widgets -> features -> entities -> shared`. Same-layer slices must not import each other directly; communicate through public APIs or composition at a higher layer.
- Each slice exposes a deliberate public API from `index.ts`. Do not import another slice's internal paths.
- Keep feature-specific UI, model/business logic, hooks, and tests inside that feature's slice (`ui/`, `model/`, `hooks/`, `__tests__/`). Avoid root-level generic `components/`, `hooks/`, or `tests/` buckets for domain code.
- `shared` contains genuinely domain-agnostic infrastructure and UI only. Do not move game rules into `shared`.
- Keep React components focused on rendering and interaction. Put deterministic calculations and state transitions in testable model functions.
- Prefer composition over large components and avoid circular dependencies.

## React Native and Expo
- Use React Native primitives (`View`, `Text`, `Pressable`, `ScrollView`/`FlatList`) rather than DOM elements or web-only CSS.
- Use `StyleSheet.create` or the established project styling system; do not introduce a second styling approach without approval.
- Respect safe areas, small screens, font scaling, accessible touch targets (aim for 44x44pt), and platform differences.
- Use `Pressable` with accessible labels/roles/states for interactive controls. Provide visible feedback and do not convey state by color alone.
- Keep animations on the UI/native thread where possible (e.g. Reanimated when installed and configured). Avoid triggering React renders for every animation frame.
- Avoid expensive work in render and per-frame callbacks. Memoize only when profiling or subscription boundaries justify it.
- Handle app foreground/background transitions explicitly; pause UI timers in background and compute elapsed-time progress from timestamps.
- Use Expo-compatible APIs and install native dependencies with `npx expo install` so versions match the Expo SDK. Verify current Expo support before selecting native modules.
- Treat haptics and sound as optional enhancements: handle unsupported devices, user mute settings, and lifecycle cleanup gracefully.

## Game state, numbers, persistence
- Keep gameplay rules deterministic and independent of React Native UI so they can be unit-tested.
- Centralize resource operations and validate that costs, rewards, and elapsed time are finite, non-negative where applicable, and bounded for meters such as stress.
- Represent unbounded incremental resources with a normalized mantissa/exponent decimal type; never rely on JS `Number` for values that may exceed `Number.MAX_SAFE_INTEGER`.
- Big-number operations and formatting must be pure, normalized, and tested for zero, negatives where supported, exponent alignment, carry/rounding, serialization, and very large exponents.
- Keep currencies distinct in types and UI. Show each resource's purpose and units; do not use a generic ambiguous `amount` when the resource matters.
- Use data-driven registries/configuration for skills, ranks, and incidents; validate unique IDs and references in tests.
- Price curves and progression formulas belong in model modules, not UI. Test purchase affordability, exact balance deductions, scaling, and invalid inputs.
- Persist a versioned, serializable save snapshot; do not persist derived values that can be recomputed. Add safe defaults/migrations and recover gracefully from corrupt or outdated saves.
- Calculate offline earnings from a clamped elapsed duration and a saved timestamp, with one-time claiming to prevent duplicate rewards. Make clock changes and missing saves safe.
- Keep NPC leaderboard data deterministic per player/save (or seeded) and disclose that entries are simulated.

## Testing and quality
- Co-locate tests with the owning slice under `__tests__/`; test pure model logic without rendering where possible.
- Cover big-number arithmetic/formatting, resource generation/spending, upgrade pricing, rank gates, offline earnings, save migration, and incident outcomes.
- Add component tests for important user flows and accessibility semantics when the testing stack is configured.
- Test behavior, not implementation details; avoid snapshots as the only coverage.
- Run formatter/linter, TypeScript checking, unit tests, and an Expo start/build smoke check before calling work complete. Report unavailable checks honestly.
- Do not add packages, native modules, analytics, network calls, or monetization without checking Expo compatibility and getting approval where product scope changes.

## Agent workflow
- Inspect existing files and project scripts before changing them; keep edits scoped and match established conventions.
- Do not claim tests, benchmarks, web research, or builds succeeded unless they actually ran.
- Ask before adding online services, collecting personal data, or changing the disclosed simulated leaderboard into a real one.
