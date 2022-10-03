import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import { createGroupMutation, changeGroupMemberRoleMutation } from '../../db/graphql/groups'
import { createPostMutation, postQuery } from '../../db/graphql/posts'
// eslint-disable-next-line no-unused-vars
import { DESCRIPTION_WITHOUT_HTML_LENGTH_MIN } from '../../constants/groups'
import CONFIG from '../../config'

CONFIG.CATEGORIES_ACTIVE = false

jest.mock('../../constants/groups', () => {
  return {
    __esModule: true,
    DESCRIPTION_WITHOUT_HTML_LENGTH_MIN: 5,
  }
})

const driver = getDriver()
const neode = getNeode()

let query
let mutate
let anyUser
let allGroupsUser
let pendingUser
let publicUser
let closedUser
let hiddenUser
let authenticatedUser

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
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  // await cleanDatabase()
})

describe('Posts in Groups', () => {
  beforeAll(async () => {
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
    pendingUser = await Factory.build('user', {
      id: 'pending-user',
      name: 'Pending User',
      about: 'I am a pending member of all groups.',
    })
    publicUser = await Factory.build('user', {
      id: 'public-user',
      name: 'Public User',
      about: 'I am the owner of the public group.',
    })

    closedUser = await Factory.build('user', {
      id: 'closed-user',
      name: 'Private User',
      about: 'I am the owner of the closed group.',
    })

    hiddenUser = await Factory.build('user', {
      id: 'hidden-user',
      name: 'Secret User',
      about: 'I am the owner of the hidden group.',
    })

    authenticatedUser = await publicUser.toJson()
    await mutate({
      mutation: createGroupMutation(),
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
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'public-group',
        userId: 'pending-user',
        roleInGroup: 'pending',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'public-group',
        userId: 'all-groups-user',
        roleInGroup: 'usual',
      },
    })
    authenticatedUser = await closedUser.toJson()
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: 'closed-group',
        name: 'The Closed Group',
        about: 'The closed group!',
        description: 'Only members of this group can see the posts of this group.',
        groupType: 'closed',
        actionRadius: 'regional',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'closed-group',
        userId: 'pending-user',
        roleInGroup: 'pending',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'closed-group',
        userId: 'all-groups-user',
        roleInGroup: 'usual',
      },
    })
    authenticatedUser = await hiddenUser.toJson()
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: 'hidden-group',
        name: 'The Hidden Group',
        about: 'The hidden group!',
        description: 'Only members of this group can see the posts of this group.',
        groupType: 'hidden',
        actionRadius: 'regional',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'hidden-group',
        userId: 'pending-user',
        roleInGroup: 'pending',
      },
    })
    await mutate({
      mutation: changeGroupMemberRoleMutation(),
      variables: {
        groupId: 'hidden-group',
        userId: 'all-groups-user',
        roleInGroup: 'usual',
      },
    })
  })

  describe('creating posts in groups', () => {
    describe('without membership of group', () => {
      beforeEach(async () => {
        authenticatedUser = await anyUser.toJson()
      })

      it('throws an error for public groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'p2',
              title: 'A post to a pubic group',
              content: 'I am posting into a public group without being a member of the group',
              groupId: 'public-group',
            },
          }),
        ).resolves.toMatchObject({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'Not Authorized!' })]),
        })
      })

      it('throws an error for closed groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'p2',
              title: 'A post to a closed group',
              content: 'I am posting into a closed group without being a member of the group',
              groupId: 'closed-group',
            },
          }),
        ).resolves.toMatchObject({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'Not Authorized!' })]),
        })
      })

      it('throws an error for hidden groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'p2',
              title: 'A post to a closed group',
              content: 'I am posting into a hidden group without being a member of the group',
              groupId: 'hidden-group',
            },
          }),
        ).resolves.toMatchObject({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'Not Authorized!' })]),
        })
      })
    })

    describe('as a pending member of group', () => {
      beforeEach(async () => {
        authenticatedUser = await pendingUser.toJson()
      })

      it('throws an error for public groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'p2',
              title: 'A post to a pubic group',
              content: 'I am posting into a public group with a pending membership',
              groupId: 'public-group',
            },
          }),
        ).resolves.toMatchObject({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'Not Authorized!' })]),
        })
      })

      it('throws an error for closed groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'p2',
              title: 'A post to a closed group',
              content: 'I am posting into a closed group with a pending membership',
              groupId: 'closed-group',
            },
          }),
        ).resolves.toMatchObject({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'Not Authorized!' })]),
        })
      })

      it('throws an error for hidden groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'p2',
              title: 'A post to a closed group',
              content: 'I am posting into a hidden group with a pending membership',
              groupId: 'hidden-group',
            },
          }),
        ).resolves.toMatchObject({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'Not Authorized!' })]),
        })
      })
    })

    describe('as a member of group', () => {
      beforeEach(async () => {
        authenticatedUser = await allGroupsUser.toJson()
      })

      it('creates a post for public groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'post-to-public-group',
              title: 'A post to a public group',
              content: 'I am posting into a public group as a member of the group',
              groupId: 'public-group',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            CreatePost: {
              id: 'post-to-public-group',
              title: 'A post to a public group',
              content: 'I am posting into a public group as a member of the group',
            },
          },
          errors: undefined,
        })
      })

      it('creates a post for closed groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'post-to-closed-group',
              title: 'A post to a closed group',
              content: 'I am posting into a closed group as a member of the group',
              groupId: 'closed-group',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            CreatePost: {
              id: 'post-to-closed-group',
              title: 'A post to a closed group',
              content: 'I am posting into a closed group as a member of the group',
            },
          },
          errors: undefined,
        })
      })

      it('creates a post for hidden groups', async () => {
        await expect(
          mutate({
            mutation: createPostMutation(),
            variables: {
              id: 'post-to-hidden-group',
              title: 'A post to a hidden group',
              content: 'I am posting into a hidden group as a member of the group',
              groupId: 'hidden-group',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            CreatePost: {
              id: 'post-to-hidden-group',
              title: 'A post to a hidden group',
              content: 'I am posting into a hidden group as a member of the group',
            },
          },
          errors: undefined,
        })
      })
    })
  })

  describe('visibility of posts', () => {
    describe('query post by ID', () => {
      describe('without membership of group', () => {
        beforeEach(async () => {
          authenticatedUser = await anyUser.toJson()
        })

        it('shows a post of the public group', async () => {
          await expect(
            query({ query: postQuery(), variables: { id: 'post-to-public-group' } }),
          ).resolves.toMatchObject({
            data: {
              Post: expect.arrayContaining([
                {
                  id: 'post-to-public-group',
                  title: 'A post to a public group',
                  content: 'I am posting into a public group as a member of the group',
                },
              ]),
            },
            errors: undefined,
          })
        })

        it('does not show a post of a closed group', async () => {
          await expect(
            query({ query: postQuery(), variables: { id: 'post-to-closed-group' } }),
          ).resolves.toMatchObject({
            data: {
              Post: [],
            },
            errors: undefined,
          })
        })

        it('does not show a post of a hidden group', async () => {
          await expect(
            query({ query: postQuery(), variables: { id: 'post-to-hidden-group' } }),
          ).resolves.toMatchObject({
            data: {
              Post: [],
            },
            errors: undefined,
          })
        })
      })

      describe('as member of group', () => {
        beforeEach(async () => {
          authenticatedUser = await allGroupsUser.toJson()
        })

        it('shows post of the public group', async () => {
          await expect(
            query({ query: postQuery(), variables: { id: 'post-to-public-group' } }),
          ).resolves.toMatchObject({
            data: {
              Post: expect.arrayContaining([
                {
                  id: 'post-to-public-group',
                  title: 'A post to a public group',
                  content: 'I am posting into a public group as a member of the group',
                },
              ]),
            },
            errors: undefined,
          })
        })

        it('shows post of a closed group', async () => {
          await expect(
            query({ query: postQuery(), variables: { id: 'post-to-closed-group' } }),
          ).resolves.toMatchObject({
            data: {
              Post: expect.arrayContaining([
                {
                  id: 'post-to-closed-group',
                  title: 'A post to a closed group',
                  content: 'I am posting into a closed group as a member of the group',
                },
              ]),
            },
            errors: undefined,
          })
        })

        it('shows post of a hidden group', async () => {
          await expect(
            query({ query: postQuery(), variables: { id: 'post-to-hidden-group' } }),
          ).resolves.toMatchObject({
            data: {
              Post: expect.arrayContaining([
                {
                  id: 'post-to-hidden-group',
                  title: 'A post to a hidden group',
                  content: 'I am posting into a hidden group as a member of the group',
                },
              ]),
            },
            errors: undefined,
          })
        })
      })
    })
  })
})
