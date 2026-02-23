import databaseContext from '@context/database'
import pubsubContext from '@context/pubsub'
import CONFIG from '@src/config'
import { decode } from '@src/jwt/decode'
import ocelotLogger from '@src/logger'

import type { DecodedUser } from '@src/jwt/decode'

const serverDatabase = databaseContext()
const serverPubsub = pubsubContext()

export const getContext =
  (opts?: {
    database?: ReturnType<typeof databaseContext>
    pubsub?: ReturnType<typeof pubsubContext>
    authenticatedUser: DecodedUser | null | undefined
    logger?: typeof ocelotLogger
    config: typeof CONFIG
  }) =>
  async (req: { headers: { authorization?: string } }) => {
    const {
      database = serverDatabase,
      pubsub = serverPubsub,
      authenticatedUser,
      logger = ocelotLogger,
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
      logger,
      user,
      req,
      cypherParams: {
        currentUserId: user ? user.id : null,
      },
      config,
    }
    return result
  }

export type Context = Awaited<ReturnType<ReturnType<typeof getContext>>>
