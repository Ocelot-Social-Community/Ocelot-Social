import { createSSRApp, defineComponent, h } from 'vue'
import PageShell from './PageShell.vue'
import { setPageContext } from './usePageContext'
import type { Component, PageContext, PageProps } from './types'
import vuetify from './vuetify'

export { createApp }

function createApp(Page: Component, pageProps: PageProps | undefined, pageContext: PageContext) {
  const PageWithLayout = defineComponent({
    render() {
      return h(
        PageShell,
        {},
        {
          default() {
            return h(Page, pageProps || {})
          }
        }
      )
    }
  })

  const app = createSSRApp(PageWithLayout)
  console.log('abc')
  app.use(vuetify)

  // Make pageContext available from any Vue component
  setPageContext(app, pageContext)

  return app
}
