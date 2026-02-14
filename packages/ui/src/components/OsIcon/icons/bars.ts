import { h } from 'vue-demi'

import type { VNode } from 'vue-demi'

export const IconBars = (): VNode =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 32 32', fill: 'currentColor' }, [
    h('path', {
      d: 'M4 7h24v2h-24v-2zM4 15h24v2h-24v-2zM4 23h24v2h-24v-2z',
    }),
  ])
