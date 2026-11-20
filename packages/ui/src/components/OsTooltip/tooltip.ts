import { arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'

import type { TooltipOptions, TooltipValue } from './types'

/** The delays the webapp's tooltips have always had. */
export const TOOLTIP_DELAY = { show: 750, hide: 50 } as const
const DEFAULT_OFFSET = 2
/** Half the arrow's base; keep in step with `--os-tooltip-arrow-size` in the styles. */
const ARROW_SIZE = 5
/** The least room kept between the tooltip and the screen's edge. */
const EDGE_PADDING = 5

let lastId = 0

/** A tooltip attached to an element. */
export interface Tooltip {
  /** Takes new content or options; an empty content removes the tooltip until it has text again. */
  update: (value: TooltipValue) => void
  /** Removes the tooltip and everything it put on the element. */
  destroy: () => void
}

/** The options behind a `v-os-tooltip` value: a string is the content alone. */
export function normalizeTooltipValue(value: TooltipValue): TooltipOptions {
  if (value === null || value === undefined) {
    return {}
  }
  return typeof value === 'string' ? { content: value } : value
}

function hasContent(options: TooltipOptions): boolean {
  return typeof options.content === 'string' && options.content.trim() !== ''
}

function delays(options: TooltipOptions): { show: number; hide: number } {
  const { delay } = options
  if (typeof delay === 'number') {
    return { show: delay, hide: delay }
  }
  return { show: delay?.show ?? TOOLTIP_DELAY.show, hide: delay?.hide ?? TOOLTIP_DELAY.hide }
}

function classNames(options: TooltipOptions): string {
  const extra = Array.isArray(options.classes) ? options.classes : [options.classes]
  return [
    'os-tooltip',
    options.multiline && 'os-tooltip--multiline',
    options.narrow && 'os-tooltip--narrow',
    ...extra,
  ]
    .filter(Boolean)
    .join(' ')
}

/** Whether focus came from the keyboard, not from a click (which focuses a button, too). */
function isFocusVisible(element: HTMLElement): boolean {
  return element.matches(':focus-visible')
}

function addToken(list: string | null, token: string): string {
  return [...(list ?? '').split(/\s+/).filter(Boolean), token].join(' ')
}

function removeToken(list: string | null, token: string): string {
  return (list ?? '')
    .split(/\s+/)
    .filter((t) => t && t !== token)
    .join(' ')
}

/**
 * Attaches a tooltip to `reference`: shown on hover and on keyboard focus after a delay, hidden
 * on leave, blur, click and Esc. The tooltip lives under `<body>`, so no ancestor's `overflow`
 * clips it, and is positioned by Floating UI. It stays in the document while it has content,
 * hidden, because `aria-describedby` on the element points at it.
 *
 * Framework-free: `v-os-tooltip` and `OsTooltip` are thin layers on top, for Vue 2 and Vue 3.
 */
export function createTooltip(reference: HTMLElement, value: TooltipValue): Tooltip {
  let options = normalizeTooltipValue(value)
  const id = `os-tooltip-${String(++lastId)}`

  let floating: HTMLElement | null = null
  let inner: HTMLElement | null = null
  let arrowElement: HTMLElement | null = null
  let rendered: { content: string; html: boolean } | null = null

  let visible = false
  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let stopAutoUpdate: (() => void) | undefined

  const isManual = () => options.trigger === 'manual'

  function clearTimers() {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
  }

  const px = (pixels: number) => `${String(pixels)}px`

  async function position(placed: HTMLElement, placedArrow: HTMLElement) {
    const { x, y, placement, middlewareData } = await computePosition(reference, placed, {
      strategy: 'fixed',
      placement: options.placement ?? 'top',
      middleware: [
        offset(ARROW_SIZE + (options.offset ?? DEFAULT_OFFSET)),
        flip(),
        shift({ padding: EDGE_PADDING }),
        arrow({ element: placedArrow, padding: ARROW_SIZE }),
      ],
    })
    // Removed while Floating UI measured: nothing left to place.
    if (placed !== floating) {
      return
    }
    placed.style.left = px(x)
    placed.style.top = px(y)
    placed.setAttribute('data-placement', placement)
    const arrowData = middlewareData.arrow
    placedArrow.style.left = arrowData?.x === undefined ? '' : px(arrowData.x)
    placedArrow.style.top = arrowData?.y === undefined ? '' : px(arrowData.y)
  }

  // Esc is listened for only while shown; aborting removes the listener.
  let escape: AbortController | undefined

  function hide() {
    clearTimers()
    if (!visible) {
      return
    }
    visible = false
    floating?.classList.remove('os-tooltip--visible')
    stopAutoUpdate?.()
    stopAutoUpdate = undefined
    escape?.abort()
    escape = undefined
  }

  function show() {
    clearTimers()
    if (!floating || !arrowElement || visible) {
      return
    }
    visible = true
    const placed = floating
    const placedArrow = arrowElement
    placed.classList.add('os-tooltip--visible')
    stopAutoUpdate = autoUpdate(reference, placed, () => {
      void position(placed, placedArrow)
    })
    escape = new AbortController()
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          hide()
        }
      },
      { signal: escape.signal },
    )
  }

  function scheduleShow() {
    clearTimeout(hideTimer)
    if (visible || !floating) {
      return
    }
    clearTimeout(showTimer)
    showTimer = setTimeout(show, delays(options).show)
  }

  function scheduleHide() {
    clearTimeout(showTimer)
    if (!visible) {
      return
    }
    clearTimeout(hideTimer)
    hideTimer = setTimeout(hide, delays(options).hide)
  }

  // --- The element's own events ---
  function onEnter() {
    if (!isManual()) {
      scheduleShow()
    }
  }

  function onLeave() {
    if (!isManual()) {
      scheduleHide()
    }
  }

  function onFocus() {
    if (!isManual() && isFocusVisible(reference)) {
      scheduleShow()
    }
  }

  function onClick() {
    if (!isManual()) {
      hide()
    }
  }

  // --- The tooltip's own: the pointer may move onto it without it going (WCAG 1.4.13) ---
  function onTooltipEnter() {
    clearTimeout(hideTimer)
  }

  function onTooltipLeave() {
    if (!isManual()) {
      scheduleHide()
    }
  }

  function createElement() {
    floating = document.createElement('div')
    floating.id = id
    floating.setAttribute('role', 'tooltip')
    inner = document.createElement('div')
    inner.className = 'os-tooltip-inner'
    arrowElement = document.createElement('div')
    arrowElement.className = 'os-tooltip-arrow'
    floating.append(inner, arrowElement)
    floating.addEventListener('mouseenter', onTooltipEnter)
    floating.addEventListener('mouseleave', onTooltipLeave)
    document.body.append(floating)
    reference.setAttribute(
      'aria-describedby',
      addToken(reference.getAttribute('aria-describedby'), id),
    )
  }

  function removeElement() {
    hide()
    floating?.remove()
    floating = null
    inner = null
    arrowElement = null
    rendered = null
    const describedBy = removeToken(reference.getAttribute('aria-describedby'), id)
    if (describedBy) {
      reference.setAttribute('aria-describedby', describedBy)
    } else {
      reference.removeAttribute('aria-describedby')
    }
  }

  function render() {
    if (!hasContent(options)) {
      removeElement()
      return
    }
    if (!floating) {
      createElement()
    }
    const content = options.content as string
    const html = options.html === true
    if (rendered?.content !== content || rendered.html !== html) {
      if (html) {
        ;(inner as HTMLElement).innerHTML = content
      } else {
        ;(inner as HTMLElement).textContent = content
      }
      rendered = { content, html }
    }
    ;(floating as HTMLElement).className = classNames(options)
    if (visible) {
      ;(floating as HTMLElement).classList.add('os-tooltip--visible')
      void position(floating as HTMLElement, arrowElement as HTMLElement)
    }
    if (isManual()) {
      if (options.show) {
        show()
      } else {
        hide()
      }
    }
  }

  reference.addEventListener('mouseenter', onEnter)
  reference.addEventListener('mouseleave', onLeave)
  reference.addEventListener('focusin', onFocus)
  reference.addEventListener('focusout', onLeave)
  reference.addEventListener('click', onClick)
  render()

  return {
    update(next) {
      const previouslyManual = isManual()
      options = normalizeTooltipValue(next)
      // Leaving manual mode hands the tooltip back to hover and focus, starting hidden.
      if (previouslyManual && !isManual()) {
        hide()
      }
      render()
    },
    destroy() {
      removeElement()
      reference.removeEventListener('mouseenter', onEnter)
      reference.removeEventListener('mouseleave', onLeave)
      reference.removeEventListener('focusin', onFocus)
      reference.removeEventListener('focusout', onLeave)
      reference.removeEventListener('click', onClick)
    },
  }
}
