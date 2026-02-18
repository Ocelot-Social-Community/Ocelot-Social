import { h, isVue2 } from 'vue-demi'

import type { VNode } from 'vue-demi'

/**
 * Shared spinner SVG constants and factory.
 * Used by both OsSpinner (standalone) and OsButton (inline overlay).
 */

export const SPINNER_SVG_ATTRS = {
  viewBox: '0 0 50 50',
  xmlns: 'http://www.w3.org/2000/svg',
}

export const SPINNER_CIRCLE_ATTRS = {
  cx: '25',
  cy: '25',
  r: '20',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '4',
  'stroke-linecap': 'round',
}

export const SPINNER_CIRCLE_STYLE =
  'transform-origin:25px 25px;animation:os-spinner-rotate 16s linear infinite,os-spinner-dash 1.5s ease-in-out infinite'

export function vueAttrs(attrs: Record<string, string>, style: string): Record<string, unknown> {
  /* v8 ignore start -- Vue 2 branch tested in webapp Jest tests */
  return isVue2 ? { attrs, style } : { ...attrs, style }
  /* v8 ignore stop */
}

/**
 * Creates a spinner SVG VNode (circle with dash animation).
 * Returns just the `<svg>` element — caller wraps it as needed.
 */
export function createSpinnerSvg(): VNode {
  const circle = h('circle', vueAttrs(SPINNER_CIRCLE_ATTRS, SPINNER_CIRCLE_STYLE))
  return h('svg', vueAttrs(SPINNER_SVG_ATTRS, 'width:100%;height:100%;overflow:hidden'), [circle])
}
