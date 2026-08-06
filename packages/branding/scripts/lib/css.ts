// Reads the one thing the brand build needs to understand about CSS: which custom properties a `:root`
// block declares. Used to derive the theme catalogue from the webapp's stylesheets
// (scripts/theme-catalog.ts) and to let a brand author its theme as a real `theme.css` instead of a JS
// object (scripts/lib/build-brandings.ts).
//
// BUILD-TIME ONLY, and that is why it lives under scripts/ rather than in src/. Nothing parses CSS in
// the running app: the archive is baked during the image build (webapp/Dockerfile → build-brand-archive)
// and the app only reads the result. Were this file in src/, `export *` would make it reachable from
// `dist/index.js` — which the backend imports at startup — and every server process would load postcss
// for a function it never calls. Under scripts/ only the tools half touches it.
import postcss from 'postcss'

/**
 * Every `--custom-property` declared in a `:root` rule, keyed WITHOUT the leading `--`, in cascade
 * order (a later declaration wins, as in the browser).
 *
 * Restricted to `:root` on purpose: those are the document-level knobs. A property scoped to a
 * component selector is that component's private business, not part of the brandable surface — and a
 * brand that wants to restyle a component ships a stylesheet via `assets.css` instead.
 *
 * `topLevelOnly` drops rules nested inside an at-rule or another rule. The two callers want opposite
 * things and both are right: the CATALOGUE wants every declared name, because a token wrapped in
 * `@media (prefers-color-scheme: dark)` is still a token a brand may set — while a value that has to
 * travel OUT of CSS as a concrete colour (`theme.themeColor` → the PWA manifest, which cannot evaluate
 * a media query) is only meaningful if it holds unconditionally.
 *
 * Throws `CssSyntaxError` on malformed input. Callers that read brand-authored files catch it; callers
 * reading the framework's own stylesheets let it fail the build.
 */
export function customPropertiesIn(
  css: string,
  { topLevelOnly = false }: { topLevelOnly?: boolean } = {},
): Record<string, string> {
  const out: Record<string, string> = {}
  postcss.parse(css).walkRules((rule) => {
    if (topLevelOnly && rule.parent?.type !== 'root') return
    // `:root`, `:root:root` (what a brand override uses), `:root, :root` — root and nothing else.
    if (!rule.selectors.every((s) => /^(:root)+$/.test(s))) return
    // `each`, not `walkDecls`: only this rule's OWN declarations. A nested `:root { .card { --x: 1 } }`
    // declares `--x` on `.card`, not on the root.
    rule.each((node) => {
      if (node.type !== 'decl' || !node.prop.startsWith('--')) return
      out[node.prop.slice(2)] = node.value.trim().replace(/\s+/g, ' ')
    })
  })
  return out
}
