import { createTooltip } from './tooltip'

import type { Tooltip } from './tooltip'
import type { TooltipOptions } from './types'

/** Tooltips made from the `title` attributes in a container. */
export interface TitleTooltips {
  /** Stops watching and removes every tooltip made. */
  destroy: () => void
}

/**
 * Turns every `title` attribute in `container` into a tooltip, now and later: for markup built by
 * someone else, such as mapbox-gl's map controls, which set (and change) `title` themselves. The
 * attribute is removed, so the browser's own tooltip does not show as well; a new value turns into
 * new content, and an element that leaves the container takes its tooltip with it.
 */
export function tooltipsFromTitles(
  container: HTMLElement,
  options: Omit<TooltipOptions, 'content'> = {},
): TitleTooltips {
  const tooltips = new Map<Element, Tooltip>()

  function adopt(element: Element) {
    const title = element.getAttribute('title')
    if (title === null) {
      return
    }
    element.removeAttribute('title')
    const value = { ...options, content: title }
    const existing = tooltips.get(element)
    if (existing) {
      existing.update(value)
    } else {
      tooltips.set(element, createTooltip(element as HTMLElement, value))
    }
  }

  function adoptAll(root: Element) {
    adopt(root)
    root.querySelectorAll('[title]').forEach(adopt)
  }

  function release(root: Node) {
    for (const [element, tooltip] of tooltips) {
      if (root === element || root.contains(element)) {
        tooltip.destroy()
        tooltips.delete(element)
      }
    }
  }

  container.querySelectorAll('[title]').forEach(adopt)

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        adopt(record.target as Element)
        continue
      }
      record.removedNodes.forEach((node) => {
        // Moved within the container rather than removed: it keeps its tooltip.
        if (!container.contains(node)) {
          release(node)
        }
      })
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          adoptAll(node)
        }
      })
    }
  })
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title'],
  })

  return {
    destroy() {
      observer.disconnect()
      tooltips.forEach((tooltip) => {
        tooltip.destroy()
      })
      tooltips.clear()
    },
  }
}
