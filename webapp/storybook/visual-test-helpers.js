const STORY_ROOT = '#storybook-root'

// Runs before any of the page's own scripts, on every navigation — so animations are already
// paused at their first frame the moment they'd otherwise start, rather than paused mid-flight at
// whatever frame a style tag injected after the fact happens to catch (which would itself be a
// source of flaky diffs: same spinner, different rotation angle, every run).
const FREEZE_ANIMATIONS_SCRIPT = () => {
  const style = document.createElement('style')
  style.textContent = `
    *, *::before, *::after {
      animation-play-state: paused !important;
      transition: none !important;
      caret-color: transparent !important;
    }
  `
  ;(document.head || document.documentElement).appendChild(style)
}

// Waits until #storybook-root has gone quietMs without a DOM mutation (hard-capped at timeoutMs so
// something that's genuinely still busy — or a mutation loop the animation freeze doesn't cover —
// can't hang a test forever). This is the direct signal for "is tiptap/ProseMirror still building
// the document" — the Editor/ContentViewer stories run a deeply nested list/heading/paragraph tree
// through ProseMirror's schema normalization, which took long enough under some runs that a fixed
// frame-count poll gave up before it finished and screenshotted a shorter, still-building document.
const WAIT_FOR_DOM_QUIET_SCRIPT = ({ quietMs, timeoutMs }) =>
  new Promise((resolve) => {
    const root = document.getElementById('storybook-root') || document.body
    let timer
    const finish = () => {
      observer.disconnect()
      clearTimeout(hardCap)
      resolve()
    }
    const observer = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(finish, quietMs)
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
    timer = setTimeout(finish, quietMs)
    const hardCap = setTimeout(finish, timeoutMs)
  })

/**
 * Navigates to a story's iframe (the same URL Storybook's own "open canvas in new tab" uses) and
 * waits for it to actually render. Combined with the init script above and the fixed faker seed /
 * fixed dates in the stories themselves, this is what makes a screenshot the same on every run.
 */
async function gotoStory(page, storyId) {
  await page.addInitScript(FREEZE_ANIMATIONS_SCRIPT)
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`, { waitUntil: 'domcontentloaded' })
  const root = page.locator(STORY_ROOT)
  await root.waitFor()
  // `document.fonts.ready` only waits for fonts the browser has *already* decided it needs — the
  // self-hosted LatoWeb/Gentium Basic (assets/css/resets.css) aren't requested until the text that
  // uses them actually exists in the DOM. Right after root.waitFor(), that's frequently before
  // ContentViewer/Editor have mounted their tiptap content, so this first wait resolves too early
  // to cover them.
  await page.evaluate(async () => document.fonts.ready)
  // Toolbar icons in the tiptap-based Editor/ContentViewer are separate lazy-loaded chunks — waiting
  // only on fonts caught the text but not those, so the very first screenshot after a fresh
  // navigation could still be taken mid-layout-shift as they popped in a moment later. Networkidle
  // (no more than 0 connections for 500ms) covers that without hardcoding a component-specific wait.
  await page.waitForLoadState('networkidle')
  // Let tiptap/ProseMirror actually finish building the document (deeply nested list/heading trees
  // took long enough under some runs that a fixed frame-count poll gave up early) and, by now
  // needing them, request its fonts.
  await page.evaluate(WAIT_FOR_DOM_QUIET_SCRIPT, { quietMs: 300, timeoutMs: 5000 })
  // Those newly-requested fonts finishing can itself cause one more reflow (fallback → self-hosted
  // font, different metrics) — mutation-quiet again to let that settle before the screenshot.
  await page.evaluate(async () => document.fonts.ready)
  await page.evaluate(WAIT_FOR_DOM_QUIET_SCRIPT, { quietMs: 150, timeoutMs: 2000 })
  return root
}

module.exports = { gotoStory, STORY_ROOT }
