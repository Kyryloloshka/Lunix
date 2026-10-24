# Safe-code rules (learned from real bugs)

Each rule exists because this codebase already shipped the bug once. Before finishing any change,
check the diff against every section that applies. "Bug" lines describe what actually happened.

## 1. Persistence and saves
- Never write a save before the existing one has been read. Gate autosave/background save behind a
  "loaded" flag. Bug: a fresh empty state could overwrite real progress on cold boot.
- Treat stored data as untrusted input: `JSON.parse` in try/catch, check `version`, validate every
  field (finite numbers, non-negative resources, known skill/upgrade ids, rank within bounds).
  Corrupt or unknown saves start a new game; they never crash or partially apply.
- Persist only source state (balances, levels, upgrades, rank, timestamp). Rates and other derived
  values are recomputed after hydrate, never saved.
- Changing the save shape means bumping `SAVE_VERSION` and adding a migration plus a test.
- Async loads (settings, saves) must not overwrite a value the player changed while the load was in
  flight. Bug: settings loaded late reverted the player's choice.

## 2. Time, loops and app lifecycle
- No unbounded time deltas. Live ticks are clamped (`MAX_TICK_SECONDS`); the game loop stops when the
  app leaves the foreground. Bug: resuming from background granted hours of income in one tick,
  with the Flow multiplier applied.
- Time away is granted exactly once, through `applyOfflineProgress` with `getOfflineSeconds`
  (clamped, 0 when the clock went backwards or the timestamp is missing). Save right after claiming.
- Never let two mechanisms both pay for the same elapsed time (live tick + offline, web background tab).
- Per-tick updates must not reset state that accumulates across ticks. Bug: `tick()` reset the combo
  every 200 ms, so Flow was effectively unreachable. Reset accumulators only on their own expiry.
- Every `setInterval`/`setTimeout`/listener started in an effect is cleared in its cleanup.

## 3. Game rules live in the model, not the UI
- Validation belongs in store actions: affordability, prerequisites, rank requirements, max level.
  UI only hides or disables buttons. Bug: `setRank(any)` accepted any rank; only the button checked.
- Store actions read live state via `get()` / `getState()`, not values captured during render.
  Bug: `buy(id, capital)` used a stale balance from the last render.
- Derived state (rates) is recomputed inside the model after every mutation and after hydrate.
  Bug: rates were synced from a UI handler, so they stayed zero after loading a save.
- A field that is computed but never consumed is a bug signal. Bug: `stressReduction` was calculated
  for three skills and had no effect at all. Wire it up or delete it.
- Feedback must match the effect. Bug: taps showed "CRIT" during Flow while no crit bonus applied.

## 4. Big numbers (`Decimal`)
- Never use `toNumber()` for comparisons, ratios or progress of unbounded values; use Decimal
  `divide`/`compareTo`. Bug: progress bars became NaN past 1e308.
- Exponential formulas (`growth ** level`, `pow`) are computed in log space (`Decimal.fromLog10`).
  Never cap with a sentinel like `1e309`. Bug: costs stopped growing, so MAX could buy ~1M levels
  for the same "capped" price.
- Decimal invariants: integer exponent, `1 <= |mantissa| < 10` or zero, every input finite.
  `fromJSON` rejects anything that isn't finite numbers.
- New numeric code gets tests at 0, negatives (where allowed), and values beyond 1e308.

## 5. Architecture (FSD)
- Import other slices only through their `index.ts`. Never `@widgets/x/model/...`.
- Game state does not live in `widgets`. Stores belong to `entities` / `features`; cross-store
  orchestration (save/load) belongs to `src/application`.
- `src/application` is the app layer (the README/old docs may say `src/app`).

## 6. Security and privacy
- No secrets in the repo: API keys, keystores (`*.jks`, `*.p12`, `*.p8`, `*.key`), `.env*`, EAS
  credentials. Keep `.gitignore` covering them, plus `.claude/settings.local.json`, `.idea/`,
  `eas-build*` logs, `android/`, `ios/`.
- AsyncStorage is plain, unencrypted and user-editable. Never store tokens or personal data there;
  for anything sensitive use `expo-secure-store` (ask first, it's a new dependency).
- No network calls, analytics, or third-party SDKs without explicit approval (offline-first product).
- No `eval`, `new Function`, or dynamic `require` of user/stored data.
- Add dependencies only with `npx expo install` and only after approval.
- `app.json` `android.package` is still `com.anonymous.*`; it must be changed before the first store
  release (it cannot be changed afterwards). Flag it if a release task comes up.

## 7. Verification before calling work done
- Run: `npm run ts:check`, `npm test`, and a bundle smoke check
  (`npx expo export --platform web --output-dir <temp dir>`). Report any that were not run.
- Every bug fix comes with a regression test that would have failed before the fix.
- When committing, stage only the files of this change; leave the user's unrelated edits alone and
  say which files were left out.
