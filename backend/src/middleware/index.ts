/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { applyMiddleware, IMiddleware } from 'graphql-middleware'

import CONFIG from '@config/index'

// eslint-disable-next-line import/no-cycle
import brandingMiddlewares from './branding/brandingMiddlewares'
import chatMiddleware from './chatMiddleware'
import excerpt from './excerptMiddleware'
import hashtags from './hashtags/hashtagsMiddleware'
import includedFields from './includedFieldsMiddleware'
import languages from './languages/languages'
import login from './login/loginMiddleware'
// eslint-disable-next-line import/no-cycle
import notifications from './notifications/notificationsMiddleware'
import orderBy from './orderByMiddleware'
import permissions from './permissionsMiddleware'
import sentry from './sentryMiddleware'
import sluggify from './sluggifyMiddleware'
import softDelete from './softDelete/softDeleteMiddleware'
import userInteractions from './userInteractions'
import validation from './validation/validationMiddleware'
import xss from './xssMiddleware'

export interface MiddlewareOrder {
  order: number
  name: string
  middleware: IMiddleware
}

const ocelotMiddlewares: MiddlewareOrder[] = [
  { order: -200, name: 'sentry', middleware: sentry },
  { order: -190, name: 'permissions', middleware: permissions },
  { order: -180, name: 'xss', middleware: xss },
  { order: -170, name: 'validation', middleware: validation },
  { order: -160, name: 'userInteractions', middleware: userInteractions },
  { order: -150, name: 'sluggify', middleware: sluggify },
  { order: -140, name: 'languages', middleware: languages },
  { order: -130, name: 'excerpt', middleware: excerpt },
  { order: -120, name: 'login', middleware: login },
  { order: -110, name: 'notifications', middleware: notifications },
  { order: -100, name: 'hashtags', middleware: hashtags },
  { order: -90, name: 'softDelete', middleware: softDelete },
  { order: -80, name: 'includedFields', middleware: includedFields },
  { order: -70, name: 'orderBy', middleware: orderBy },
  { order: -60, name: 'chatMiddleware', middleware: chatMiddleware },
]

export default (schema) => {
  const middlewares = ocelotMiddlewares
    .concat(brandingMiddlewares())
    .sort((a, b) => a.order - b.order)

  const filteredMiddlewares = middlewares.filter(
    (middleware) => !CONFIG.DISABLED_MIDDLEWARES.includes(middleware.name),
  )

  // Warn if we filtered
  if (middlewares.length < filteredMiddlewares.length) {
    // eslint-disable-next-line no-console
    console.log(`Warning: Disabled "${CONFIG.DISABLED_MIDDLEWARES.join(', ')}" middleware.`)
  }

  return applyMiddleware(schema, ...filteredMiddlewares.map((middleware) => middleware.middleware))
}
