import gql from 'graphql-tag'
import persistentLinks from './persistentLinks.js'

const queryId = gql`
  query ($idOrSlug: ID) {
    Group(id: $idOrSlug) {
      id
      slug
    }
  }
`
const querySlug = gql`
  query ($idOrSlug: String) {
    Group(slug: $idOrSlug) {
      id
      slug
    }
  }
`

const setup = ({ params, idLookup = [], slugLookup = [] } = {}) => {
  const queries = []
  const client = {
    query: jest.fn(({ query }) => {
      queries.push(query)
      const data = query === queryId ? { Group: idLookup } : { Group: slugLookup }
      return Promise.resolve({ data })
    }),
  }
  const redirect = jest.fn()
  const error = jest.fn()
  const context = {
    params,
    redirect,
    error,
    app: { apolloProvider: { defaultClient: client } },
  }
  return { context, redirect, error, client, queries }
}

const mixin = persistentLinks({
  queryId,
  querySlug,
  path: 'groups',
  message: 'error-pages.group-not-found',
})

describe('persistentLinks', () => {
  it('does nothing when id+slug already match (canonical URL)', async () => {
    const { context, redirect, error, client } = setup({
      params: { id: 'g1', slug: 'my-group' },
      idLookup: [{ id: 'g1', slug: 'my-group' }],
    })
    await mixin.asyncData(context)
    expect(client.query).toHaveBeenCalledTimes(1)
    expect(redirect).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('redirects to canonical when id matches but slug is stale', async () => {
    const { context, redirect } = setup({
      params: { id: 'g1', slug: 'old-slug' },
      idLookup: [{ id: 'g1', slug: 'new-slug' }],
    })
    await mixin.asyncData(context)
    expect(redirect).toHaveBeenCalledWith('/groups/g1/new-slug')
  })

  it('falls back to slug lookup when id is unknown', async () => {
    const { context, redirect, client } = setup({
      params: { id: 'my-group', slug: undefined },
      idLookup: [],
      slugLookup: [{ id: 'g1', slug: 'my-group' }],
    })
    await mixin.asyncData(context)
    expect(client.query).toHaveBeenCalledTimes(2)
    expect(redirect).toHaveBeenCalledWith('/groups/g1/my-group')
  })

  it('encodes reserved characters in the redirect target', async () => {
    const { context, redirect } = setup({
      params: { id: 'g1', slug: 'stale' },
      idLookup: [{ id: 'g1', slug: 'foo/bar' }],
    })
    await mixin.asyncData(context)
    expect(redirect).toHaveBeenCalledWith('/groups/g1/foo%2Fbar')
  })

  it('encodes reserved characters in the id', async () => {
    const { context, redirect } = setup({
      params: { id: 'g/1', slug: 'stale' },
      idLookup: [{ id: 'g/1', slug: 'my-group' }],
    })
    await mixin.asyncData(context)
    expect(redirect).toHaveBeenCalledWith('/groups/g%2F1/my-group')
  })

  it('encodes reserved characters in slug-only lookups', async () => {
    const { context, redirect } = setup({
      params: { id: 'foo/bar', slug: undefined },
      idLookup: [],
      slugLookup: [{ id: 'g1', slug: 'foo/bar' }],
    })
    await mixin.asyncData(context)
    expect(redirect).toHaveBeenCalledWith('/groups/g1/foo%2Fbar')
  })

  it('returns 404 when neither lookup finds a resource', async () => {
    const { context, redirect, error } = setup({
      params: { id: 'nope', slug: undefined },
    })
    await mixin.asyncData(context)
    expect(redirect).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith({
      statusCode: 404,
      key: 'error-pages.group-not-found',
    })
  })

  it('returns 404 without querying when no id/slug is provided', async () => {
    const { context, redirect, error, client } = setup({ params: {} })
    await mixin.asyncData(context)
    expect(client.query).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith({
      statusCode: 404,
      key: 'error-pages.group-not-found',
    })
  })
})
