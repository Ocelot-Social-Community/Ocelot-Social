/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CreateComment from '@graphql/queries/comments/CreateComment.gql'
import DeleteComment from '@graphql/queries/comments/DeleteComment.gql'
import updateComment from '@graphql/queries/comments/UpdateComment.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

let variables, commentAuthor, newlyCreatedComment
let authenticatedUser: Context['user']
// Per-test role override: when set, the in-memory RoleService is built from these
// definitions instead of the defaults — used to test the comment.create gate by
// giving the viewer a role that lacks it.
let rolesOverride: RoleDefinition[] | undefined
const context = () => ({ authenticatedUser, roles: rolesOverride })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
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
  rolesOverride = undefined
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

describe('Comment query', () => {
  // The default ordering is a deliberate behaviour change: neo4j-graphql-js emitted no
  // ORDER BY without an explicit `orderBy`, so the order was whatever the database returned.
  // Paging over an unordered result is unstable by definition, hence a fixed default —
  // oldest first, because a comment list reads as a thread. Pinned down here so the choice
  // cannot be lost silently.
  it('returns comments oldest first when no orderBy is given', async () => {
    await setupPostAndComment()
    authenticatedUser = await commentAuthor.toJson()

    // Distinct, deliberately out-of-order timestamps: insertion order must not be what
    // makes this pass.
    await database.write({
      query: `
        MATCH (post:Post { id: 'p1' })
        CREATE (c1:Comment { id: 'ordered-2', content: 'second', createdAt: '2020-02-02T00:00:00.000Z' })-[:COMMENTS]->(post)
        CREATE (c2:Comment { id: 'ordered-1', content: 'first', createdAt: '2020-01-01T00:00:00.000Z' })-[:COMMENTS]->(post)
      `,
    })

    const { data, errors } = await query({
      query: '{ Comment(filter: { id_in: ["ordered-1", "ordered-2"] }) { id } }',
    })

    expect(errors).toBeUndefined()
    expect((data.Comment as { id: string }[]).map((comment) => comment.id)).toEqual([
      'ordered-1',
      'ordered-2',
    ])
  })

  // The scalar arguments (content, createdAt, updatedAt beside id) are equality matches the
  // schema advertises. They are built into the WHERE clause from a fixed list of field names, and
  // an argument that is silently dropped instead WIDENS the result set the caller believes to be
  // narrowed — the same failure mode the filter guard below exists for.
  it('constrains the query by a top-level equality argument', async () => {
    await setupPostAndComment()
    authenticatedUser = await commentAuthor.toJson()
    await database.write({
      query: `
        MATCH (post:Post { id: 'p1' })
        CREATE (:Comment { id: 'needle', content: 'find me', createdAt: '2020-01-01T00:00:00.000Z' })-[:COMMENTS]->(post)
        CREATE (:Comment { id: 'haystack', content: 'not me', createdAt: '2020-01-02T00:00:00.000Z' })-[:COMMENTS]->(post)
      `,
    })

    const { data, errors } = await query({
      query: '{ Comment(content: "find me") { id } }',
    })

    expect(errors).toBeUndefined()
    expect((data.Comment as { id: string }[]).map((comment) => comment.id)).toEqual(['needle'])
  })

  it('honours an explicit orderBy', async () => {
    await setupPostAndComment()
    authenticatedUser = await commentAuthor.toJson()

    await database.write({
      query: `
        MATCH (post:Post { id: 'p1' })
        CREATE (c1:Comment { id: 'ordered-2', content: 'second', createdAt: '2020-02-02T00:00:00.000Z' })-[:COMMENTS]->(post)
        CREATE (c2:Comment { id: 'ordered-1', content: 'first', createdAt: '2020-01-01T00:00:00.000Z' })-[:COMMENTS]->(post)
      `,
    })

    const { data, errors } = await query({
      query:
        '{ Comment(filter: { id_in: ["ordered-1", "ordered-2"] }, orderBy: createdAt_desc) { id } }',
    })

    expect(errors).toBeUndefined()
    expect((data.Comment as { id: string }[]).map((comment) => comment.id)).toEqual([
      'ordered-2',
      'ordered-1',
    ])
  })
})

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
      authenticatedUser = (await user.toJson()) as unknown as Context['user']
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

      it('denies commenting to a role without the comment.create permission', async () => {
        // Same viewer, but their (user) role no longer grants comment.create.
        rolesOverride = [
          {
            name: 'user',
            protected: false,
            permissions: [
              'post.create',
              'group.create_public',
              'group.create_closed',
              'group.create_hidden',
              'user.invite',
            ],
          },
        ]
        const { errors } = await mutate({ mutation: CreateComment, variables })

        expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
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
          },
        }

        expect(data).toMatchObject(expected)
      })
    })
  })
})
