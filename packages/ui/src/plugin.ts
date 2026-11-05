// eslint-disable-next-line import-x/no-namespace -- needed for dynamic component registration
import * as components from './components'

import type { App, Component, Directive, Plugin } from 'vue-demi'

/**
 * Vue plugin for global component registration, and the `v-os-tooltip` directive
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
      // Only register Vue components (starting with 'Os')
      if (name.startsWith('Os')) {
        app.component(name, component as Component)
      }
    }
    app.directive('os-tooltip', components.vOsTooltip as Directive)
  },
}

export default OcelotUI
