import { OcelotUI } from '@ocelot-social/ui'
import { createApp } from 'vue'

import App from './App.vue'

import type { Plugin } from 'vue'

const app = createApp(App)
// Type assertion needed for CI where types can't be resolved from linked package
app.use(OcelotUI as unknown as Plugin)
app.mount('#app')
