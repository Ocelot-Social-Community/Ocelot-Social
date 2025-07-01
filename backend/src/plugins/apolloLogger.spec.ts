/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'

import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import { loginMutation } from '@src/graphql/queries/loginMutation'
import ocelotLogger from '@src/logger'
import { loggerPlugin } from '@src/plugins/apolloLogger'
import createServer, { getContext } from '@src/server'

const database = databaseContext()

let server: ApolloServer

let mutate, authenticatedUser

beforeAll(async () => {
  await cleanDatabase()

  // eslint-disable-next-line @typescript-eslint/require-await
  const contextUser = async (_req) => authenticatedUser
  const context = getContext({ user: contextUser, database })

  server = createServer({ context, plugins: [loggerPlugin] }).server

  const createTestClientResult = createTestClient(server)
  mutate = createTestClientResult.mutate
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

const loggerSpy = jest.spyOn(ocelotLogger, 'debug')
const consoleSpy = jest.spyOn(console, 'log')

afterEach(async () => {
  await cleanDatabase()
})

describe('apollo logger', () => {
  beforeEach(async () => {
    await Factory.build(
      'user',
      {
        id: 'user',
        name: 'user',
        slug: 'user',
      },
      {
        email: 'test@example.org',
        password: '1234',
      },
    )
  })

  describe('login mutation', () => {
    it('logs the request and response, masking password and token', async () => {
      await mutate({
        mutation: loginMutation,
        variables: {
          email: 'test@example.org',
          password: '1234',
        },
      })

      expect(loggerSpy).toBeCalledTimes(2)
      expect(loggerSpy).toBeCalledWith(
        'Apollo Request',
        expect.any(String),
        '"mutation ($email: String!, $password: String!) {\\n  login(email: $email, password: $password)\\n}\\n"',
        JSON.stringify({
          email: 'test@example.org',
          password: '***',
        }),
      )

      expect(loggerSpy).toBeCalledWith('Apollo Response', expect.any(String), '{"login":"token"}')

      expect(consoleSpy).toBeCalledTimes(2)
    })
  })
})
