import { createApp } from './app'

import type { PageContext, VikePageContext } from '#types/PageContext'

let app: ReturnType<typeof createApp>
async function render(pageContext: VikePageContext & PageContext) {
  if (!app) {
    app = createApp(pageContext)
    app.mount('#app')
  } else {
    // console.log(pageContext)
    app.changePage(pageContext)
  }
}

function onHydrationEnd() {
  // eslint-disable-next-line no-console
  console.log('Hydration finished; page is now interactive.')
}
function onPageTransitionStart() {
  // eslint-disable-next-line no-console
  console.log('Page transition start')
  // document.querySelector('.content')!.classList.add('page-transition')
}
function onPageTransitionEnd() {
  // eslint-disable-next-line no-console
  console.log('Page transition end')
  // document.querySelector('.content')!.classList.remove('page-transition')
}

export const clientRouting = true
export const prefetchStaticAssets = 'viewport'
export { render }
export { onHydrationEnd }
export { onPageTransitionStart }
export { onPageTransitionEnd }
