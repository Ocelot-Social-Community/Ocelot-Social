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

export default render
