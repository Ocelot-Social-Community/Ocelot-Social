import { createApp } from './app'

import type { PageContext, VikePageContext } from '#types/PageContext'

let app: ReturnType<typeof createApp>
async function render(pageContext: VikePageContext & PageContext) {
  if (!app) {
    app = createApp(pageContext)
    app.mount('#app')
  } else {
    app.changePage(pageContext)
  }
}

function onHydrationEnd() {
  // console.log('Hydration finished; page is now interactive.')
}
function onPageTransitionStart() {
  // console.log('Page transition start')
}
function onPageTransitionEnd() {
  // console.log('Page transition end')
}

export const clientRouting = true
export const prefetchStaticAssets = 'viewport'
export { render }
export { onHydrationEnd }
export { onPageTransitionStart }
export { onPageTransitionEnd }
