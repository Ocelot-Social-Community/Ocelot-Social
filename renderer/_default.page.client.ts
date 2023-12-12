import { createApp } from './app'

import type { PageContext, VikePageContext } from '#types/PageContext'

let instance: ReturnType<typeof createApp>
/* async */ function render(pageContext: VikePageContext & PageContext) {
  if (!instance) {
    instance = createApp(pageContext)
    instance.app.mount('#app')
  } else {
    instance.app.changePage(pageContext)
  }
}

function onHydrationEnd() {
  // console.log('Hydration finished; page is now interactive.')
}
function onPageTransitionStart() {
  // console.log('Page transition start')
  // document.body.classList.add('page-transition')
}
function onPageTransitionEnd() {
  // console.log('Page transition end')
  // document.body.classList.remove('page-transition')
}

export const clientRouting = true
export const prefetchStaticAssets = 'viewport'
export { render }
export { onHydrationEnd }
export { onPageTransitionStart }
export { onPageTransitionEnd }
