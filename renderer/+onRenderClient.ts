import { PageContext } from 'vike/types'

import { createApp } from './app'
import { getTitle } from './utils'

let instance: ReturnType<typeof createApp>
/* async */ function render(pageContext: PageContext) {
  if (!instance) {
    instance = createApp(pageContext)
    instance.app.mount('#app')
  } else {
    instance.app.changePage(pageContext)
  }

  document.title = getTitle(pageContext)
}

export default render
