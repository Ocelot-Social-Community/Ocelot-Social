// Runtime branding injection (webapp). Server: load the brand's compiled config (JSON — the
// serialised result of `defineBranding({...})`) from $OCELOT_BRANDING_PATH, inject it via
// setBranding, and serialise it to the client. Client: read the serialised config and inject it.
// No path / no file → framework defaults (vanilla runs as-is). Lets a pre-built image be branded
// without a rebuild — see docu/branding-architecture-konzept.md (runtime accessor).
//
// NOTE: plugins run after the app bundle evaluates, so component/method reads pick up the brand
// config; module-scope captures in a few constants adapters (links, metadata) resolve at import
// time and would need the config set earlier (or lazy adapters) for full effect.
import { setBranding } from '@ocelot-social/branding'

export default (context) => {
  if (process.server) {
    const brandingPath = process.env.OCELOT_BRANDING_PATH
    if (brandingPath) {
      try {
        // `fs` is required only in the server branch so it is tree-shaken from the client bundle.
        // eslint-disable-next-line global-require, import/no-nodejs-modules
        const { readFileSync } = require('fs')
        const config = JSON.parse(readFileSync(brandingPath, 'utf8'))
        setBranding(config)
        context.beforeNuxtRender(({ nuxtState }) => {
          nuxtState.branding = config
        })
      } catch (error) {
        // no file / unreadable / bad JSON → keep framework defaults
      }
    }
  } else if (window.__NUXT__ && window.__NUXT__.branding) {
    setBranding(window.__NUXT__.branding)
  }
}
