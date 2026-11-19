// Keeps the keyboard with a small dialog of the call while it is open: in it once it opens, from
// its last element on to its first and back, and back where it came from once it closes. As
// OsModal does it (packages/ui/src/utils/dialog.ts); these dialogs stand inside the call instead
// of over the page.

/** Elements the Tab key can reach. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab and Shift+Tab inside `container`. The container itself counts as the start, as it
 * takes the focus where nothing in it is marked for it. Call it from its keydown handler.
 */
export const trapFocus = (container, event) => {
  if (event.key !== 'Tab' || !container) return
  const focusable = container.querySelectorAll(FOCUSABLE)
  if (focusable.length === 0) {
    // Nothing to go to: the focus stays in the dialog all the same.
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const atStart = document.activeElement === first || document.activeElement === container
  if (event.shiftKey && atStart) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * Moves the focus into `container` as it opens — to the element in it marked `data-autofocus`,
 * else to the container itself, which needs `tabindex="-1"` for that — and returns what gives it
 * back: to where it was, or, where that has left the page meanwhile (a menu closed on the way),
 * to what `fallback` names.
 */
export const takeFocus = (container, fallback = () => null) => {
  const before = document.activeElement
  const target = container.querySelector('[data-autofocus]') || container
  target.focus()
  return () => {
    const back = before && before !== document.body && before.isConnected ? before : fallback()
    if (back && back.isConnected) back.focus()
  }
}
