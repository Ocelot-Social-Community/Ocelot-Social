/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { ApolloServer } from 'apollo-server-express'

import Factory, { cleanDatabase } from '@db/factories'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import { loginMutation } from '@src/graphql/queries/loginMutation'
import ocelotLogger from '@src/logger'
import { loggerPlugin } from '@src/plugins/apolloLogger'

let server: ApolloServer

const authenticatedUser: Context['user'] = null
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
const context = () => ({ authenticatedUser })

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context, plugins: [loggerPlugin] })
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
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
