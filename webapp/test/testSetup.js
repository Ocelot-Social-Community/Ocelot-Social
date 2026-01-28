import Vue from 'vue'
import { createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import VTooltip from 'v-tooltip'
import Styleguide from '@@/'
import BaseComponents from '~/plugins/base-components'
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
global.localVue.use(Styleguide)
global.localVue.use(BaseComponents)
global.localVue.use(Filters)
global.localVue.use(Directives)
global.localVue.use(InfiniteLoading)
global.localVue.use(VueObserveVisibility)
