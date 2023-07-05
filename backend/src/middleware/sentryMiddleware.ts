import { sentry } from 'graphql-middleware-sentry'
import CONFIG from '../config'

let sentryMiddleware: any = (resolve, root, args, context, resolveInfo) =>
  resolve(root, args, context, resolveInfo)

if (CONFIG.SENTRY_DSN_BACKEND) {
  sentryMiddleware = sentry({
    forwardErrors: true,
    config: {
      dsn: CONFIG.SENTRY_DSN_BACKEND,
      release: CONFIG.COMMIT,
      environment: CONFIG.NODE_ENV,
    },
    withScope: (scope, error, context: any) => {
      scope.setUser({
        id: context.user && context.user.id,
      })
      scope.setExtra('body', context.req.body)
      scope.setExtra('origin', context.req.headers.origin)
      scope.setExtra('user-agent', context.req.headers['user-agent'])
    },
  })
} else {
  // eslint-disable-next-line no-console
  if (!CONFIG.TEST) console.log('Warning: Sentry middleware inactive.')
}

export default sentryMiddleware
