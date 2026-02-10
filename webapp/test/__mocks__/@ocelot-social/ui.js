/**
 * Jest mock for @ocelot-social/ui
 *
 * This mock ensures vue-demi is loaded from webapp's node_modules (Vue 2.7)
 * BEFORE loading the UI library's dist file.
 *
 * Without this, Jest would load the UI library through the symlink, which
 * would use the UI library's vue-demi (configured for Vue 3).
 */
const path = require('path')
const Module = require('module')

// Load vue-demi from webapp's node_modules
// __dirname is test/__mocks__/@ocelot-social, so go up 3 levels to webapp
const vueDemiPath = path.resolve(__dirname, '../../../node_modules/vue-demi/lib/index.cjs')
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

// Load the UI library dist
const uiDistPath = path.resolve(__dirname, '../../../node_modules/@ocelot-social/ui/dist/index.cjs')
const ui = require(uiDistPath)

// Export everything from the UI library
module.exports = ui
