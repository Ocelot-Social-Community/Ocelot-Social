import { getContext } from '@context/index'
import ocelotLogger from '@src/logger'

import type { Context } from '@context/index'

// How long a subscription trusts the viewer it was opened for. A query reads the viewer once and
// is done; a subscription lives as long as the socket, which can be days. Without a refresh, a
// user who is demoted, loses a network permission, is disabled or deleted, or whose token expires
// would keep receiving whatever their old rights let through until they reconnect. With it, that
// lasts at most this long. One decode per subscription and window, and only when events arrive.
export const SUBSCRIPTION_PRINCIPAL_TTL_MS = 30_000

type Request = Parameters<ReturnType<typeof getContext>>[0]
type BuildContext = (req: Request) => Promise<Context>

/**
 * The context of one subscription. It starts out as an ordinary request context, and before
 * every event that reaches it after the TTL it reads the viewer again: the token is decoded anew
 * (a disabled or deleted user, or an expired token, comes back as anonymous), and the role,
 * effective permissions and per-group memo are rebuilt from it.
 *
 * The fresh values are written into the SAME object, because withFilter and the field resolvers
 * of every event hold on to the object they were handed at subscribe time. The hook is the
 * pubsub's asyncIterator, through which every subscription receives its events, so no resolver
 * has to remember to refresh.
 */
export const getSubscriptionContext = async (
  req: Request,
  {
    buildContext = getContext(),
    ttlMs = SUBSCRIPTION_PRINCIPAL_TTL_MS,
    logger = ocelotLogger,
  }: {
    buildContext?: BuildContext
    ttlMs?: number
    logger?: Pick<typeof ocelotLogger, 'warn'>
  } = {},
): Promise<Context> => {
  const context = await buildContext(req)
  const { pubsub } = context
  let loadedAt = Date.now()
  // Events often arrive in bursts; all of them wait for the one read already under way.
  let refreshing: Promise<void> | null = null

  const refresh = async () => {
    if (Date.now() - loadedAt < ttlMs) {
      return
    }
    refreshing ??= (async () => {
      try {
        const { pubsub: _freshPubsub, ...fresh } = await buildContext(req)
        Object.assign(context, fresh)
        loadedAt = Date.now()
        // eslint-disable-next-line no-catch-all/no-catch-all
      } catch (error: unknown) {
        // The viewer is kept and the read retried with the next event. A failed read means the
        // database is out of reach, and so is every mutation that could have changed the viewer.
        logger.warn('Could not refresh the viewer of a subscription', error)
      } finally {
        refreshing = null
      }
    })()
    await refreshing
  }

  const asyncIterator = (triggers: string | string[]): AsyncIterableIterator<unknown> => {
    const events = pubsub.asyncIterator<unknown>(triggers)
    return {
      next: async () => {
        const event = await events.next()
        if (!event.done) {
          await refresh()
        }
        return event
      },
      return: async () => events.return?.() ?? { done: true, value: undefined },
      throw: async (error: unknown) => {
        if (!events.throw) {
          throw error
        }
        return events.throw(error)
      },
      [Symbol.asyncIterator]() {
        return this
      },
    }
  }

  context.pubsub = new Proxy(pubsub, {
    get: (target, property, receiver) =>
      property === 'asyncIterator'
        ? asyncIterator
        : (Reflect.get(target, property, receiver) as unknown),
  })
  return context
}
