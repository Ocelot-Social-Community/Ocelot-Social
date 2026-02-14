import { h } from 'vue-demi'

import type { VNode } from 'vue-demi'

export const IconChevronUp = (): VNode =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 32 32', fill: 'currentColor' }, [
    h('path', {
      d: 'M16 6.594l0.719 0.688 12.5 12.5-1.438 1.438-11.781-11.781-11.781 11.781-1.438-1.438 12.5-12.5z',
    }),
  ])
