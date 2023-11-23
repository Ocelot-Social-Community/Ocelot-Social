import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createSSRApp, defineComponent, h } from 'vue'

import PageShell from '#components/PageShell.vue'
import { setPageContext } from '#context/usePageContext'
import i18n from '#plugins/i18n'
import pinia from '#plugins/pinia'
import CreateVuetify from '#plugins/vuetify'
import { Page } from '#types/Page'
import { PageProps } from '#types/PageProps'

import type { PageContext } from '#types/PageContext'

function createApp(
  Page: Page,
  pageProps: PageProps | undefined,
  pageContext: PageContext,
  isClient = true,
) {
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

  if (isClient) {
    pinia.use(piniaPluginPersistedstate)
  }

  const app = createSSRApp(PageWithLayout)
  app.use(pinia)
  app.use(i18n)
  app.use(CreateVuetify(i18n))

  // Make pageContext available from any Vue component
  setPageContext(app, pageContext)

  return app
}

export { createApp }
