import type { PageContextBuiltInServer } from 'vike/types'

export { onBeforeRender }

async function onBeforeRender(pageContext: PageContextBuiltInServer) {
  const { page } = pageContext.routeParams
  const pageProps = { page }
  return {
    pageContext: {
      pageProps,
    },
  }
}
