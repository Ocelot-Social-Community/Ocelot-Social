// The brandable theme surface is the set of CSS custom properties the webapp declares on `:root`. It is
// deliberately NOT enumerated here any more: a hand-maintained copy had fallen ~160 properties behind,
// and a generated copy was still a second definition of values that already exist in the stylesheets.
//
// Who answers "which properties exist?" now:
//   • the admin UI — utils/themeTokens.js reads them from the loaded stylesheets (always current, and
//     it also knows what the ACTIVE brand resolved them to);
//   • the brand build — scripts/theme-catalog.ts reads webapp/assets/css/*.css when that directory is
//     reachable, which is how the typo warning works in this repo. A brand packaged in its own repo has
//     no webapp next to it, so there the check simply does not run.
//
// A brand overrides them by declaring `:root { --x: y }` in one of the stylesheets it lists under
// `assets.css`. The build raises that sheet's `:root` to `:root:root` when packing, so the brand wins
// where they win on specificity rather than on load order.

/**
 * The framework's own primary colour. The one value that must exist WITHOUT reading any stylesheet:
 * the PWA manifest needs a literal colour (it cannot resolve `var()`), and it is generated for brands
 * that never set `color-primary`. Kept honest by test/theme.spec.ts, which compares it against the
 * value the webapp's CSS actually declares.
 */
export const DEFAULT_COLOR_PRIMARY = 'rgb(23, 181, 63)'

/**
 * The browser-chrome / PWA `theme_color` — the brand's primary colour. It is NOT a separate metadata
 * field (that used to be a special `metadata.themeColor` carved from identity into theme, which broke
 * for partial packages that provide identity but not theme). It is simply the `color-primary` theme
 * token, with the framework default as fallback.
 */
export function resolveThemeColor(theme?: { themeColor?: string }): string {
  // Deliberate `||`, not `??`: an empty-string colour is not a usable value either, so it must fall
  // back to the framework default just like an absent one.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return theme?.themeColor || DEFAULT_COLOR_PRIMARY
}
