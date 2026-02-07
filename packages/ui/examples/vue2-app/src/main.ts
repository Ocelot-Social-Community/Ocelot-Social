import { OcelotUI } from '@ocelot-social/ui'
import Vue from 'vue'

import App from './App.vue'

import type { PluginObject } from 'vue'

// Type assertion needed for CI where types can't be resolved from linked package
Vue.use(OcelotUI as unknown as PluginObject<never>)

new Vue({
  render: (h) => h(App),
}).$mount('#app')
