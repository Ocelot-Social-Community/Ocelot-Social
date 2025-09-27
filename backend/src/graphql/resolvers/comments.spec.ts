/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import { CreateComment } from '@graphql/queries/CreateComment'
import { DeleteComment } from '@graphql/queries/DeleteComment'
import { UpdateComment as updateComment } from '@graphql/queries/UpdateComment'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let variables, commentAuthor, newlyCreatedComment
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
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

beforeEach(async () => {
  authenticatedUser = null
  variables = {}
  await database.neode.create('Category', {
    id: 'cat9',
    name: 'Democracy & Politics',
    icon: 'university',
  })
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

const setupPostAndComment = async () => {
  commentAuthor = await Factory.build('user')
  await Factory.build(
    'post',
    {
      id: 'p1',
      content: 'Post to be commented',
    },
    {
      categoryIds: ['cat9'],
    },
  )
  newlyCreatedComment = await Factory.build(
    'comment',
    {
      id: 'c456',
      content: 'Comment to be deleted',
    },
    {
      postId: 'p1',
      author: commentAuthor,
    },
  )
  variables = {
    ...variables,
    id: 'c456',
    content: 'The comment is updated',
  }
}

describe('CreateComment', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      variables = {
        ...variables,
        postId: 'p1',
        content: "I'm not authorized to comment",
      }
      const { errors } = await mutate({ mutation: CreateComment, variables })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      const user = await database.neode.create('User', { name: 'Author' })
      authenticatedUser = (await user.toJson()) as Context['user']
    })

    describe('given a post', () => {
      beforeEach(async () => {
        await Factory.build('post', { id: 'p1' }, { categoryIds: ['cat9'] })
        variables = {
          ...variables,
          postId: 'p1',
          content: "I'm authorized to comment",
        }
      })

      it('creates a comment', async () => {
        await expect(mutate({ mutation: CreateComment, variables })).resolves.toMatchObject({
          data: { CreateComment: { content: "I'm authorized to comment" } },
          errors: undefined,
        })
      })

      it('assigns the authenticated user as author', async () => {
        await expect(mutate({ mutation: CreateComment, variables })).resolves.toMatchObject({
          data: { CreateComment: { author: { name: 'Author' } } },
          errors: undefined,
        })
      })
    })
  })
})

describe('UpdateComment', () => {
  describe('given a post and a comment', () => {
    beforeEach(setupPostAndComment)

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const { errors } = await mutate({ mutation: updateComment, variables })
        expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated but not the author', () => {
      beforeEach(async () => {
        const randomGuy = await Factory.build('user')
        authenticatedUser = await randomGuy.toJson()
      })

      it('throws authorization error', async () => {
        const { errors } = await mutate({ mutation: updateComment, variables })
        expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as author', () => {
      beforeEach(async () => {
        authenticatedUser = await commentAuthor.toJson()
      })

      it('updates the comment', async () => {
        const expected = {
          data: { UpdateComment: { id: 'c456', content: 'The comment is updated' } },
          errors: undefined,
        }
        await expect(mutate({ mutation: updateComment, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('updates a comment, but maintains non-updated attributes', async () => {
        const expected = {
          data: {
            UpdateComment: {
              id: 'c456',
              content: 'The comment is updated',
              createdAt: expect.any(String),
            },
          },
          errors: undefined,
        }
        await expect(mutate({ mutation: updateComment, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('updates the updatedAt attribute', async () => {
        newlyCreatedComment = await newlyCreatedComment.toJson()
        const {
          data: { UpdateComment },
        } = (await mutate({ mutation: updateComment, variables })) as any // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(newlyCreatedComment.updatedAt).toBeTruthy()
        expect(Date.parse(newlyCreatedComment.updatedAt)).toEqual(expect.any(Number))
        expect(UpdateComment.updatedAt).toBeTruthy()
        expect(Date.parse(UpdateComment.updatedAt)).toEqual(expect.any(Number))
        expect(newlyCreatedComment.updatedAt).not.toEqual(UpdateComment.updatedAt)
      })

      describe('if comment does not exist for given id', () => {
        beforeEach(() => {
          variables = { ...variables, id: 'does-not-exist' }
        })

        it('returns null', async () => {
          const { data, errors } = await mutate({ mutation: updateComment, variables })
          expect(data).toMatchObject({ UpdateComment: null })
          expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
        })
      })
    })
  })
})

describe('DeleteComment', () => {
  describe('given a post and a comment', () => {
    beforeEach(setupPostAndComment)

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const result = await mutate({ mutation: DeleteComment, variables })
        expect(result.errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated but not the author', () => {
      beforeEach(async () => {
        const randomGuy = await Factory.build('user')
        authenticatedUser = await randomGuy.toJson()
      })

      it('throws authorization error', async () => {
        const { errors } = await mutate({ mutation: DeleteComment, variables })
        expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as author', () => {
      beforeEach(async () => {
        authenticatedUser = await commentAuthor.toJson()
      })

      it('marks the comment as deleted and blacks out content', async () => {
        const { data } = await mutate({ mutation: DeleteComment, variables })
        const expected = {
          DeleteComment: {
            id: 'c456',
            deleted: true,
            content: 'UNAVAILABLE',
            contentExcerpt: 'UNAVAILABLE',
          },
        }
        expect(data).toMatchObject(expected)
      })
    })
  })
})
