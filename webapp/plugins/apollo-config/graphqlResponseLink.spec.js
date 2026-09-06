import { ApolloLink, Observable, execute } from 'apollo-link'
import gql from 'graphql-tag'

import { createGraphqlResponseLink } from './graphqlResponseLink'

const QUERY = gql`
  query {
    Post {
      id
    }
  }
`

// The real ServerError, built the way apollo-link-http-common builds it (`throwServerError`):
// message + statusCode + the PARSED body on `.result`.
const serverError = (statusCode, result) => {
  const error = new Error(`Response not successful: Received status code ${statusCode}`)
  error.name = 'ServerError'
  error.statusCode = statusCode
  error.result = result
  error.response = { status: statusCode }
  return error
}

// Stands in for the http link: a terminating link that fails the request the way the transport
// would, so the assertions run through the same subscribe/error path as production.
const failingWith = (error) =>
  new ApolloLink(
    () =>
      new Observable((observer) => {
        observer.error(error)
      }),
  )

const run = (terminatingLink) => {
  const link = ApolloLink.from([createGraphqlResponseLink(), terminatingLink])
  return new Promise((resolve) => {
    const results = []
    execute(link, { query: QUERY }).subscribe({
      next: (result) => results.push(result),
      complete: () => resolve({ results, error: null }),
      error: (error) => resolve({ results, error }),
    })
  })
}

describe('graphqlResponseLink', () => {
  it('delivers a 400 that carries GraphQL errors as a result, not as a network failure', async () => {
    // Apollo Server 5 answers variable coercion errors with 400 (v4 defaulted to 200). Without this
    // link the component sees `networkError` and renders "server unreachable" for what is really a
    // malformed request — the failure mode the `orderBy` and hashtag-filter outages produced.
    const body = {
      errors: [
        {
          message: 'Variable "$filter" got invalid value ...',
          extensions: { code: 'BAD_USER_INPUT' },
        },
      ],
    }

    const { results, error } = await run(failingWith(serverError(400, body)))

    expect(error).toBeNull()
    expect(results).toEqual([body])
  })

  it('forwards the data the backend sent alongside the errors', async () => {
    // A 4xx response may still carry (partial) data. Passing the body through unchanged is what
    // lets vue-apollo apply its normal partial-data handling instead of discarding the payload.
    const body = { data: { Post: null }, errors: [{ message: 'nope' }] }

    const { results } = await run(failingWith(serverError(400, body)))

    expect(results).toEqual([body])
  })

  it('leaves a 500 alone — a broken backend must not look like a field error', async () => {
    const error500 = serverError(500, { errors: [{ message: 'Internal server error' }] })

    const { results, error } = await run(failingWith(error500))

    expect(error).toBe(error500)
    expect(results).toEqual([])
  })

  it('leaves a transport failure with no parsed body alone', async () => {
    // A ServerParseError (HTML error page from a proxy, connection reset, …) has `bodyText` but no
    // `.result`, and there is nothing GraphQL about it.
    const parseError = new Error('Unexpected token < in JSON')
    parseError.statusCode = 502
    parseError.bodyText = '<html>502 Bad Gateway</html>'

    const { error } = await run(failingWith(parseError))

    expect(error).toBe(parseError)
  })

  it('leaves a 4xx whose body has no errors array alone', async () => {
    // e.g. a 401 from an authenticating proxy in front of the backend: JSON, but not a GraphQL
    // response — reclassifying it would silently swallow the request.
    const error401 = serverError(401, { message: 'Unauthorized' })

    const { error } = await run(failingWith(error401))

    expect(error).toBe(error401)
  })

  it('leaves a 4xx with an EMPTY errors array alone', async () => {
    // Not a valid GraphQL error response — `errors` must be non-empty when present. Passing it on
    // as a result would complete the operation with nothing to show for it.
    const emptyErrors = serverError(400, { errors: [] })

    const { error } = await run(failingWith(emptyErrors))

    expect(error).toBe(emptyErrors)
  })

  it('passes successful responses straight through', async () => {
    const data = { data: { Post: [{ id: 'p1' }] } }
    const succeeding = new ApolloLink(
      () =>
        new Observable((observer) => {
          observer.next(data)
          observer.complete()
        }),
    )

    const { results, error } = await run(succeeding)

    expect(error).toBeNull()
    expect(results).toEqual([data])
  })

  it('unsubscribes from the wrapped link when the caller cancels', async () => {
    // vue-apollo tears down in-flight queries on navigation; if the wrapper dropped the
    // unsubscribe, the underlying request would keep running and later write into a dead component.
    const unsubscribe = jest.fn()
    const neverResolving = new ApolloLink(() => new Observable(() => unsubscribe))

    const link = ApolloLink.from([createGraphqlResponseLink(), neverResolving])
    const subscription = execute(link, { query: QUERY }).subscribe({ next: () => {} })
    subscription.unsubscribe()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
