// Turns a brand's theme tokens into the stylesheet its e-mails are themed with.
//
// WHY LITERALS AND NOT `var()`. E-mail is not a browser. Gmail (web, iOS, Android) drops `:root` and
// does not implement `var()`; Outlook on the Word engine implements neither. Apple Mail does — which
// is the trap, because a `var()`-based theme looks correct to whoever tests it on a Mac and reaches
// half the recipients unstyled. On top of that `email-templates` runs juice over the rendered mail,
// inlining every <style> declaration into a `style=""` attribute; juice copies `var(--x)` across
// verbatim rather than evaluating it, into markup whose custom-property definitions may already be
// gone. So the token graph is flattened HERE, at archive-build time, and the mail carries plain
// colours that every client understands.
//
// WHY ONLY WHAT THE BRAND CHANGED. The framework's own e-mail palette is not token-derived: webflow.css
// hard-codes #333333 for h2, #000000 for body text, #888888 for the footer and `Lato, sans-serif`
// throughout. Emitting the matching design tokens for every brand would silently restyle every mail
// the project sends (--text-color-base is rgb(75, 69, 84), not #333333) — a redesign wearing the
// clothes of a branding fix. A declaration is therefore emitted only where the brand's resolved value
// DIFFERS from the framework's, so a brand that overrides nothing gets no stylesheet at all and its
// mails render exactly as before.
/** One e-mail rule fed by one theme token. */
interface Mapping {
  /** The selector as it appears in webflow.css — this stylesheet is loaded after it and overrides. */
  selector: string
  property: string
  /** Theme token, without the leading `--`. */
  token: string
}

/**
 * The whole brandable surface of a mail. Small on purpose: these are the declarations webflow.css
 * actually makes, and a rule for a selector that does not exist would be dead weight in every archive.
 *
 * `a.button` takes its text colour from `color-primary-inverse` rather than staying white, because a
 * brand whose primary is light (a yellow, a pale green) gets white-on-light and an unreadable button.
 */
export const EMAIL_THEME: readonly Mapping[] = [
  // Links. `text-color-link` is `var(--color-primary)` by default, so overriding the primary alone is
  // enough — the resolver below propagates it.
  { selector: 'a', property: 'color', token: 'text-color-link' },
  { selector: 'a.button', property: 'background', token: 'color-primary' },
  { selector: 'a.button', property: 'color', token: 'color-primary-inverse' },
  { selector: 'h2', property: 'color', token: 'text-color-base' },
  { selector: '.text-block', property: 'color', token: 'text-color-base' },
  { selector: 'footer', property: 'color', token: 'text-color-soft' },
  // The web font itself will not load in most clients; what travels is the FALLBACK family the brand
  // chose, which is the part that actually renders.
  { selector: 'body', property: 'font-family', token: 'font-family-text' },
  { selector: 'a.button', property: 'font-family', token: 'font-family-text' },
  { selector: 'footer', property: 'font-family', token: 'font-family-text' },
]

/**
 * `var(--name)` / `var(--name, fallback)`.
 *
 * The fallback is `[^)]*`, so a NESTED `var()` inside it does not match as one reference — the group
 * would stop at the inner closing paren and replacing it would leave a stray `)` behind, i.e. corrupt
 * CSS. Such a token is treated as unresolvable instead (see below). Deliberately not `[\s\S]*`, which
 * would need to backtrack over the rest of the declaration to find its closing paren.
 */
// (`[^)]*` cannot match the `\)` that follows it, so there is nothing to backtrack over — the
// heuristic reads the optional group as ambiguous. Same false alarm as LOCALE_CODE above.)
// eslint-disable-next-line security/detect-unsafe-regex
const VAR_REF = /var\(\s*--([a-zA-Z0-9-]+)\s*(?:,([^)]*))?\)/

/**
 * Flattens a token map: every `var(--other)` replaced by the value it points at, recursively.
 *
 * A token that cannot be flattened is DROPPED rather than passed through. The callers want values to
 * put in a mail, and `style="color: var(--color-primary)"` in a client that cannot resolve it is not a
 * degraded colour — it is an invalid declaration, i.e. no colour at all. Better to leave the framework
 * value in place than to emit one the client throws away. Four ways to be unresolvable, none of them
 * worth failing a build over: a reference to a token nobody declares, a cycle
 * (`--a: var(--b); --b: var(--a)`), a reference whose own target is unresolvable, and a nested var()
 * in a fallback.
 */
export function resolveTokens(raw: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {}
  const resolving = new Set<string>()

  const resolve = (name: string): string | null => {
    if (Object.hasOwn(resolved, name)) return resolved[name]
    if (!Object.hasOwn(raw, name)) return null
    if (resolving.has(name)) return null // cycle
    resolving.add(name)
    let out: string | null = raw[name]
    // A single declaration can hold several references (`0 1px var(--a), 0 2px var(--b)`), so this
    // loops until none is left rather than replacing once.
    for (let match = VAR_REF.exec(out); match !== null; match = VAR_REF.exec(out)) {
      const whole = match[0]
      const fallback = match.at(2)
      // `match.at`, not destructuring: an optional group is absent at RUNTIME, while the type of an
      // index into RegExpExecArray is a plain string. `.at()` is the accessor that admits it.
      const replacement =
        fallback?.includes('var(') === true ? null : (resolve(match[1]) ?? fallback?.trim() ?? null)
      if (replacement === null) {
        out = null
        break
      }
      out = out.replace(whole, replacement)
    }
    resolving.delete(name)
    if (out !== null) resolved[name] = out.trim().replace(/\s+/g, ' ')
    return out
  }

  for (const name of Object.keys(raw)) resolve(name)
  return resolved
}

/**
 * The e-mail stylesheet for a brand, or '' when the brand changes nothing a mail renders.
 *
 * The two maps are merged BEFORE resolving, not resolved separately — a brand that sets only
 * `--color-primary` must still move `--text-color-link`, which the FRAMEWORK declares as
 * `var(--color-primary)`. `framework` is raw (its values reference each other); `brand` may be either,
 * since flattening an already-literal value is a no-op.
 */
export function buildEmailBrandingCss(
  framework: Record<string, string>,
  brand: Record<string, string>,
): string {
  const before = resolveTokens(framework)
  const after = resolveTokens({ ...framework, ...brand })

  // Grouped by selector so the output reads like a stylesheet someone wrote, not like a dump.
  const rules = new Map<string, string[]>()
  for (const { selector, property, token } of EMAIL_THEME) {
    if (!Object.hasOwn(after, token)) continue
    const value = after[token]
    if (Object.hasOwn(before, token) && value === before[token]) continue
    const declarations = rules.get(selector) ?? []
    declarations.push(`  ${property}: ${value};`)
    rules.set(selector, declarations)
  }
  if (rules.size === 0) return ''

  const body = [...rules]
    .map(([selector, declarations]) => `${selector} {\n${declarations.join('\n')}\n}`)
    .join('\n\n')
  return `/* Generated from this brand's theme tokens — see packages/branding/scripts/lib/emailTheme.ts.
   Values are resolved literals: e-mail clients do not implement CSS custom properties. Only tokens
   this brand overrides appear here; everything else keeps the framework's e-mail styling. */
${body}\n`
}
