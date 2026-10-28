import { h, isVue2 } from 'vue-demi'

import OsButton from '#src/components/OsButton/OsButton.vue'
import { IconClose } from '#src/components/OsIcon'

import type { VNode } from 'vue-demi'

interface CloseButtonOptions {
  /** CSS classes for placing the button in its dialog */
  class: string
  /** Accessible label — the button shows only an icon */
  label: string
  testId: string
  onClick: () => void
  /** Vue 2's $createElement, which the icon render function needs there */
  createElement: unknown
}

/**
 * The close button of a dialog (OsModal, OsDrawer): a small ghost OsButton with the close
 * icon, so its hover, focus ring and size come from the button rather than a copy of them.
 */
export function renderCloseButton(options: CloseButtonOptions): VNode {
  const { label, testId, onClick, createElement } = options
  /* v8 ignore start -- Vue 2 branch: props, attrs and listeners are separate, slots by name */
  if (isVue2) {
    return h(
      OsButton,
      {
        class: options.class,
        props: { appearance: 'ghost', circle: true, size: 'sm' },
        attrs: { 'aria-label': label, 'data-testid': testId },
        on: { click: onClick },
      },
      [h('template', { slot: 'icon' }, [IconClose(createElement, true)])],
    )
  }
  /* v8 ignore stop */
  return h(
    OsButton,
    {
      class: options.class,
      appearance: 'ghost',
      circle: true,
      size: 'sm',
      'aria-label': label,
      'data-testid': testId,
      onClick,
    },
    { icon: () => [IconClose(createElement, false)] },
  )
}
