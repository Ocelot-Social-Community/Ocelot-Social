/**
 * How an icon file name becomes the key it is looked up by.
 *
 * Deliberately separate from utils/iconRegistry.js: that module calls `require.context`, which only
 * exists inside webpack, so it cannot be imported under Jest at all — test/__mocks__/iconRegistry.js
 * stands in for it there. The naming rule, however, is the part that can actually break, and the part
 * a brand depends on when it drops its own SVGs into assets/icons/svgs/. Keeping it here lets the real
 * registry and the mock share ONE implementation, and lets a test reach it without a bundler.
 */

/**
 * `foo-bar-baz` → `fooBarBaz`. Empty segments are dropped, so `foo--bar` behaves like `foo-bar`.
 */
export function toCamelCase(str) {
  return String(str)
    .split('-')
    .filter(Boolean)
    .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
    .join('')
}

/**
 * The registry key for a `require.context` entry: `./file-text.svg` → `fileText`.
 *
 * Both replacements are anchored, which matters for the extension: `replace('.svg', '')` strips the
 * FIRST occurrence, so `my.svg.icon.svg` would become `my.icon.svg` instead of `my.svg.icon` — a
 * wrong key for a file that exists, i.e. an icon that silently cannot be resolved. Anchoring `./` is
 * defensive rather than a fix: context keys always carry it as a prefix.
 */
export function iconKeyFromFile(fileName) {
  return toCamelCase(
    String(fileName)
      .replace(/^\.\//, '')
      .replace(/\.svg$/, ''),
  )
}
