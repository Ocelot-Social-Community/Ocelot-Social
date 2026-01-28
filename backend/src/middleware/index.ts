/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { applyMiddleware, IMiddleware, IMiddlewareGenerator } from 'graphql-middleware'

import CONFIG from '@config/index'

import brandingMiddlewares from './branding/brandingMiddlewares'
import categories from './categories'
import chatMiddleware from './chatMiddleware'
import excerpt from './excerptMiddleware'
import hashtags from './hashtags/hashtagsMiddleware'
import includedFields from './includedFieldsMiddleware'
import languages from './languages/languages'
import login from './login/loginMiddleware'
import notifications from './notifications/notificationsMiddleware'
import orderBy from './orderByMiddleware'
import permissions from './permissionsMiddleware'
import sentry from './sentryMiddleware'
import sluggify from './sluggifyMiddleware'
import softDelete from './softDelete/softDeleteMiddleware'
import userInteractions from './userInteractions'
import validation from './validation/validationMiddleware'
import xss from './xssMiddleware'

export interface OrderPosition {
  /*
    - null = push ontop
    - undefined = append
    - string = append before/after middleware with name
  */
  at?: string | null
  /*
    append before or after. Undefined behaves like after.
  */
  mode?: 'before' | 'after'
}

export interface MiddlewareOrder {
  position: OrderPosition
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middleware: IMiddleware | IMiddlewareGenerator<any, any, any>
}

const ocelotMiddlewares: MiddlewareOrder[] = []

export const addMiddleware = (middleware: MiddlewareOrder) => {
  switch (middleware.position.at) {
    case undefined:
      ocelotMiddlewares.push(middleware)
      break
    case null:
      ocelotMiddlewares.unshift(middleware)
      break
    default: {
      const appendMiddlewareAt = ocelotMiddlewares.findIndex(
        (m) => m.name === middleware.position.at,
      )
      if (appendMiddlewareAt === -1) {
        throw new Error(
          `Could not find middleware "${middleware.position.at}" to append the middleware "${middleware.name}"`,
        )
      }
      ocelotMiddlewares.splice(
        appendMiddlewareAt + (middleware.position.mode === 'before' ? 0 : 1),
        0,
        middleware,
      )
    }
  }
}

addMiddleware({ name: 'sentry', middleware: sentry, position: { at: null } })
addMiddleware({ name: 'permissions', middleware: permissions, position: { at: 'sentry' } })
addMiddleware({ name: 'xss', middleware: xss, position: { at: 'permissions' } })
addMiddleware({ name: 'validation', middleware: validation, position: { at: 'xss' } })
addMiddleware({
  name: 'userInteractions',
  middleware: userInteractions,
  position: { at: 'validation' },
})
addMiddleware({ name: 'sluggify', middleware: sluggify, position: { at: 'userInteractions' } })
addMiddleware({ name: 'languages', middleware: languages, position: { at: 'sluggify' } })
addMiddleware({ name: 'excerpt', middleware: excerpt, position: { at: 'languages' } })
addMiddleware({ name: 'login', middleware: login, position: { at: 'excerpt' } })
addMiddleware({ name: 'notifications', middleware: notifications, position: { at: 'login' } })
addMiddleware({ name: 'hashtags', middleware: hashtags, position: { at: 'notifications' } })
addMiddleware({ name: 'softDelete', middleware: softDelete, position: { at: 'hashtags' } })
addMiddleware({
  name: 'includedFields',
  middleware: includedFields,
  position: { at: 'softDelete' },
})
addMiddleware({ name: 'orderBy', middleware: orderBy, position: { at: 'includedFields' } })
addMiddleware({ name: 'chatMiddleware', middleware: chatMiddleware, position: { at: 'orderBy' } })
addMiddleware({ name: 'categories', middleware: categories, position: { at: 'chatMiddleware' } })

export default (schema) => {
  // execute branding middleware function
  brandingMiddlewares()

  const filteredMiddlewares = ocelotMiddlewares.filter(
    (middleware) => !CONFIG.DISABLED_MIDDLEWARES.includes(middleware.name),
  )

  // Warn if we filtered
  if (ocelotMiddlewares.length < filteredMiddlewares.length) {
    // eslint-disable-next-line no-console
    console.log(`Warning: Disabled "${CONFIG.DISABLED_MIDDLEWARES.join(', ')}" middleware.`)
  }

  return applyMiddleware(schema, ...filteredMiddlewares.map((middleware) => middleware.middleware))
}
