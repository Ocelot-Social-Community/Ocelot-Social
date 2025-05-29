import { Page } from '#types/Page'
import { PageProps } from '#types/PageProps'

declare global {
  namespace Vike {
    interface PageContext {
      urlPathname: string
      config: {
        title: string | ((pageContext: PageContext) => string) | undefined
        description: string | ((pageContext: PageContext) => string) | undefined
      }
      Page: Page
      pageProps?: PageProps
    }
  }
}
