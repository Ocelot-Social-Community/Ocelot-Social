import { parse } from 'graphql'
import { beforeAll, afterAll, afterEach, beforeEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CreateComment from '@graphql/queries/comments/CreateComment.gql'
import ChangeGroupMemberRole from '@graphql/queries/groups/ChangeGroupMemberRole.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import LeaveGroup from '@graphql/queries/groups/LeaveGroup.gql'
import RemoveUserFromGroup from '@graphql/queries/groups/RemoveUserFromGroup.gql'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import userData from '@graphql/queries/users/userData.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// #10629: a post stays its author's after they leave the group (the author exception of the
// post visibility rule, posts.groupVisibility.spec.ts). What the members wrote under it does
// not: it is the group's, and only who reads the group reads it. What the author wrote there
// themselves stays theirs — in the thread and in their data export.

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

interface Viewer {
  toJson: () => Promise<Context['user']>
}
let owner: Viewer, author: Viewer, member: Viewer

const threadQuery = parse(`
  query {
    Post(id: "post") {
      id
      commentsCount
      comments {
        id
      }
    }
  }
`)

const searchQuery = parse(`
  query {
    searchPosts(query: "group", firstPosts: 10, postsOffset: 0) {
      posts {
        id
        commentsCount
      }
    }
  }
`)

const unreadQuery = parse(`
  query {
    Post(id: "post") {
      unreadCommentNotificationsByCurrentUser {
        from {
          ... on Comment {
            id
            content
          }
        }
      }
    }
  }
`)

interface Unread {
  Post: { unreadCommentNotificationsByCurrentUser: { from: { id: string } }[] }[]
}

interface Thread {
  Post: { id: string; commentsCount: number; comments: { id: string }[] }[]
}

interface Search {
  searchPosts: { posts: { id: string; commentsCount: number }[] }
}

interface Export {
  userData: { posts: { id: string; comments: { id: string }[] }[] }
}

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

const buildUser = async (id: string): Promise<Viewer> => {
  // The factory module is untyped; its user is typed here, once, as what these tests use of it.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const user: Viewer = await Factory.build(
    'user',
    { id, name: id, slug: id },
    { email: `${id}@example.org`, password: '1234' },
  )
  return user
}

const as = async (viewer: Viewer) => {
  authenticatedUser = await viewer.toJson()
}

const unreadCommentIds = async (viewer: Viewer) => {
  await as(viewer)
  const result = await query({ query: unreadQuery })

  expect(result.errors).toBeUndefined()

  return (result.data as Unread).Post[0].unreadCommentNotificationsByCurrentUser
    .map(({ from }) => from.id)
    .sort()
}

const join = async (viewer: Viewer, template: string) => {
  await as(viewer)
  const userId = authenticatedUser?.id
  await mutate({ mutation: JoinGroup, variables: { groupId: 'group', userId } })
  if (template !== 'public') {
    await as(owner)
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: 'group', userId, roleInGroup: 'usual' },
    })
  }
}

const comment = async (viewer: Viewer, id: string) => {
  await as(viewer)
  await mutate({
    mutation: CreateComment,
    variables: { id, postId: 'post', content: `Comment ${id}` },
  })
}

const thread = async (viewer: Viewer) => {
  await as(viewer)
  const result = await query({ query: threadQuery })

  expect(result.errors).toBeUndefined()

  // By id: comments written within the same millisecond have no order to assert.
  return (result.data as Thread).Post.map((post) => ({
    ...post,
    comments: [...post.comments].sort((a, b) => a.id.localeCompare(b.id)),
  }))
}

const departures = [
  {
    name: 'leaves the group',
    depart: async () => {
      await as(author)
      await mutate({ mutation: LeaveGroup, variables: { groupId: 'group', userId: 'author' } })
    },
  },
  {
    name: 'is removed from the group',
    depart: async () => {
      await as(owner)
      await mutate({
        mutation: RemoveUserFromGroup,
        variables: { groupId: 'group', userId: 'author' },
      })
    },
  },
]

describe.each(['public', 'closed', 'hidden'])('a post in a %s group', (template) => {
  describe.each(departures)('when its author $name', ({ depart }) => {
    beforeEach(async () => {
      owner = await buildUser('owner')
      author = await buildUser('author')
      member = await buildUser('member')
      await as(owner)
      await mutate({
        mutation: CreateGroup,
        variables: {
          id: 'group',
          name: `A ${template} group`,
          description: `A ${template} group whose post outlives its author's membership`,
          template,
          actionRadius: 'national',
        },
      })
      await join(author, template)
      await join(member, template)
      await as(author)
      await mutate({
        mutation: CreatePost,
        variables: {
          id: 'post',
          title: 'A post in the group',
          content: 'Its content',
          groupId: 'group',
        },
      })
      await comment(author, 'by-author')
      await comment(member, 'by-member')
      await depart()
      await comment(member, 'after-departure')
    })

    afterEach(async () => {
      await cleanDatabase()
    })

    // The search used to project its own unfiltered count, which bypassed Post.commentsCount.
    it('counts in the search what the thread counts', async () => {
      await as(author)
      const result = await query({ query: searchQuery })

      expect(result.errors).toBeUndefined()
      expect((result.data as Search).searchPosts.posts).toEqual([
        { id: 'post', commentsCount: template === 'public' ? 3 : 1 },
      ])
    })

    it('still shows the author their post', async () => {
      await expect(thread(author)).resolves.toMatchObject([{ id: 'post' }])
    })

    // `deleted` and `disabled` are optional on Comment, so older data may lack them — such a
    // comment is neither, and is counted like the list shows it.
    it('counts a comment that lacks deleted and disabled', async () => {
      await database.write({
        query: `MATCH (comment:Comment { id: 'by-member' }) REMOVE comment.deleted, comment.disabled`,
      })

      await expect(thread(member)).resolves.toMatchObject([{ id: 'post', commentsCount: 3 }])
    })

    it('still shows a member every comment', async () => {
      await expect(thread(member)).resolves.toEqual([
        {
          id: 'post',
          commentsCount: 3,
          comments: [{ id: 'after-departure' }, { id: 'by-author' }, { id: 'by-member' }],
        },
      ])
    })

    if (template === 'public') {
      it("still hands the author the unread notifications of the members' comments", async () => {
        await expect(unreadCommentIds(author)).resolves.toEqual(['after-departure', 'by-member'])
      })

      it('shows the author every comment, as anyone may read them', async () => {
        await expect(thread(author)).resolves.toEqual([
          {
            id: 'post',
            commentsCount: 3,
            comments: [{ id: 'after-departure' }, { id: 'by-author' }, { id: 'by-member' }],
          },
        ])
      })
    } else {
      it('shows the author only their own comment, and counts only that', async () => {
        await expect(thread(author)).resolves.toEqual([
          { id: 'post', commentsCount: 1, comments: [{ id: 'by-author' }] },
        ])
      })

      // The author observes their post, so the member's comment from before the departure was
      // notified to them. The notification carries the comment: it must not outlive the access.
      it("hands the author no unread notification of the members' comments", async () => {
        await expect(unreadCommentIds(author)).resolves.toEqual([])
      })

      it("exports the author's own comment but not the members'", async () => {
        await as(author)
        const result = await query({ query: userData, variables: { id: 'author' } })

        expect(result.errors).toBeUndefined()
        expect((result.data as Export).userData.posts).toEqual([
          expect.objectContaining({
            id: 'post',
            comments: [expect.objectContaining({ id: 'by-author' })],
          }),
        ])
      })
    }
  })
})
