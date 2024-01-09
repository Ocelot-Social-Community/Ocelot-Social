// `usePageContext` allows us to access `pageContext` in any Vue component.
// See https://vike.dev/pageContext-anywhere

import { inject } from 'vue'

import { PageContext, VikePageContext } from '#types/PageContext'

import type { App, InjectionKey } from 'vue'

export const vikePageContext: InjectionKey<VikePageContext & PageContext> = Symbol('pageContext')

function usePageContext() {
  const pageContext = inject(vikePageContext)
  if (!pageContext) throw new Error('setPageContext() not called in parent')
  return pageContext
}

function setPageContext(app: App, pageContext: VikePageContext & PageContext) {
  app.provide(vikePageContext, pageContext)
}

export { usePageContext }
export { setPageContext }
