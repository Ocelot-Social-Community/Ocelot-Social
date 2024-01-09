// `usePageContext` allows us to access `pageContext` in any Vue component.
// See https://vike.dev/pageContext-anywhere

import { inject } from 'vue'

import { PageContext, VikePageContext } from '#types/PageContext'

import type { App, InjectionKey } from 'vue'

const key: InjectionKey<VikePageContext & PageContext> = Symbol('pageContext')

function usePageContext() {
  const pageContext = inject(key)
  if (!pageContext) throw new Error('setPageContext() not called in parent')
  return pageContext
}

function setPageContext(app: App, pageContext: VikePageContext & PageContext) {
  app.provide(key, pageContext)
}

export { usePageContext }
export { setPageContext }
