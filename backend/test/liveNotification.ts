import { execute, parse } from 'graphql'

import schema from '@graphql/schema'

import type { ExecutionResult } from 'graphql'

// What a subscribed client receives for a notification the middleware published: the payload run
// through the `notificationAdded` selection, the way the subscription delivers it. `from` is the
// union NotificationSource, resolved by its `__typename` — a payload without one is an error here,
// as it is on the socket, where the client simply never hears of the notification.
const NOTIFICATION_ADDED = parse(`
  subscription {
    notificationAdded {
      reason
      from {
        __typename
        ... on Post { id }
        ... on Comment { id }
        ... on Group { id }
      }
    }
  }
`)

export const liveNotification = async (notification: unknown): Promise<ExecutionResult> =>
  execute({
    schema,
    document: NOTIFICATION_ADDED,
    rootValue: { notificationAdded: notification },
  })
