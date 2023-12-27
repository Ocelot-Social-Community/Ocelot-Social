// See https://vike.dev/data-fetching
export default {
  clientRouting: true,
  prefetchStaticAssets: 'viewport',
  passToClient: ['pageProps', /* 'urlPathname', */ 'routeParams']
}