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

/**
 * The height to cut at: the lowest bottom edge at or above `cap` that no atom crosses.
 * Null when there is none — the first line or image is already taller than the cap — and the
 * cap has to stand.
 *
 * Half a pixel of slack on both comparisons: line boxes report fractional edges, and two
 * lines that touch must not count as one crossing the other.
 */
export function cleanCutHeight(atoms, cap) {
  const SLACK = 0.5
  const candidates = atoms
    .map((atom) => atom.bottom)
    .filter((bottom) => bottom <= cap + SLACK)
    .sort((a, b) => b - a)
  const crosses = (cut) => atoms.some((atom) => atom.top < cut - SLACK && atom.bottom > cut + SLACK)
  const cut = candidates.find((candidate) => !crosses(candidate))
  return cut === undefined ? null : Math.ceil(cut)
}
