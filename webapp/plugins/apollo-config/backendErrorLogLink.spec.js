import { ApolloLink, Observable, execute } from 'apollo-link'
import gql from 'graphql-tag'

import { createBackendErrorLogLink } from './backendErrorLogLink'
import { createGraphqlResponseLink } from './graphqlResponseLink'

const MUTATION = gql`
  mutation Login {
    login
  }
`

// Stand in for the http link: terminating links that answer the way the transport would.
const answeringWith = (result) =>
  new ApolloLink(
    () =>
      new Observable((observer) => {
        observer.next(result)
        observer.complete()
      }),
  )

const failingWith = (error) =>
  new ApolloLink(
    () =>
      new Observable((observer) => {
        observer.error(error)
      }),
  )

const run = (...links) =>
  new Promise((resolve) => {
    const results = []
    execute(ApolloLink.from(links), { query: MUTATION }).subscribe({
      next: (result) => results.push(result),
      complete: () => resolve({ results, error: null }),
      error: (error) => resolve({ results, error }),
    })
  })

describe('backendErrorLogLink', () => {
  let consoleError

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('logs the errorCode, the error class and the untranslated backend text', async () => {
    const body = {
      data: null,
      errors: [
        {
          message: 'Incorrect email address or password.',
          path: ['login'],
          extensions: { code: 'UNAUTHENTICATED', errorCode: 'LOGIN_CREDENTIALS_INCORRECT' },
        },
      ],
    }

    const { results } = await run(createBackendErrorLogLink(), answeringWith(body))

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith(
      '[backend error] LOGIN_CREDENTIALS_INCORRECT / UNAUTHENTICATED: Incorrect email address or password.',
      { operation: 'Login', path: ['login'] },
    )
    // The result itself is handed on untouched.
    expect(results).toEqual([body])
  })

  it('logs the params of an error that has some', async () => {
    await run(
      createBackendErrorLogLink(),
      answeringWith({
        errors: [
          {
            message: 'At most {max} categories.',
            extensions: {
              code: 'BAD_USER_INPUT',
              errorCode: 'GROUP_SAVE_TOO_MANY_CATEGORIES',
              params: { max: 3 },
            },
          },
        ],
      }),
    )

    expect(consoleError).toHaveBeenCalledWith(
      '[backend error] GROUP_SAVE_TOO_MANY_CATEGORIES / BAD_USER_INPUT: At most {max} categories.',
      { operation: 'Login', params: { max: 3 } },
    )
  })

  it('logs every error of a response', async () => {
    await run(
      createBackendErrorLogLink(),
      answeringWith({
        errors: [{ message: 'first', extensions: { code: 'FORBIDDEN' } }, { message: 'second' }],
      }),
    )

    expect(consoleError.mock.calls.map(([line]) => line)).toEqual([
      '[backend error] FORBIDDEN: first',
      '[backend error] no code: second',
    ])
  })

  it('stays silent for a response without errors', async () => {
    const { results } = await run(
      createBackendErrorLogLink(),
      answeringWith({ data: { login: 'jwt' } }),
    )

    expect(consoleError).not.toHaveBeenCalled()
    expect(results).toEqual([{ data: { login: 'jwt' } }])
  })

  it('hands a network failure on without logging — it carries no backend error', async () => {
    const failure = new Error('Failed to fetch')

    const { error } = await run(createBackendErrorLogLink(), failingWith(failure))

    expect(error).toBe(failure)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('placed before the response link, also logs the errors of a 400 answer', async () => {
    // Apollo Server answers validation and variable coercion errors with 400; the response link is
    // what turns that back into a result — so the log link has to sit OUTSIDE of it to see them.
    const serverError = new Error('Response not successful: Received status code 400')
    serverError.statusCode = 400
    serverError.result = {
      errors: [
        { message: 'Variable "$id" got invalid value', extensions: { code: 'BAD_USER_INPUT' } },
      ],
    }

    await run(createBackendErrorLogLink(), createGraphqlResponseLink(), failingWith(serverError))

    expect(consoleError).toHaveBeenCalledWith(
      '[backend error] BAD_USER_INPUT: Variable "$id" got invalid value',
      { operation: 'Login' },
    )
  })
})
