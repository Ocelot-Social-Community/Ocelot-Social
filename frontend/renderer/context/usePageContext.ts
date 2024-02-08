// `usePageContext` allows us to access `pageContext` in any Vue component.
// See https://vike.dev/pageContext-anywhere

import { PageContext } from 'vike/types'
import { inject } from 'vue'

import type { App, InjectionKey } from 'vue'

export const vikePageContext: InjectionKey<PageContext> = Symbol('pageContext')

function usePageContext() {
  const pageContext = inject(vikePageContext)
  if (!pageContext) throw new Error('setPageContext() not called in parent')
  return pageContext
}

function setPageContext(app: App, pageContext: PageContext) {
  app.provide(vikePageContext, pageContext)
}

export { usePageContext }
export { setPageContext }
