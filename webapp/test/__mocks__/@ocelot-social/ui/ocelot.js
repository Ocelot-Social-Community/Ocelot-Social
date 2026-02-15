/**
 * Jest mock for @ocelot-social/ui/ocelot
 *
 * Same vue-demi patch mechanism as ui.js, but loads dist/ocelot.cjs.
 */
const path = require('path')
const Module = require('module')

// Load vue-demi from webapp's node_modules
// __dirname is test/__mocks__/@ocelot-social/ui, so go up 4 levels to webapp
const vueDemiPath = path.resolve(__dirname, '../../../../node_modules/vue-demi/lib/index.cjs')
const vueDemi = require(vueDemiPath)

// Verify vue-demi is correctly configured for Vue 2
if (!vueDemi.isVue2) {
  throw new Error('vue-demi is not configured for Vue 2! isVue2=' + vueDemi.isVue2)
}

// Patch missing Composition API functions from Vue.default
// This is needed because Jest loads vue.runtime.common.js which exports under default
const Vue = require('vue')
const VueApi = Vue.default || Vue

// List of Composition API functions that vue-demi should export
const compositionApiFns = [
  'defineComponent',
  'computed',
  'ref',
  'reactive',
  'watch',
  'watchEffect',
  'onMounted',
  'onUnmounted',
  'onBeforeMount',
  'onBeforeUnmount',
  'provide',
  'inject',
  'toRef',
  'toRefs',
  'unref',
  'isRef',
  'shallowRef',
  'triggerRef',
  'customRef',
  'shallowReactive',
  'shallowReadonly',
  'readonly',
  'toRaw',
  'markRaw',
  'effectScope',
  'getCurrentScope',
  'onScopeDispose',
  'getCurrentInstance',
  'h',
  'nextTick',
]

// Patch any missing functions
for (const fn of compositionApiFns) {
  if (!vueDemi[fn] && VueApi[fn]) {
    vueDemi[fn] = VueApi[fn]
  }
}

// Patch Module._load to return the correct vue-demi when the UI library loads it
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'vue-demi') {
    return vueDemi
  }
  return originalLoad.apply(this, arguments)
}

// Load the UI library ocelot dist
const ocelotDistPath = path.resolve(
  __dirname,
  '../../../../node_modules/@ocelot-social/ui/dist/ocelot.cjs',
)
const ocelot = require(ocelotDistPath)

// Export everything from the ocelot dist
module.exports = ocelot
