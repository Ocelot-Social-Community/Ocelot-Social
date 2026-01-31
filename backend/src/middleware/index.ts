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

export interface MiddlewareOrder {
  position: 'prepend' | 'append' | { before: string } | { after: string }
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middleware: IMiddleware | IMiddlewareGenerator<any, any, any>
}

const ocelotMiddlewares: MiddlewareOrder[] = []

export const addMiddleware = (middleware: MiddlewareOrder) => {
  switch (middleware.position) {
    case 'append':
      ocelotMiddlewares.push(middleware)
      break
    case 'prepend':
      ocelotMiddlewares.unshift(middleware)
      break
    default: {
      const anchor =
        'before' in middleware.position ? middleware.position.before : middleware.position.after
      const appendMiddlewareAt = ocelotMiddlewares.findIndex((m) => m.name === anchor)
      if (appendMiddlewareAt === -1) {
        throw new Error(
          `Could not find middleware "${anchor}" to append the middleware "${middleware.name}"`,
        )
      }
      ocelotMiddlewares.splice(
        appendMiddlewareAt + ('before' in middleware.position ? 0 : 1),
        0,
        middleware,
      )
    }
  }
}

addMiddleware({ name: 'sentry', middleware: sentry, position: 'append' })
addMiddleware({ name: 'permissions', middleware: permissions, position: { after: 'sentry' } })
addMiddleware({ name: 'xss', middleware: xss, position: { after: 'permissions' } })
addMiddleware({ name: 'validation', middleware: validation, position: { after: 'xss' } })
addMiddleware({
  name: 'userInteractions',
  middleware: userInteractions,
  position: { after: 'validation' },
})
addMiddleware({ name: 'sluggify', middleware: sluggify, position: { after: 'userInteractions' } })
addMiddleware({ name: 'languages', middleware: languages, position: { after: 'sluggify' } })
addMiddleware({ name: 'excerpt', middleware: excerpt, position: { after: 'languages' } })
addMiddleware({ name: 'login', middleware: login, position: { after: 'excerpt' } })
addMiddleware({ name: 'notifications', middleware: notifications, position: { after: 'login' } })
addMiddleware({ name: 'hashtags', middleware: hashtags, position: { after: 'notifications' } })
addMiddleware({ name: 'softDelete', middleware: softDelete, position: { after: 'hashtags' } })
addMiddleware({
  name: 'includedFields',
  middleware: includedFields,
  position: { after: 'softDelete' },
})
addMiddleware({ name: 'orderBy', middleware: orderBy, position: { after: 'includedFields' } })
addMiddleware({
  name: 'chatMiddleware',
  middleware: chatMiddleware,
  position: { after: 'orderBy' },
})
addMiddleware({ name: 'categories', middleware: categories, position: { after: 'chatMiddleware' } })

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
