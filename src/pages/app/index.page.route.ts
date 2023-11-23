import { resolveRoute } from 'vike/routing'

import { PageContext } from '#types/PageContext'

export default (pageContext: PageContext) => {
  {
    const result = resolveRoute('/app', pageContext.urlPathname)
    if (result.match) {
      return result
    }
  }

  const result = resolveRoute('/app/@page', pageContext.urlPathname)
  if (!['inc', 'reset'].includes(result.routeParams.page)) {
    return false
  }
  return result
}
