import { createTestClient } from 'apollo-server-testing'

import { TEST_CONFIG } from '@config/test-config'
import databaseContext from '@context/database'
import type CONFIG from '@src/config'
import type { Context } from '@src/server'
import createServer, { getContext } from '@src/server'

interface CreateTestServerOptions {
  contextUser: Context['user']
  config?: Partial<typeof CONFIG>
}
export const apolloTestSetup = ({ contextUser, config = {} }: CreateTestServerOptions) => {
  const database = databaseContext()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const context = getContext({ user: contextUser, database, config: { ...TEST_CONFIG, ...config } })

  const server = createServer({ context }).server
  const { mutate, query } = createTestClient(server)
  return {
    server,
    query,
    // TODO: fix this (easy, just some effort)
    mutate: mutate as any, // eslint-disable-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-explicit-any
    database,
  }
}

export type ApolloTestSetup = ReturnType<typeof apolloTestSetup>
