# Design system: Terminal Workbench

The game looks like the IDE a developer has open at 2 a.m.: dark graphite surfaces, warm paper text,
phosphor-green accents and a monospace font. This page is the short guide. The tokens are the source
of truth: `src/shared/theme` (colors, type, motion) and `src/shared/ui` (components).

## Principles: "IDE, not casino" ("IDE, а не казино")
1. **Calm by default, juicy on purpose.** Surfaces are flat and quiet. Motion and bright color are
   reserved for real events (a tap, a purchase, a promotion, Flow), so they keep meaning something.
2. **Developer-recognizable.** Mono type, glyphs such as `>_`, `</>`, `⌥`, line numbers, status-bar
   chips. Parody brands only (see `.agents/rules/product.md`).
3. **One resource = one color + one glyph**, everywhere. Never two resources with the same look.
4. **No emoji in UI or strings.** Use `DevGlyph` / `ResourceValue`. Emoji render differently per
   platform and break the IDE look.
5. **Readable and accessible.** Text ≥ 11 pt, text/surface contrast ≥ 4.5:1 (tested), touch targets
   ≥ 44 pt, state never shown by color alone, motion respects Reduced Motion.
6. **Honest feedback.** What the UI shows must match the effect in the model (no "CRIT" without a
   crit bonus, no fake odds).

## Tokens (`@shared/theme`)
| Group | What | Use |
| --- | --- | --- |
| `colors.surface.{base,raised,overlay,sunken,inset}` | Backgrounds by elevation | Screens, panels, popovers, wells, inputs |
| `colors.text.{primary,secondary,muted,onAccent}` | Text | `onAccent` on filled accent buttons |
| `colors.border.*` | Lines | Panel and row borders |
| `colors.feedback.{success,warning,danger}` (+`*Bg`) | State | Success/warn/error, never decoration |
| `colors.focus` | Focus ring | Keyboard / switch navigation |
| `colors.accent.*` | Raw decorative hues | Prefer `getRankTheme(rank).accent` for the brand accent |
| `resources.{capital,cognitive,influence,stress,flow}` | `{ color, bg, glyph, labelKey }` | Every place a resource is shown |
| `spacing`, `radii`, `shadows` | Layout scale | No magic numbers in widgets |
| `typography.roles.{display,title,body,label,monoNum}` | Text styles by role | Spread into `StyleSheet.create` |

### Typography and the brand font
- Brand font: **JetBrains Mono** (weights 400 / 700 / 800), from the official
  `@expo-google-fonts/jetbrains-mono` package, loaded once at app start by `src/application/fonts`
  (`useBrandFonts`) as one family, `BRAND_MONO_FAMILY`. `fontWeight` picks the face; 900 renders as 800.
- **License:** SIL Open Font License 1.1 (font files); the package code is MIT. OFL allows bundling in
  a commercial app. Do not sell the font on its own and keep the license text (it ships in
  `node_modules/@expo-google-fonts/jetbrains-mono/LICENSE_FONT`; add it to the in-app credits when
  that screen exists).
- Loading never blocks the game: the app shows its plain background until the font is ready, and
  opens anyway after an error or a 3 s timeout. Text then falls back to the system font (web uses the
  CSS stack `JetBrainsMono, monospace`).
- `monoNum` and `display` use `tabular-nums` so ticking counters don't jump.
- `body` stays in the system sans for long text. Everything numeric, labels and titles are mono.

### Numbers and resources
- Format with `formatDecimal` (and `formatCurrency` for Capital, whose unit is `$`). Formatters return
  plain text, never emoji.
- Show the resource with `ResourceValue`: `<ResourceValue kind="cognitive" style={...}>{formatDecimal(v)}</ResourceValue>`
  draws the number followed by the resource glyph in the resource color and gives screen readers
  "12.50K Cognitive". It is a `Text`, so it can sit inline inside other text.
- Where a header already shows the resource glyph and name (HUD stat boxes), the bare number is fine.

### Motion (T-015, `@shared/theme` + `@shared/lib/motion`)
| Token | Values | Use |
| --- | --- | --- |
| `durations` | `instant` 90, `fast` 160, `base` 240, `slow` 400, `celebrate` 1200 ms | Pick by size of the change |
| `easings` | `standard`, `emphasized`, `decelerate` (enter), `accelerate` (exit) | Cubic-bezier curves |
| `springs` | `press`, `pop` | Button press, reward pop |
| `PRESS_SCALE` 0.96, `SLIDE_DISTANCE` 12 | | Press feedback, enter offset |

- Run animations on the UI thread (Reanimated); never re-render React per frame.
- Always go through `resolveDuration` / `useMotionPreference`: with Reduced Motion on, movement
  becomes a fade or an instant change.
- Primitives: `usePressScale`, `useCountUp` / `CountUpText`, `FadeSlideIn`.

## Which component when (`@shared/ui`)
| Need | Use |
| --- | --- |
| A resource amount (price, rate, requirement) | `ResourceValue` |
| Tech or status icon | `DevGlyph` (never emoji) |
| Section or panel frame | `Panel`, `PanelHeader` |
| Small status tag | `Badge` (tone + text, not color alone) |
| Action button | `Button` (tones primary/secondary/ghost/danger; `disabled` + `disabledReason`, `loading`; min 44 pt) |
| One of N choices / view switch | `SegmentedControl` (`role="radio"` for settings, `"tab"` for views) |
| On/off setting | `Toggle` (state shown as text) |
| Stress, combo, progress | `Meter` (`valueText` makes it a `progressbar`; otherwise put the number in nearby text) |
| Icon + text + action row (skill, upgrade, rank) | `ListRow` / `Card` |
| Animated counter / entrance | `CountUpText`, `FadeSlideIn` |

Widgets must not hand-build buttons, segmented switches or bars: use the components above. A test (`widgetStyleRules.test.ts`) fails on hex/rgb colors and numeric `fontSize` below 11 in `src/widgets`.

## Ukrainian copy (T-027)
- Imperative: "Тапай" for the repeated tap that earns a resource (mode hints, intro, first-tap hint);
  "Тапни" only for a one-off confirmation ("Тапни, щоб продовжити"). Same informal "ти" form everywhere
  ("Відкрий", "Купи").
- Resource names are stored in the nominative only. Never put one after a number or a verb that needs
  another case ("Бракує 250 Когнітивка", "Заробити Когнітивка" are wrong). Use a colon so the name reads
  as a label: "Бракує: 250 ◈ Когнітивка", "До «Junior» заробити: Когнітивка". Enforced by
  `src/shared/i18n/__tests__/ukStyle.test.ts`.
- No plural-aware numerals: avoid templates that need "1 / 2–4 / 5+" forms; show the number next to a
  glyph/label instead. If a plural is ever required, add it to the i18n layer first.

## Do / Don't
| Do | Don't |
| --- | --- |
| `colors.text.secondary`, `spacing.md`, `typography.roles.label` | Hex colors or `fontSize: 9` in widgets |
| `<ResourceValue kind="influence">` | `'1.2K ⚡'` or any emoji in strings |
| One glyph per resource from `resources.*` | Reusing a resource's glyph or color for something else |
| Bright color / motion for real events | Constant pulsing, flashing, slot-machine effects |
| Show odds and state as text | State shown only by color; hidden probabilities |
| Respect Reduced Motion | Hard-coded durations that ignore the setting |
| Parody names and generic glyphs | Real logos or brand marks |

Before/after screenshots of each tab go into the PR of each T-004 stage.
