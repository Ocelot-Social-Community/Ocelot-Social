/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import { CreatePost } from '@graphql/queries/CreatePost'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let variables
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
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
        mutation: CreatePost,
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
        mutation: CreatePost,
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
        mutation: CreatePost,
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
        mutation: CreatePost,
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
          mutation: CreatePost,
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
