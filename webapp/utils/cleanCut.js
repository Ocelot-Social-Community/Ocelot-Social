// Where to cut a collapsed rich-text preview so nothing is sliced in half.
//
// The cap is a number of lines times the base line height, but headings, list spacing and
// images do not sit on that grid, so cutting at the cap went through the middle of a line
// (#10487). Instead: the bottom of the last line or image that fits under the cap entirely,
// and that nothing else straddles.

// Elements with a box of their own that a cut must not go through. Text is measured per line
// instead, through its Range rects.
const ATOMIC = 'img, video, iframe, hr, svg'

/**
 * The boxes a cut must not split — one per rendered line of text, one per image or rule —
 * as `{ top, bottom }` relative to the top of `content`.
 *
 * Empty where the browser cannot report geometry (jsdom), which `cleanCutHeight` answers with
 * "no better cut than the cap".
 */
export function contentAtoms(content) {
  if (typeof document === 'undefined' || typeof document.createRange !== 'function') return []
  const origin = content.getBoundingClientRect().top
  const atoms = []
  const add = (rect) => {
    if (rect.height > 0) atoms.push({ top: rect.top - origin, bottom: rect.bottom - origin })
  }
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    if (typeof range.getClientRects !== 'function') return []
    Array.from(range.getClientRects()).forEach(add)
  }
  content.querySelectorAll(ATOMIC).forEach((element) => add(element.getBoundingClientRect()))
  return atoms
}

// A cut may lie above the cap only by the browser's layout rounding: it lays boxes out in 1/64 px,
// so a line that ends exactly at the cap can report an edge a fraction past it. Any more, and the
// cap (max-height with overflow hidden) would clip what the cut promised to show whole.
const LAYOUT_UNIT = 1 / 64

// Two lines that touch must not count as one crossing the other: line boxes report fractional
// edges, so their shared edge can differ by a fraction of a pixel.
const TOUCHING = 0.5

/**
 * The height to cut at: the lowest bottom edge at or below `cap` that no atom crosses.
 * Null when there is none — the first line or image is already taller than the cap — and the
 * cap has to stand.
 *
 * The edge is returned as measured, fractions included: rounded up, it could reach past the
 * cap into the next line.
 */
export function cleanCutHeight(atoms, cap) {
  const candidates = atoms
    .map((atom) => atom.bottom)
    .filter((bottom) => bottom <= cap + LAYOUT_UNIT)
    .sort((a, b) => b - a)
  const crosses = (cut) =>
    atoms.some((atom) => atom.top < cut - TOUCHING && atom.bottom > cut + TOUCHING)
  const cut = candidates.find((candidate) => !crosses(candidate))
  return cut === undefined ? null : cut
}
