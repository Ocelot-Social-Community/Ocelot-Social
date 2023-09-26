import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'

let mutate
let authenticatedUser
let variables

const driver = getDriver()
const neode = getNeode()

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
      }
    },
  })
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

const createPostMutation = gql`
  mutation ($title: String!, $content: String!, $categoryIds: [ID]) {
    CreatePost(title: $title, content: $content, categoryIds: $categoryIds) {
      language
    }
  }
`

describe('languagesMiddleware', () => {
  variables = {
    title: 'Test post languages',
    categoryIds: ['cat9'],
  }

  beforeAll(async () => {
    const user = await Factory.build('user')
    authenticatedUser = await user.toJson()
    await Factory.build('category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      icon: 'university',
    })
  })

  it('detects German', async () => {
    variables = {
      ...variables,
      content: 'Jeder sollte vor seiner eigenen Tür kehren.',
    }
    await expect(
      mutate({
        mutation: createPostMutation,
        variables,
      }),
    ).resolves.toMatchObject({
      data: {
        CreatePost: {
          language: 'de',
        },
      },
    })
  })

  it('detects English', async () => {
    variables = {
      ...variables,
      content: 'A journey of a thousand miles begins with a single step.',
    }
    await expect(
      mutate({
        mutation: createPostMutation,
        variables,
      }),
    ).resolves.toMatchObject({
      data: {
        CreatePost: {
          language: 'en',
        },
      },
    })
  })

  it('detects Spanish', async () => {
    variables = {
      ...variables,
      content: 'A caballo regalado, no le mires el diente.',
    }
    await expect(
      mutate({
        mutation: createPostMutation,
        variables,
      }),
    ).resolves.toMatchObject({
      data: {
        CreatePost: {
          language: 'es',
        },
      },
    })
  })

  it('detects German in between lots of html tags', async () => {
    variables = {
      ...variables,
      content:
        '<strong>Jeder</strong> <strike>sollte</strike> <strong>vor</strong> <span>seiner</span> eigenen <blockquote>Tür</blockquote> kehren.',
    }
    await expect(
      mutate({
        mutation: createPostMutation,
        variables,
      }),
    ).resolves.toMatchObject({
      data: {
        CreatePost: {
          language: 'de',
        },
      },
    })
  })

  describe('detects no language', () => {
    it('has default language', async () => {
      variables = {
        ...variables,
        content: '',
      }
      await expect(
        mutate({
          mutation: createPostMutation,
          variables,
        }),
      ).resolves.toMatchObject({
        data: {
          CreatePost: {
            language: 'en',
          },
        },
      })
    })
  })
})
