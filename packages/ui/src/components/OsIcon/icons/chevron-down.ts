import { h } from 'vue-demi'

import type { VNode } from 'vue-demi'

export const IconChevronDown = (): VNode =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 32 32', fill: 'currentColor' }, [
    h('path', {
      d: 'M4.219 10.781l11.781 11.781 11.781-11.781 1.438 1.438-12.5 12.5-0.719 0.688-0.719-0.688-12.5-12.5z',
    }),
  ])
