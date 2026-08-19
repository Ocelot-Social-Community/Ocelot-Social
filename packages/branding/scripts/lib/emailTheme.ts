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
 * One `var(…)` expression located in a declaration: where it starts, where its OWN closing paren is,
 * which token it names and what it falls back to.
 *
 * `end` is why this is a scan and not a regular expression. A fallback may itself be a function call —
 * `var(--color-primary, rgb(1, 2, 3))` is ordinary CSS — so the expression ends at a BALANCED paren,
 * something a regular language cannot express. The pattern this replaced stopped at the first `)` and
 * substituted `var(--color-primary, rgb(1, 2, 3)`, leaving the final `)` stranded: a resolvable token
 * came out as `rgb(23, 181, 63))` and travelled all the way into the generated stylesheet, where every
 * mail client drops the declaration.
 */
type VarScan =
  | { kind: 'none' }
  /** A `var(` whose expression never closes — the declaration is broken, so the token is unusable. */
  | { kind: 'malformed' }
  | { kind: 'ref'; start: number; end: number; name: string; fallback: string | null }

/** The custom-property name inside `var(`, applied STICKY at the position just past the paren. */
const VAR_NAME = /\s*--([a-zA-Z0-9-]+)\s*/y

/**
 * The first `var(…)` in `value`, delimited by the paren that closes it.
 *
 * Not quote-aware: a `)` inside a quoted string (`var(--x, ")")`) would be counted as structure. That
 * is knowingly left out — a paren inside a quoted CSS value is vanishingly rare next to the fallback
 * function this exists for, and handling it properly means a tokeniser, not a counter.
 */
function findVarRef(value: string): VarScan {
  for (let open = value.indexOf('var('); open !== -1; open = value.indexOf('var(', open + 4)) {
    VAR_NAME.lastIndex = open + 4
    const named = VAR_NAME.exec(value)
    // Those four characters also end other identifiers (`myvar(x)`), and `var(--a b)` is not a
    // reference either. Neither is an error — keep looking for a real one, as the old pattern did.
    if (!named) {
      continue
    }
    const afterName = VAR_NAME.lastIndex
    if (value[afterName] === ')') {
      return { kind: 'ref', start: open, end: afterName + 1, name: named[1], fallback: null }
    }
    if (value[afterName] !== ',') {
      continue
    }

    let depth = 1 // the `var(` itself
    for (let i = afterName + 1; i < value.length; i++) {
      if (value[i] === '(') {
        depth++
      } else if (value[i] === ')' && --depth === 0) {
        return {
          kind: 'ref',
          start: open,
          end: i + 1,
          name: named[1],
          fallback: value.slice(afterName + 1, i),
        }
      }
    }
    return { kind: 'malformed' } // ran off the end: a `)` is missing
  }
  return { kind: 'none' }
}

/**
 * Every `var(--x)` a declaration mentions, matched by its OPENING only — so a reference nested inside
 * another one's fallback counts like any other. That is the dependency-graph rule verbatim: "if the
 * value of a custom property prop contains a var() function referring to the property var (including
 * in the fallback argument of var()), add an edge" (css-variables-1 §3).
 *
 * Deliberately not findVarRef: that one delimits whole expressions in order to REPLACE them and yields
 * the outermost first, while an edge is owed to every reference at any depth. Edges and substitutions
 * are different questions and the answer to one is not the answer to the other.
 */
const VAR_REFS = /var\(\s*--([a-zA-Z0-9-]+)/g

function referencesIn(value: string): string[] {
  // `matchAll` clones the regex, so the shared `g` literal carries no lastIndex between calls.
  return [...value.matchAll(VAR_REFS)].map((match) => match[1])
}

/**
 * The tokens lying ON a dependency cycle — the ones CSS makes invalid at computed-value time, so that
 * `--a: var(--b, red); --b: var(--a)` yields no colour at all rather than red.
 *
 * Answered BEFORE any value is substituted, and separately from it. The substitution walk is not a
 * usable source for this even now that it handles nested fallbacks: it only ever descends into the
 * branch it TAKES, so a reference in a fallback that never gets used is never traversed — and an edge
 * exists whether or not the fallback is reached. `--a: var(--missing, var(--b)); --b: var(--a, red)` is
 * a cycle for that reason, while the walk resolves each of the two by a route that avoids the other.
 *
 * Tarjan, rather than "did the walk re-enter a node": membership in a cycle is membership in a
 * strongly connected component, and only an SCC pass answers that for every node in one traversal.
 * Marking whatever sat on the current path at the moment of re-entry gets the common cases right and
 * quietly misses nodes whose cycle is entered from elsewhere.
 */
function cyclicTokens(raw: Record<string, string>): Set<string> {
  const names = Object.keys(raw)
  const idOf = new Map(names.map((name, i) => [name, i]))
  // Edges to DECLARED tokens only: a reference to a token nobody declares is a dead end, not a node.
  const edges = names.map((name) =>
    referencesIn(raw[name])
      .map((ref) => idOf.get(ref))
      .filter((id): id is number => id !== undefined),
  )

  const index = new Array<number>(names.length).fill(-1)
  const lowLink = new Array<number>(names.length).fill(0)
  const onStack = new Array<boolean>(names.length).fill(false)
  const stack: number[] = []
  const cyclic = new Set<string>()
  let counter = 0

  const visit = (v: number): void => {
    index[v] = counter
    lowLink[v] = counter
    counter++
    stack.push(v)
    onStack[v] = true
    for (const w of edges[v]) {
      // A self-reference is a cycle of one; an SCC of size 1 cannot say so on its own.
      if (w === v) {
        cyclic.add(names[v])
      }
      if (index[w] === -1) {
        visit(w)
        lowLink[v] = Math.min(lowLink[v], lowLink[w])
      } else if (onStack[w]) {
        lowLink[v] = Math.min(lowLink[v], index[w])
      }
    }
    if (lowLink[v] !== index[v]) {
      return
    }
    // v roots an SCC: everything above it on the stack belongs to the same component.
    const component: number[] = []
    let member: number
    do {
      member = stack.pop() ?? -1
      onStack[member] = false
      component.push(member)
    } while (member !== v)
    if (component.length > 1) {
      for (const m of component) {
        cyclic.add(names[m])
      }
    }
  }

  for (let v = 0; v < names.length; v++) {
    if (index[v] === -1) {
      visit(v)
    }
  }
  return cyclic
}

/**
 * Flattens a token map: every `var(--other)` replaced by the value it points at, recursively.
 *
 * A token that cannot be flattened is DROPPED rather than passed through. The callers want values to
 * put in a mail, and `style="color: var(--color-primary)"` in a client that cannot resolve it is not a
 * degraded colour — it is an invalid declaration, i.e. no colour at all. Better to leave the framework
 * value in place than to emit one the client throws away. Four ways to be unresolvable, none of them
 * worth failing a build over: a reference to a token nobody declares AND carrying no fallback,
 * membership in a cycle (`--a: var(--b); --b: var(--a)` — every token on the cycle, fallbacks
 * notwithstanding, and counting references nested inside a fallback), a reference whose own target is
 * unresolvable, and a declaration that is not parseable CSS (a `var(` that never closes, or one whose
 * contents are not a custom-property name).
 *
 * A NESTED fallback is not among them. `--a: var(--nope, var(--x))` resolves to `--x`'s value, exactly
 * as a browser resolves it: the outer reference falls back to its second argument, which is itself a
 * reference. It used to be dropped, but for a reason that was never about CSS — the pattern that found
 * references stopped at the first `)` and could not have replaced the outer expression without leaving
 * a stray paren behind. Delimiting the expression properly removed the obstacle, not just its symptom.
 *
 * A token merely POINTING AT an unresolvable one still gets its own fallback: `--c: var(--a, blue)` is
 * blue when `--a` is unresolvable, which is what a browser does too — the fallback is only forfeited by
 * the tokens inside the cycle.
 */
export function resolveTokens(raw: Record<string, string>): Record<string, string> {
  // Phase 1 — the graph. Every token on a cycle is invalid before a single value is looked at, which
  // is also what makes phase 2 terminate: with the cycles already short-circuited, what is left to
  // walk is a DAG, so the substitution needs no re-entry guard of its own.
  const cyclic = cyclicTokens(raw)
  const resolved: Record<string, string> = {}

  // Phase 2 — the values.
  const resolve = (name: string): string | null => {
    if (cyclic.has(name)) {
      return null
    }
    if (Object.hasOwn(resolved, name)) {
      return resolved[name]
    }
    if (!Object.hasOwn(raw, name)) {
      return null
    }
    let out: string | null = raw[name]
    // A single declaration can hold several references (`0 1px var(--a), 0 2px var(--b)`), so this
    // loops until none is left rather than replacing once.
    for (let ref = findVarRef(out); ref.kind !== 'none'; ref = findVarRef(out)) {
      // A declaration missing its closing paren is not CSS anyone can substitute into; drop the token
      // rather than emit half of it.
      if (ref.kind === 'malformed') {
        out = null
        break
      }
      // A fallback goes in AS TEXT, references and all. Nothing special is needed for a nested one:
      // splicing it in leaves it as the next `var(…)` in `out`, which this same loop then picks up —
      // `var(--nope, var(--x))` becomes `var(--x)` becomes the value of `--x`. Each pass removes one
      // reference (a resolved value carries none, and a fallback is shorter by its own `var(`), so the
      // loop still terminates on the DAG phase 1 left behind.
      const replacement = resolve(ref.name) ?? ref.fallback?.trim() ?? null
      if (replacement === null) {
        out = null
        break
      }
      // Spliced by INDEX, not String.replace: a replacement is a literal, and `replace` would read
      // `$&` / `$'` in a token's value as substitution patterns.
      out = out.slice(0, ref.start) + replacement + out.slice(ref.end)
    }
    // Last guard, and the one that makes the promise in this function's contract literal: nothing that
    // still NAMES a custom property may be stored. The loop above only substitutes references it can
    // parse, so a construct that is not valid var() syntax — `var(--b c)` — is skipped by it and would
    // otherwise be written into the stylesheet verbatim: precisely the declaration a mail client
    // discards. Phrased with referencesIn, so "is a reference" means the same thing here as it does to
    // the dependency graph.
    if (out !== null && referencesIn(out).length > 0) {
      out = null
    }
    if (out !== null) {
      resolved[name] = out.trim().replace(/\s+/g, ' ')
    }
    return out
  }

  for (const name of Object.keys(raw)) {
    resolve(name)
  }
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
    if (!Object.hasOwn(after, token)) {
      continue
    }
    const value = after[token]
    if (Object.hasOwn(before, token) && value === before[token]) {
      continue
    }
    const declarations = rules.get(selector) ?? []
    declarations.push(`  ${property}: ${value};`)
    rules.set(selector, declarations)
  }
  if (rules.size === 0) {
    return ''
  }

  const body = [...rules]
    .map(([selector, declarations]) => `${selector} {\n${declarations.join('\n')}\n}`)
    .join('\n\n')
  return `/* Generated from this brand's theme tokens — see packages/branding/scripts/lib/emailTheme.ts.
   Values are resolved literals: e-mail clients do not implement CSS custom properties. Only tokens
   this brand overrides appear here; everything else keeps the framework's e-mail styling. */
${body}\n`
}
