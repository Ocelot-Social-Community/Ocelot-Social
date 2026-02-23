/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { init, withScope, captureException } from '@sentry/node'

import CONFIG from '@config/index'

// eslint-disable-next-line import-x/no-mutable-exports, @typescript-eslint/no-explicit-any
let sentryMiddleware: any = (resolve, root, args, context, resolveInfo) =>
  resolve(root, args, context, resolveInfo)

if (CONFIG.SENTRY_DSN_BACKEND) {
  init({
    dsn: CONFIG.SENTRY_DSN_BACKEND,
    release: CONFIG.COMMIT,
    environment: CONFIG.NODE_ENV,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sentryMiddleware = async (resolve, root, args, context: any, resolveInfo) => {
    try {
      return await resolve(root, args, context, resolveInfo)
    } catch (error) {
      withScope((scope) => {
        scope.setUser({
          id: context.user?.id,
        })
        scope.setExtra('body', context.req?.body)
        scope.setExtra('origin', context.req?.headers?.origin)
        scope.setExtra('user-agent', context.req?.headers?.['user-agent'])
        captureException(error)
      })
      throw error
    }
  }
} else {
  // eslint-disable-next-line no-console
  if (!CONFIG.TEST) console.log('Warning: Sentry middleware inactive.')
}

export default sentryMiddleware
