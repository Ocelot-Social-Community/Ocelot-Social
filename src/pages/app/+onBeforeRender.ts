import type { PageContextBuiltInServer } from 'vike/types'

export default onBeforeRender

/* async */ function onBeforeRender(pageContext: PageContextBuiltInServer) {
  return {
    pageContext: {
      pageProps: pageContext.routeParams,
    },
  }
}
