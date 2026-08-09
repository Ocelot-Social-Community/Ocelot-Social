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
// where they win on specificity rather than on load order. It also RESOLVES those declarations and
// stores them in `theme.tokens`, which is how a value gets out of CSS and into a manifest or a mail.
import { FRAMEWORK_TOKENS } from './frameworkTokens.js'

/**
 * The framework's own primary colour — the value a brand that sets no `color-primary` falls back to.
 *
 * DERIVED from the token snapshot rather than written out here. It used to be a hand-kept literal with
 * a drift guard (scripts/theme-catalog.spec.ts) holding it against the stylesheets; now that the whole
 * framework palette ships with the package there is nothing left to keep in step, and the guard covers
 * the snapshot instead. Still exported: it is the answer to "what is the colour when nobody chose one",
 * which reads better than an index into a map at every call site.
 */
export const DEFAULT_COLOR_PRIMARY = FRAMEWORK_TOKENS['color-primary']

/**
 * The browser-chrome / PWA `theme_color` — the brand's primary colour, as a literal a manifest can use.
 *
 * Not a field of its own: it is simply the `color-primary` entry of the brand's resolved theme tokens.
 * It was a scalar (`theme.themeColor`) while `color-primary` was the only value anything needed to
 * read out of CSS; once the build could resolve the whole palette, a dedicated field for one token was
 * a special case with nothing special about it. (Before that it was `metadata.themeColor`, which broke
 * for partial packages providing identity but no theme — hence the move into `theme` in the first
 * place.)
 *
 * `themeColor` is still READ, from archives built before `tokens` existed. Both fields are generated,
 * so no brand ever authored either one and nothing needs rewriting — but the ARCHIVE is an artifact
 * that outlives the build that made it: a running deployment mounts brand archives from a volume that
 * a new app image does not touch. Without this fallback such an archive composes to `tokens: {}` and
 * the network's browser chrome quietly reverts to ocelot green, with nothing in any log to say so.
 * Reading one dead field is a cheaper price than that. It can go once no 0.1.x archive is in the wild.
 */
export function resolveThemeColor(theme?: {
  tokens?: Record<string, string>
  /** @deprecated Archives built before 0.1.2 — superseded by `tokens['color-primary']`. */
  themeColor?: string
}): string {
  // Deliberate `||`, not `??`: an empty-string colour is not a usable value either, so it must fall
  // back like an absent one — for the legacy field too, which the old build wrote as '' when a brand
  // declared no --color-primary.
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  return theme?.tokens?.['color-primary'] || theme?.themeColor || DEFAULT_COLOR_PRIMARY
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
}
