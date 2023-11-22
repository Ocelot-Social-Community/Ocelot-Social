import { Page } from '#types/Page'
import { PageProps } from '#types/PageProps'

export type {
  PageContextServer,
  /*
    // When using Client Routing https://vike.dev/clientRouting
    PageContextClient,
    PageContext,
    / */
  // When using Server Routing
  PageContextClientWithServerRouting as PageContextClient,
  PageContextWithServerRouting as PageContext,
  //* /
} from 'vike/types'

// https://vike.dev/pageContext#typescript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vike {
    interface PageContext {
      Page: Page
      pageProps?: PageProps
      urlPathname: string
      exports: {
        documentProps?: {
          title?: string
          description?: string
        }
      }
    }
  }
}
