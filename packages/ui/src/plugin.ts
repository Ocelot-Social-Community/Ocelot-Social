// eslint-disable-next-line import-x/no-namespace -- needed for dynamic component registration
import * as components from './components'

import type { App, Component, Plugin } from 'vue-demi'

/**
 * Vue plugin for global component registration
 *
 * Usage:
 * ```ts
 * import { OcelotUI } from '@ocelot-social/ui'
 * app.use(OcelotUI)
 * ```
 */
const OcelotUI: Plugin = {
  install(app: App) {
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component as Component)
    }
  },
}

export default OcelotUI
