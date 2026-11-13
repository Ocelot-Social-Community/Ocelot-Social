import { createTooltip } from './tooltip'

import type { Tooltip } from './tooltip'
import type { TooltipValue } from './types'

const tooltips = new WeakMap<HTMLElement, Tooltip>()

interface Binding {
  value: TooltipValue
}

function attach(el: HTMLElement, binding: Binding): void {
  tooltips.set(el, createTooltip(el, binding.value))
}

function update(el: HTMLElement, binding: Binding): void {
  tooltips.get(el)?.update(binding.value)
}

function detach(el: HTMLElement): void {
  tooltips.get(el)?.destroy()
  tooltips.delete(el)
}

/**
 * `v-os-tooltip`: a tooltip on any element.
 *
 * ```html
 * <button v-os-tooltip="'Delete'">…</button>
 * <button v-os-tooltip="{ content: label, placement: 'bottom-start' }">…</button>
 * ```
 *
 * The value is the text alone or `TooltipOptions`. The hooks of both Vue versions are listed
 * side by side: each version calls its own and ignores the others.
 */
export const vOsTooltip = {
  // Vue 3
  mounted: attach,
  updated: update,
  unmounted: detach,
  // Vue 2
  inserted: attach,
  componentUpdated: update,
  unbind: detach,
}
