/** Shared layout limits (T-002). Domain-agnostic: screen column width, touch targets, font scaling caps. */

/** Content column on wide screens (web, tablets): HUD, tab content and dock stay readable and centered. */
export const CONTENT_MAX_WIDTH = 520;

/** Minimum effective touch target, in pt (iOS HIG 44, Material 48). */
export const MIN_TOUCH_TARGET = 44;

/** Cap for dense numeric text (HUD values, badges) so large system fonts don't break the grid. */
export const DENSE_TEXT_MAX_FONT_SCALE = 1.3;

/** Cap for headings and body text inside panels. */
export const TEXT_MAX_FONT_SCALE = 1.6;
