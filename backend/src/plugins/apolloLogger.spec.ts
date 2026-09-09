/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { beforeAll, afterAll, afterEach, describe, beforeEach, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import login from '@graphql/queries/auth/login.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import ocelotLogger from '@src/logger'
import { loggerPlugin } from '@src/plugins/apolloLogger'

import type { Context } from '@context/index'
import type { ApolloTestSetup } from '@root/test/helpers'

let server: ApolloTestSetup['server']

const authenticatedUser: Context['user'] = null
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
const context = () => ({ authenticatedUser })

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context, plugins: [loggerPlugin] })
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

const loggerSpy = vi.spyOn(ocelotLogger, 'debug')
const consoleSpy = vi.spyOn(console, 'log')

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
        mutation: login,
        variables: {
          email: 'test@example.org',
          password: '1234',
        },
      })

      expect(loggerSpy).toHaveBeenCalledTimes(2)
      expect(loggerSpy).toHaveBeenCalledWith(
        'Apollo Request',
        expect.any(String),
        '"mutation login($email: String!, $password: String!) {\\n  login(email: $email, password: $password)\\n}"',
        JSON.stringify({
          email: 'test@example.org',
          password: '***',
        }),
      )

      expect(loggerSpy).toHaveBeenCalledWith(
        'Apollo Response',
        expect.any(String),
        '{"login":"token"}',
      )

      expect(consoleSpy).toHaveBeenCalledTimes(2)
    })
  })
})

// Driven directly instead of through a server. The paths left uncovered by the login test above
// are the ones a real request cannot conveniently produce on demand — an errored response, a
// response carrying no data at all — and reaching them by provoking genuine server failures
// would test Apollo rather than this plugin. Calling the hooks with a hand-built requestContext
// keeps each case to the one decision it is about, and needs no database.
describe('loggerPlugin hooks', () => {
  const errorSpy = vi.spyOn(ocelotLogger, 'error')

  // Mirrors how Apollo drives the plugin: requestDidStart first, then willSendResponse on the
  // listener it returned. Both hooks read `isIntrospectionQuery` from the SAME closure, which is
  // why the request half cannot be skipped even when a test only cares about the response.
  const runHooks = async (
    request: Record<string, unknown>,
    response: Record<string, unknown> = { body: { singleResult: { data: {} } } },
  ) => {
    const listener = await loggerPlugin.requestDidStart({ request })
    await listener.willSendResponse({ response })
  }

  beforeEach(() => {
    loggerSpy.mockClear()
    errorSpy.mockClear()
  })

  // Introspection runs on every page load of a GraphQL client and its query is enormous. Logging
  // it would bury real traffic in the debug log, so BOTH hooks have to stay silent — the flag is
  // computed once in requestDidStart and read again in willSendResponse.
  it('logs nothing at all for an introspection query', async () => {
    await runHooks({
      operationName: 'IntrospectionQuery',
      query: '{ __schema { types { name } } }',
    })

    expect(loggerSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  // The masking is the reason variables are cloned rather than logged as-is. cloneDeep matters
  // as much as the masking: writing '***' into the live object would corrupt the variables the
  // resolvers are about to receive, turning a logging concern into a failed login.
  it('masks a password without mutating the caller variables', async () => {
    const variables = { email: 'a@b.c', password: 'hunter2' }

    await runHooks({ operationName: 'login', query: 'mutation {}', variables })

    expect(loggerSpy).toHaveBeenCalledWith(
      'Apollo Request',
      expect.any(String),
      '"mutation {}"',
      JSON.stringify({ email: 'a@b.c', password: '***' }),
    )
    expect(variables.password).toBe('hunter2')
  })

  it('logs variables unchanged when none of them is a password', async () => {
    await runHooks({ operationName: 'posts', query: 'query {}', variables: { first: 10 } })

    expect(loggerSpy).toHaveBeenCalledWith(
      'Apollo Request',
      expect.any(String),
      '"query {}"',
      JSON.stringify({ first: 10 }),
    )
  })

  it('omits the variables argument entirely when the request carries none', async () => {
    await runHooks({ operationName: 'posts', query: 'query {}' })

    expect(loggerSpy).toHaveBeenCalledWith('Apollo Request', expect.any(String), '"query {}"')
  })

  // An errored response goes to error level and then RETURNS: without that early return the same
  // response would be logged a second time at debug, so every failure would appear twice at two
  // levels and an alert counting error lines would disagree with the debug log.
  it('logs an errored response at error level and not again at debug', async () => {
    await runHooks(
      { operationName: 'posts', query: 'query {}' },
      { body: { singleResult: { errors: [{ message: 'boom' }] } } },
    )

    expect(errorSpy).toHaveBeenCalledWith(
      'Apollo Response',
      expect.any(String),
      JSON.stringify([{ message: 'boom' }]),
    )
    expect(loggerSpy).not.toHaveBeenCalledWith('Apollo Response', expect.anything())
  })

  // `errors: []` is not a failure. Reading the array's presence instead of its length would send
  // every successful response down the error path.
  it('treats an empty errors array as success', async () => {
    await runHooks(
      { operationName: 'posts', query: 'query {}' },
      { body: { singleResult: { errors: [], data: { posts: [] } } } },
    )

    expect(errorSpy).not.toHaveBeenCalled()
    expect(loggerSpy).toHaveBeenCalledWith(
      'Apollo Response',
      expect.any(String),
      JSON.stringify({ posts: [] }),
    )
  })

  // The login token is a bearer credential: logged verbatim, anyone with log access can
  // impersonate that user until it expires. Cloned again so the response actually sent keeps the
  // real token.
  it('masks the login token without mutating the response', async () => {
    const singleResult = { data: { login: 'real.jwt.token' } }

    await runHooks({ operationName: 'login', query: 'mutation {}' }, { body: { singleResult } })

    expect(loggerSpy).toHaveBeenCalledWith(
      'Apollo Response',
      expect.any(String),
      JSON.stringify({ login: 'token' }),
    )
    expect(singleResult.data.login).toBe('real.jwt.token')
  })

  it('logs non-login response data as it is', async () => {
    await runHooks(
      { operationName: 'posts', query: 'query {}' },
      { body: { singleResult: { data: { posts: [{ id: 'p1' }] } } } },
    )

    expect(loggerSpy).toHaveBeenCalledWith(
      'Apollo Response',
      expect.any(String),
      JSON.stringify({ posts: [{ id: 'p1' }] }),
    )
  })

  // A response with no data at all — a rejected subscription, an empty body — still gets a line,
  // just without a payload argument. Indexing into the missing data is what the optional chaining
  // in the plugin prevents; without it this case would throw inside the logger.
  it('logs a bare response line when there is no data', async () => {
    await runHooks({ operationName: 'posts', query: 'query {}' }, { body: { singleResult: {} } })

    expect(loggerSpy).toHaveBeenCalledWith('Apollo Response', expect.any(String))
  })

  it('survives a response body that is missing entirely', async () => {
    await runHooks({ operationName: 'posts', query: 'query {}' }, {})

    expect(loggerSpy).toHaveBeenCalledWith('Apollo Response', expect.any(String))
  })
})
