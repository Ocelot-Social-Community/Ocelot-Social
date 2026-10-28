import { onBeforeUnmount, onMounted, watch } from 'vue-demi'

/**
 * Behaviour shared by the modal surfaces (OsModal, OsDrawer): what keeps the user inside an
 * open dialog and the page behind it still. Composables run inside a component's setup().
 */

/** Elements the Tab key can reach. */
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab and Shift+Tab inside `container`: from its last focusable element to its first,
 * and back. Call it from the container's keydown handler.
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
  if (event.shiftKey && document.activeElement === first) {
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
