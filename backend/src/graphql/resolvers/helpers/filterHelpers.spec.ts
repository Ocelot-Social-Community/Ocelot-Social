/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import Post from '@graphql/queries/posts/Post.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  query = apolloSetup.query
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

afterEach(async () => {
  await cleanDatabase()
})

describe('filterForMutedUsers', () => {
  describe('when looking up a single post by id', () => {
    it('does not filter muted users', async () => {
      const author = await Factory.build('user', { id: 'muted-author', name: 'Muted Author' })
      const viewer = await Factory.build('user', { id: 'viewer', name: 'Viewer' })

      // Viewer mutes author
      const session = database.driver.session()
      try {
        await session.writeTransaction((txc) =>
          txc.run(`
            MATCH (viewer:User {id: 'viewer'}), (author:User {id: 'muted-author'})
            MERGE (viewer)-[:MUTED]->(author)
          `),
        )
      } finally {
        await session.close()
      }

      // Author creates a post
      authenticatedUser = await author.toJson()
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'muted-post',
          title: 'Post by muted user',
          content: 'Some content here for the post',
          postType: 'Article',
        },
      })

      // Viewer queries for the specific post by id — should still see it
      authenticatedUser = await viewer.toJson()
      const result = await query({
        query: Post,
        variables: { id: 'muted-post' },
      })
      expect(result.data?.Post).toHaveLength(1)
      expect(result.data?.Post[0].id).toBe('muted-post')
    })
  })

  describe('when listing all posts', () => {
    it('filters posts from muted users', async () => {
      const author = await Factory.build('user', { id: 'muted-author', name: 'Muted Author' })
      const otherAuthor = await Factory.build('user', {
        id: 'other-author',
        name: 'Other Author',
      })
      const viewer = await Factory.build('user', { id: 'viewer', name: 'Viewer' })

      // Viewer mutes author
      const session = database.driver.session()
      try {
        await session.writeTransaction((txc) =>
          txc.run(`
            MATCH (viewer:User {id: 'viewer'}), (author:User {id: 'muted-author'})
            MERGE (viewer)-[:MUTED]->(author)
          `),
        )
      } finally {
        await session.close()
      }

      // Both authors create posts
      authenticatedUser = await author.toJson()
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'muted-post',
          title: 'Post by muted user',
          content: 'Some content here for the muted post',
          postType: 'Article',
        },
      })

      authenticatedUser = await otherAuthor.toJson()
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'visible-post',
          title: 'Post by other user',
          content: 'Some content here for the visible post',
          postType: 'Article',
        },
      })

      // Viewer lists all posts — should not see muted author's post
      authenticatedUser = await viewer.toJson()
      const result = await query({ query: Post })
      const ids = result.data?.Post.map((p: { id: string }) => p.id)
      expect(ids).toContain('visible-post')
      expect(ids).not.toContain('muted-post')
    })
  })
})

describe('filterPostsOfMyGroups', () => {
  describe('when user is not authenticated', () => {
    it('returns empty for postsInMyGroups filter', async () => {
      const author = await Factory.build('user', { id: 'author', name: 'Author' })
      authenticatedUser = await author.toJson()

      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'some-post',
          title: 'A regular post',
          content: 'Some content here for the post',
          postType: 'Article',
        },
      })

      // Query with postsInMyGroups but user has no groups
      const result = await query({
        query: Post,
        variables: { filter: { postsInMyGroups: true } },
      })
      expect(result.data?.Post).toHaveLength(0)
    })
  })
})

describe('filterInvisiblePosts', () => {
  describe('with closed group posts', () => {
    beforeEach(async () => {
      const owner = await Factory.build('user', { id: 'group-owner', name: 'Group Owner' })
      await Factory.build('user', { id: 'outsider', name: 'Outsider' })

      authenticatedUser = await owner.toJson()
      await Factory.build('group', {
        id: 'closed-group',
        name: 'Closed Group',
        groupType: 'closed',
        ownerId: 'group-owner',
      })

      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'closed-group-post',
          title: 'Secret Post',
          content: 'Some content here for the secret post',
          postType: 'Article',
          groupId: 'closed-group',
        },
      })

      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'public-post',
          title: 'Public Post',
          content: 'Some content here for the public post',
          postType: 'Article',
        },
      })
    })

    it('filters posts in non-public groups for non-members', async () => {
      const outsider = await database.neode.find('User', 'outsider')
      authenticatedUser = (await outsider.toJson()) as Context['user']
      const result = await query({ query: Post })
      const ids = result.data?.Post.map((p: { id: string }) => p.id)
      expect(ids).toContain('public-post')
      expect(ids).not.toContain('closed-group-post')
    })
  })
})
