/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

import databaseContext from '@context/database'
import type { Fetch } from '@context/fetch'
import { fetch as defaultFetch } from '@context/fetch'
import pubsubContext from '@context/pubsub'
import CONFIG from '@src/config'
import type { DecodedUser } from '@src/jwt/decode'
import { decode } from '@src/jwt/decode'

import type { ApolloServerExpressConfig } from 'apollo-server-express'

const serverDatabase = databaseContext()
const serverPubsub = pubsubContext()

export const getContext =
  (opts?: {
    database?: ReturnType<typeof databaseContext>
    pubsub?: ReturnType<typeof pubsubContext>
    givenUser: DecodedUser | null | undefined
    config: typeof CONFIG
    fetch: Fetch
  }) =>
  async (req) => {
    const {
      givenUser = undefined,
      database = serverDatabase,
      pubsub = serverPubsub,
      config = CONFIG,
      fetch = defaultFetch,
    } = opts ?? {}
    const { driver } = database
    const user = givenUser === null ? null : (givenUser ?? (await decode({ driver, config })(req)))
    const result = {
      database,
      driver,
      neode: database.neode,
      pubsub,
      user,
      req,
      cypherParams: {
        currentUserId: user ? user.id : null,
      },
      config,
      fetch,
    }
    return result
  }

export const context: ApolloServerExpressConfig['context'] = async (options) => {
  const { connection, req } = options
  if (connection) {
    return connection.context
  } else {
    return getContext()(req)
  }
}
export type Context = Awaited<ReturnType<ReturnType<typeof getContext>>>
