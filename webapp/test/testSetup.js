// Global mock for matchMedia (used by touchDevice mixin)
window.matchMedia =
  window.matchMedia ||
  jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))

import Vue from 'vue'
import { createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import VTooltip from 'v-tooltip'
import Filters from '~/plugins/vue-filters'
import InfiniteLoading from '~/plugins/vue-infinite-loading'
import Directives from '~/plugins/vue-directives'
import VueObserveVisibility from '~/plugins/vue-observe-visibility'
require('intersection-observer')

// Fail tests on Vue warnings
Vue.config.warnHandler = (msg, vm, trace) => {
  throw new Error(`[Vue warn]: ${msg}${trace}`)
}

// Fail tests on console.error (catches Vuex errors like "unknown action type")
// eslint-disable-next-line no-console
const originalConsoleError = console.error
// eslint-disable-next-line no-console
console.error = (...args) => {
  originalConsoleError.apply(console, args)
  throw new Error(`console.error was called: ${args.join(' ')}`)
}

global.localVue = createLocalVue()

global.localVue.use(Vuex)
global.localVue.use(VTooltip)
global.localVue.use(Filters)
global.localVue.use(Directives)
global.localVue.use(InfiniteLoading)
global.localVue.use(VueObserveVisibility)

// Register router-link stub globally (OsMenu/OsMenuItem render it via h())
Vue.component('router-link', {
  name: 'RouterLink',
  props: { to: { type: [String, Object], default: '' }, exact: { type: Boolean, default: false } },
  render(h) {
    // Resolve href: string path or { name, params } object
    let href = ''
    const to = this.to
    if (typeof to === 'string') {
      href = to
    } else if (to) {
      href = to.path || `/${to.name || ''}`
    }
    return h('a', { attrs: { href, to: href }, class: this.$attrs.class }, this.$slots.default)
  },
})
