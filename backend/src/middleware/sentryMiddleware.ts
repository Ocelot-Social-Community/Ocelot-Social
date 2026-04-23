/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { init, withScope, captureException } from '@sentry/node'

import CONFIG from '@config/index'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SentryMiddleware = (resolve: any, root: any, args: any, context: any, resolveInfo: any) => any

export interface SentryMiddlewareOptions {
  dsn?: string
  release?: string
  environment?: string
}

export const createSentryMiddleware = (options: SentryMiddlewareOptions): SentryMiddleware => {
  const passthrough: SentryMiddleware = (resolve, root, args, context, resolveInfo) =>
    resolve(root, args, context, resolveInfo)

  if (!options.dsn) return passthrough

  init({
    dsn: options.dsn,
    release: options.release,
    environment: options.environment,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (resolve, root, args, context: any, resolveInfo) => {
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
}

const sentryMiddleware = createSentryMiddleware({
  dsn: CONFIG.SENTRY_DSN_BACKEND,
  release: CONFIG.COMMIT,
  environment: CONFIG.NODE_ENV,
})

if (!CONFIG.SENTRY_DSN_BACKEND && !CONFIG.TEST) {
  // eslint-disable-next-line no-console
  console.log('Warning: Sentry middleware inactive.')
}

export default sentryMiddleware
