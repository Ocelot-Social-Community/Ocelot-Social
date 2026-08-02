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
    // No `tokenName` here: the module overwrites whatever a client config returns with the name baked
    // from nuxt.config's `apollo.tokenName` (its templates/plugin.js assigns clientConfig.tokenName
    // after calling this factory), so a value set here is silently dead. See nuxt.config.js.
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
