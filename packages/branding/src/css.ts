// A deliberately small CSS reader for the one thing this package needs to understand about CSS: which
// custom properties a `:root` block declares. Used twice — to derive the theme catalogue from the
// webapp's stylesheets (scripts/theme-catalog.ts) and to let a brand author its theme as a real
// `theme.css` instead of a JS object (scripts/lib/build-brandings.ts).
//
// Not a general CSS parser and not meant to become one: it recognises rules and declarations, which is
// all a `:root { --x: y }` block is. Anything more (nesting, at-rule semantics, sanitising untrusted
// input) belongs in a real parser, and the package stays dependency-free as long as it doesn't need one.

/** Strips comments. Values that legitimately contain `/*` do not occur in a custom-property block. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Every `--custom-property` declared in a `:root` rule, keyed WITHOUT the leading `--`, in cascade
 * order (a later declaration wins, as in the browser).
 *
 * Restricted to `:root` on purpose: those are the document-level knobs. A property scoped to a
 * component selector is that component's private business, not part of the brandable surface — and a
 * brand that wants to restyle a component ships a stylesheet via `assets.css` instead.
 */
export function customPropertiesIn(css: string): Record<string, string> {
  const out: Record<string, string> = {}
  // Every innermost rule. No `}`-anchor before the selector: the previous match consumes it, which
  // would make each rule after the first invisible. `[^{}]+` already cannot cross a brace.
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  const body = stripComments(css)
  let m: RegExpExecArray | null
  while ((m = ruleRe.exec(body)) !== null) {
    const selectors = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    // `:root`, `:root:root` (what a brand override uses), `:root, :root` — root and nothing else.
    if (!selectors.length || !selectors.every((s) => /^(:root)+$/.test(s))) continue
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':')
      if (i < 0) continue
      const prop = decl.slice(0, i).trim()
      if (!prop.startsWith('--')) continue
      out[prop.slice(2)] = decl
        .slice(i + 1)
        .trim()
        .replace(/\s+/g, ' ')
    }
  }
  return out
}
