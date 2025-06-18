/* eslint-disable @typescript-eslint/no-unsafe-return */

import databaseContext from '@context/database'
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
    authenticatedUser: DecodedUser | null | undefined
    config: typeof CONFIG
  }) =>
  async (req: { headers: { authorization?: string } }) => {
    const {
      authenticatedUser = undefined,
      database = serverDatabase,
      pubsub = serverPubsub,
      config = CONFIG,
    } = opts ?? {}
    const { driver } = database
    const user =
      authenticatedUser === null
        ? null
        : (authenticatedUser ?? (await decode({ driver, config })(req.headers.authorization)))
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
