import { h } from 'vue-demi'

import type { VNode } from 'vue-demi'

export const IconClose = (): VNode =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 32 32', fill: 'currentColor' }, [
    h('path', {
      d: 'M7.219 5.781l8.781 8.781 8.781-8.781 1.438 1.438-8.781 8.781 8.781 8.781-1.438 1.438-8.781-8.781-8.781 8.781-1.438-1.438 8.781-8.781-8.781-8.781z',
    }),
  ])
