/**
 * Discovers the brandable theme surface from the stylesheets the browser has actually loaded.
 *
 * The admin used to list a hand-maintained table in the branding package (`THEME_DEFAULTS`, 31
 * entries) which had fallen ~160 properties behind what the webapp declares. Reading the live
 * stylesheets removes that second source entirely: a custom property added to any file under
 * assets/css/ shows up here on the next reload, with no build step and nothing to keep in sync.
 *
 * FRAMEWORK DEFAULTS, not effective values. The framework declares its defaults on `:root`; a brand
 * overrides them on `:root:root` (utils/brandingHead.js → THEME_SELECTOR, which outranks `:root` on
 * specificity regardless of load order). Collecting only the plain `:root` rules therefore yields the
 * unbranded baseline — which is what the admin needs to tell "this brand changed it" from "this is
 * the default". Use `effectiveThemeValue()` for what is actually rendering right now.
 *
 * Readable because Nuxt 2 keeps `build.extractCSS: false`, so app CSS is injected as same-origin
 * <style> elements; a brand's own <link> stylesheets are served from our own origin too. Any sheet
 * that still refuses access (SecurityError on cssRules) is skipped rather than throwing.
 */

/** True for a selector list that addresses the document root and nothing else. */
function isFrameworkRoot(selectorText) {
  const parts = String(selectorText || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length > 0 && parts.every((s) => s === ':root')
}

function collectFromRules(rules, out) {
  for (const rule of Array.from(rules || [])) {
    // CSSGroupingRule (@media, @supports, @layer) — recurse into it
    if (rule.cssRules && !rule.selectorText) {
      collectFromRules(rule.cssRules, out)
      continue
    }
    if (!rule.style || !isFrameworkRoot(rule.selectorText)) continue
    for (const prop of Array.from(rule.style)) {
      if (!prop.startsWith('--')) continue
      const value = rule.style.getPropertyValue(prop).trim()
      if (value) out[prop.slice(2)] = value
    }
  }
}

/**
 * Every custom property the framework declares on `:root`, keyed WITHOUT the leading `--` — the same
 * shape a brand's own stylesheets declare them in, so the two can be compared key by key.
 */
export function discoverThemeTokens(doc) {
  const target = doc || (typeof document === 'undefined' ? null : document)
  if (!target) return {}
  const out = {}
  for (const sheet of Array.from(target.styleSheets || [])) {
    let rules
    try {
      rules = sheet.cssRules
    } catch (e) {
      continue // cross-origin stylesheet — not readable, and never ours
    }
    collectFromRules(rules, out)
  }
  return out
}

/** What a token resolves to right now, including the active brand's override and any var() chain. */
export function effectiveThemeValue(name, el) {
  const target = el || (typeof document === 'undefined' ? null : document.documentElement)
  if (!target || typeof getComputedStyle !== 'function') return ''
  return getComputedStyle(target).getPropertyValue(`--${name}`).trim()
}

/**
 * Groups token names by their leading segment (`color-*`, `chat-*`, `z-index-*`, …) so ~190 rows can
 * be presented as a handful of collapsible sections instead of one flat wall.
 */
export function groupThemeTokens(names) {
  const groups = {}
  for (const name of names) {
    const group = /^(z-index)-/.test(name) ? 'z-index' : name.split('-')[0]
    ;(groups[group] = groups[group] || []).push(name)
  }
  for (const list of Object.values(groups)) list.sort()
  return groups
}

/**
 * Which theme properties a brand stylesheet declares, for the admin's Branding page.
 *
 * A brand has two ways to style: theme custom properties and its own component rules. Only the first
 * is listed — an earlier version also counted selectors, which said little and made the row unusable
 * on a stylesheet with dozens of them.
 *
 * Text-level, like the branding package's reader: enough to describe a stylesheet, not a parser for
 * untrusted input. Sanitising an uploaded brand is a separate job with a real parser.
 */
export function summarizeStylesheet(css) {
  const body = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '')
  const customProperties = {}
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = ruleRe.exec(body)) !== null) {
    const parts = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length || !parts.every((s) => /^(:root)+$/.test(s))) continue
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':')
      if (i < 0) continue
      const prop = decl.slice(0, i).trim()
      if (!prop.startsWith('--')) continue
      customProperties[prop.slice(2)] = decl
        .slice(i + 1)
        .trim()
        .replace(/\s+/g, ' ')
    }
  }
  return { customProperties }
}
