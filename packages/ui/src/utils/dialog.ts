import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue-demi'

import type { Ref } from 'vue-demi'

/**
 * Behaviour shared by the modal surfaces (OsModal, OsDrawer): what keeps the user inside an
 * open dialog and the page behind it still. Composables run inside a component's setup().
 */

/** Elements the Tab key can reach. */
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab and Shift+Tab inside `container`: from its last focusable element to its first,
 * and back. The container itself counts as the start — a dialog that focuses its panel on
 * open would otherwise let the first Shift+Tab out to the page behind it. Call it from the
 * container's keydown handler.
 */
export function trapFocus(container: HTMLElement | null, event: KeyboardEvent): void {
  if (event.key !== 'Tab' || !container) {
    return
  }
  const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  if (focusable.length === 0) {
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
 * Stops the page behind an open dialog from scrolling, and gives it back exactly as it was —
 * on close and on unmount.
 */
export function useBodyScrollLock(isOpen: () => boolean): void {
  let previousOverflow = ''
  let locked = false

  const release = () => {
    if (locked) {
      document.body.style.overflow = previousOverflow
      locked = false
    }
  }

  watch(
    isOpen,
    (open) => {
      /* v8 ignore start -- SSR guard */
      if (typeof document === 'undefined') {
        return
      }
      /* v8 ignore stop */
      // The watcher only fires on a change, so an open here never finds itself locked.
      if (open) {
        previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        locked = true
      } else {
        release()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(release)
}

/** Calls `onEscape` when Escape is pressed anywhere while the dialog is open. */
export function useEscapeKey(isOpen: () => boolean, onEscape: () => void): void {
  const onKeydown = (event: KeyboardEvent) => {
    if (isOpen() && event.key === 'Escape') {
      onEscape()
    }
  }
  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
  })
}

/**
 * Moves the focus into the dialog when it opens — to the element inside marked `data-autofocus`
 * if it takes the focus, else to `panel` itself, which needs `tabindex="-1"` for that — and gives it
 * back to where it was when the dialog closes, or unmounts while open. Only where it can still
 * go: that element may have left the page meanwhile.
 */
export function useDialogFocus(isOpen: () => boolean, panel: Ref<HTMLElement | null>): void {
  let returnFocusTo: HTMLElement | null = null

  const giveBack = () => {
    const target = returnFocusTo
    returnFocusTo = null
    if (target?.isConnected) {
      target.focus()
    }
  }

  watch(
    isOpen,
    async (open, wasOpen) => {
      /* v8 ignore start -- SSR guard: immediate, so this runs in setup() on the server too */
      if (typeof document === 'undefined') {
        return
      }
      /* v8 ignore stop */
      if (open) {
        returnFocusTo = document.activeElement as HTMLElement | null
        // The panel is rendered by then. Closed again meanwhile (by an `opened` handler, say), the
        // focus has been given back already — a drawer's panel is still visible while it slides
        // out and would take it.
        await nextTick()
        if (!isOpen()) {
          return
        }
        const target = panel.value?.querySelector<HTMLElement>('[data-autofocus]')
        target?.focus()
        // Checked, not predicted: an element may refuse the focus for many reasons (disabled itself
        // — a confirm button opened while loading — or inside a disabled fieldset, inert, hidden).
        if (document.activeElement !== target) {
          panel.value?.focus()
        }
      } else if (wasOpen) {
        giveBack()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(giveBack)
}
