/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable security/detect-object-injection */
import { applyMiddleware } from 'graphql-middleware'

import CONFIG from '@config/index'

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

export default (schema) => {
  const middlewares = {
    sentry,
    permissions,
    xss,
    validation,
    sluggify,
    excerpt,
    login,
    notifications,
    hashtags,
    softDelete,
    includedFields,
    orderBy,
    languages,
    userInteractions,
    chatMiddleware,
  }

  let order = [
    'sentry',
    'permissions',
    'xss',
    // 'activityPub', disabled temporarily
    'validation',
    'userInteractions',
    'sluggify',
    'languages',
    'excerpt',
    'login',
    'notifications',
    'hashtags',
    'softDelete',
    'includedFields',
    'orderBy',
    'chatMiddleware',
  ]

  // add permisions middleware at the first position (unless we're seeding)
  if (CONFIG.DISABLED_MIDDLEWARES) {
    const disabledMiddlewares = CONFIG.DISABLED_MIDDLEWARES.split(',')
    order = order.filter((key) => {
      if (disabledMiddlewares.includes(key)) {
        /* eslint-disable-next-line no-console */
        console.log(`Warning: Disabled "${disabledMiddlewares}" middleware.`)
      }
      return !disabledMiddlewares.includes(key)
    })
  }

  const appliedMiddlewares = order.map((key) => middlewares[key])
  return applyMiddleware(schema, ...appliedMiddlewares)
}
