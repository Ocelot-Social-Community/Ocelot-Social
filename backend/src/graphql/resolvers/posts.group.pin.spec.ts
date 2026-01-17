/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Factory, { cleanDatabase } from '@db/factories'
import { ChangeGroupMemberRole } from '@graphql/queries/ChangeGroupMemberRole'
import { CreateGroup } from '@graphql/queries/CreateGroup'
import { CreatePost } from '@graphql/queries/CreatePost'
import { pinGroupPost } from '@graphql/queries/pinGroupPost'
import { profilePagePosts } from '@graphql/queries/profilePagePosts'
import { unpinGroupPost } from '@graphql/queries/unpinGroupPost'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const defaultConfig = {
  CATEGORIES_ACTIVE: false,
}
let config: Partial<Context['config']>

let anyUser
let allGroupsUser
let publicUser
let publicAdminUser
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(async () => {
  config = { ...defaultConfig }
  authenticatedUser = null

  anyUser = await Factory.build('user', {
    id: 'any-user',
    name: 'Any User',
    about: 'I am just an ordinary user and do not belong to any group.',
  })

  allGroupsUser = await Factory.build('user', {
    id: 'all-groups-user',
    name: 'All Groups User',
    about: 'I am a member of all groups.',
  })
  publicUser = await Factory.build('user', {
    id: 'public-user',
    name: 'Public User',
    about: 'I am the owner of the public group.',
  })
  publicAdminUser = await Factory.build('user', {
    id: 'public-admin-user',
    name: 'Public Admin User',
    about: 'I am the admin of the public group.',
  })

  authenticatedUser = await publicUser.toJson()
  await mutate({
    mutation: CreateGroup,
    variables: {
      id: 'public-group',
      name: 'The Public Group',
      about: 'The public group!',
      description: 'Anyone can see the posts of this group.',
      groupType: 'public',
      actionRadius: 'regional',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'public-group',
      userId: 'all-groups-user',
      roleInGroup: 'usual',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'public-group',
      userId: 'public-admin-user',
      roleInGroup: 'admin',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'closed-group',
      userId: 'all-groups-user',
      roleInGroup: 'usual',
    },
  })
  authenticatedUser = await anyUser.toJson()
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-without-group',
      title: 'A post without a group',
      content: 'I am a user who does not belong to a group yet.',
    },
  })
  authenticatedUser = await publicUser.toJson()
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-1-to-public-group',
      title: 'Post 1 to a public group',
      content: 'I am posting into a public group as a member of the group',
      groupId: 'public-group',
    },
  })
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-2-to-public-group',
      title: 'Post 1 to a public group',
      content: 'I am posting into a public group as a member of the group',
      groupId: 'public-group',
    },
  })
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-3-to-public-group',
      title: 'Post 1 to a public group',
      content: 'I am posting into a public group as a member of the group',
      groupId: 'public-group',
    },
  })
})

afterEach(async () => {
  await cleanDatabase()
})

describe('pin groupPosts', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinGroupPost: null },
      })
    })
  })

  describe('ordinary users', () => {
    it('throws authorization error', async () => {
      authenticatedUser = await anyUser.toJson()
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinGroupPost: null },
      })
    })
  })

  describe('group usual', () => {
    it('throws authorization error', async () => {
      authenticatedUser = await allGroupsUser.toJson()
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinGroupPost: null },
      })
    })
  })

  describe('group admin', () => {
    it('resolves without error', async () => {
      authenticatedUser = await publicAdminUser.toJson()
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: { pinGroupPost: { id: 'post-1-to-public-group', groupPinned: true } },
      })
    })
  })

  describe('group owner', () => {
    it('resolves without error', async () => {
      authenticatedUser = await publicUser.toJson()
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: { pinGroupPost: { id: 'post-1-to-public-group', groupPinned: true } },
      })
    })
  })

  describe('MAX_GROUP_PINNED_POSTS is 1', () => {
    beforeEach(async () => {
      config = { ...defaultConfig, MAX_PINNED_POSTS: 1 }
      authenticatedUser = await publicUser.toJson()
    })
    it('returns post-1-to-public-group as first, pinned post', async () => {
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } })
      await expect(
        query({
          query: profilePagePosts,
          variables: {
            filter: { group: { id: 'public-group' } },
            orderBy: ['groupPinned_asc', 'sortDate_desc'],
          },
        }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          profilePagePosts: [
            expect.objectContaining({ id: 'post-1-to-public-group', groupPinned: true }),
            expect.objectContaining({ id: 'post-3-to-public-group', groupPinned: null }),
            expect.objectContaining({ id: 'post-2-to-public-group', groupPinned: null }),
          ],
        },
      })
    })

    it('no error thrown when pinned post was pinned again', async () => {
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } })
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: { pinGroupPost: { id: 'post-1-to-public-group', groupPinned: true } },
      })
    })

    it('returns post-2-to-public-group as first, pinned post', async () => {
      authenticatedUser = await publicUser.toJson()
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-2-to-public-group' } })
      await expect(
        query({
          query: profilePagePosts,
          variables: {
            filter: { group: { id: 'public-group' } },
            orderBy: ['groupPinned_asc', 'sortDate_desc'],
          },
        }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          profilePagePosts: [
            expect.objectContaining({ id: 'post-2-to-public-group', groupPinned: true }),
            expect.objectContaining({ id: 'post-3-to-public-group', groupPinned: null }),
            expect.objectContaining({ id: 'post-1-to-public-group', groupPinned: null }),
          ],
        },
      })
    })

    it('returns post-3-to-public-group as first, pinned post, when multiple are pinned', async () => {
      authenticatedUser = await publicUser.toJson()
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } })
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-2-to-public-group' } })
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-3-to-public-group' } })
      await expect(
        query({
          query: profilePagePosts,
          variables: {
            filter: { group: { id: 'public-group' } },
            orderBy: ['groupPinned_asc', 'sortDate_desc'],
          },
        }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          profilePagePosts: [
            expect.objectContaining({ id: 'post-3-to-public-group', groupPinned: true }),
            expect.objectContaining({ id: 'post-2-to-public-group', groupPinned: null }),
            expect.objectContaining({ id: 'post-1-to-public-group', groupPinned: null }),
          ],
        },
      })
    })
  })

  describe('MAX_GROUP_PINNED_POSTS is 2', () => {
    beforeEach(async () => {
      config = { ...defaultConfig, MAX_PINNED_POSTS: 2 }
      authenticatedUser = await publicUser.toJson()
    })
    it('returns post-1-to-public-group as first, post-2-to-public-group as second pinned post', async () => {
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } })
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-2-to-public-group' } })
      await expect(
        query({
          query: profilePagePosts,
          variables: {
            filter: { group: { id: 'public-group' } },
            orderBy: ['groupPinned_asc', 'sortDate_desc'],
          },
        }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          profilePagePosts: [
            expect.objectContaining({ id: 'post-2-to-public-group', groupPinned: true }),
            expect.objectContaining({ id: 'post-1-to-public-group', groupPinned: true }),
            expect.objectContaining({ id: 'post-3-to-public-group', groupPinned: null }),
          ],
        },
      })
    })

    it('throws an error when three posts are pinned', async () => {
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } })
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-2-to-public-group' } })
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-3-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Reached maxed pinned posts already. Unpin a post first.' }],
        data: {
          pinGroupPost: null,
        },
      })
    })

    it('throws no error when first unpinned before a third post is pinned', async () => {
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } })
      await mutate({ mutation: pinGroupPost, variables: { id: 'post-2-to-public-group' } })
      await mutate({ mutation: unpinGroupPost, variables: { id: 'post-1-to-public-group' } })
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-3-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: undefined,
      })
      await expect(
        query({
          query: profilePagePosts,
          variables: {
            filter: { group: { id: 'public-group' } },
            orderBy: ['groupPinned_asc', 'sortDate_desc'],
          },
        }),
      ).resolves.toMatchObject({
        errors: undefined,
        data: {
          profilePagePosts: [
            expect.objectContaining({ id: 'post-3-to-public-group', groupPinned: true }),
            expect.objectContaining({ id: 'post-2-to-public-group', groupPinned: true }),
            expect.objectContaining({ id: 'post-1-to-public-group', groupPinned: null }),
          ],
        },
      })
    })
  })
})
