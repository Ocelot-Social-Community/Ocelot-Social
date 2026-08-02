import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory'
import introspectionQueryResultData from './apollo-config/fragmentTypes.json'

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData,
})

export default ({ req, nuxtState }) => {
  const { env } = req || nuxtState
  const backendUrl = env.GRAPHQL_URI || 'http://localhost:4000'

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
    persisting: false,
    websocketsOnly: false,
    cache: new InMemoryCache({ fragmentMatcher }),
  }
}
