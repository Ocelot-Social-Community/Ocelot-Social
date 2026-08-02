import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory'
import introspectionQueryResultData from './apollo-config/fragmentTypes.json'
import { createAuthCookie } from '~/utils/authCookie'

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData,
})

export default (context) => {
  const { req, nuxtState } = context
  const { env } = req || nuxtState
  const backendUrl = env.GRAPHQL_URI || 'http://localhost:4000'
  // Built once per context (per SSR request / once in the browser); every read re-parses the cookie
  // header, so a token written after this point is picked up.
  const authCookie = createAuthCookie(context)

  return {
    wsEndpoint: env.WEBSOCKETS_URI,
    httpEndpoint: process.server ? backendUrl : '/api',
    httpLinkOptions: {
      credentials: 'same-origin',
    },
    credentials: true,
    // No `tokenName` here — it belongs in exactly ONE place, `apollo.tokenName` in nuxt.config.js,
    // which is the module's GLOBAL default. In @nuxtjs/apollo ^4.0.0-rc19 (not the v5 `clients` API)
    // a client-level value takes precedence over that global — its generated plugin renders
    // `clientTokenName = '<clientConfigs[key].tokenName>' || AUTH_TOKEN_NAME` — so setting one here
    // could only ever make the two diverge when the central value is changed later. It would not even
    // take effect: for a client config passed as a FILE PATH (ours) that option is undefined, and the
    // plugin assigns `clientConfig.tokenName` AFTER calling this factory, dropping what we returned.
    //
    // Defining `getAuth` is what actually takes the auth header off that baked name: the module only
    // falls back to its own cookie read when a client config provides none. Used for HTTP requests
    // AND the websocket's connectionParams, so subscriptions authenticate through the same cookie.
    getAuth: () => {
      const token = authCookie.get()
      return token ? `Bearer ${token}` : ''
    },
    persisting: false,
    websocketsOnly: false,
    cache: new InMemoryCache({ fragmentMatcher }),
  }
}
