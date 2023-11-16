import { createSSRApp, defineComponent, h } from 'vue'
import PageShell from './PageShell.vue'
import { setPageContext } from './usePageContext'
import type { Component, PageContext, PageProps } from './types'
import i18n from './i18n'
import CreateVuetify from './vuetify'
import { createPinia } from 'pinia'

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
          },
        },
      )
    },
  })

  const pinia = createPinia()
  const app = createSSRApp(PageWithLayout)
  app.use(pinia)
  app.use(i18n)
  app.use(CreateVuetify(i18n))

  // Make pageContext available from any Vue component
  setPageContext(app, pageContext)

  return app
}
