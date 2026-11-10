/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { beforeAll, afterAll, afterEach, beforeEach, describe, it, expect } from 'vitest'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const sendNotificationMailMock: (notification) => void = vi.fn()
vi.mock('@src/emails/sendEmail', () => ({
  sendNotificationMail: (notification) => {
    sendNotificationMailMock(notification)
  },
  // ESM links the whole namespace: every named export any importer in the graph reaches for
  // must exist here (see notificationsMiddleware.observing-posts.spec.ts).
  defaultParams: vi.fn(),
  sendChatMessageMail: vi.fn(),
  sendRegistrationMail: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendResetPasswordMail: vi.fn(),
  sendWrongEmail: vi.fn(),
}))

const { default: Factory, cleanDatabase } = await import('@db/factories')
const { default: pubsubContext } = await import('@context/pubsub')
const { default: CreateComment } = await import('@graphql/queries/comments/CreateComment.gql')
const { default: ChangeGroupMemberRole } =
  await import('@graphql/queries/groups/ChangeGroupMemberRole.gql')
const { default: CreateGroup } = await import('@graphql/queries/groups/CreateGroup.gql')
const { default: JoinGroup } = await import('@graphql/queries/groups/JoinGroup.gql')
const { default: LeaveGroup } = await import('@graphql/queries/groups/LeaveGroup.gql')
const { default: RemoveUserFromGroup } =
  await import('@graphql/queries/groups/RemoveUserFromGroup.gql')
const { default: CreatePost } = await import('@graphql/queries/posts/CreatePost.gql')
const { createApolloTestSetup } = await import('@root/test/helpers')

const pubsub = pubsubContext()
const pubsubSpy = vi.spyOn(pubsub, 'publish')

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy, pubsub })
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

let owner, former, member
// Taken in the hook right after the comment: Vitest clears mock calls before every test.
let published: string[], mailed: string[]

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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

// Typed as unknown on purpose: the factory is untyped, and the callers keep the node as `any`.
const buildUser = async (id: string): Promise<unknown> => {
  const user: unknown = await Factory.build(
    'user',
    { id, name: id, slug: id },
    { email: `${id}@example.org`, password: '1234' },
  )
  return user
}

const join = async (user, groupId: string, template: string) => {
  authenticatedUser = await user.toJson()
  const userId = authenticatedUser?.id
  await mutate({ mutation: JoinGroup, variables: { groupId, userId } })
  if (template !== 'public') {
    // A closed or hidden group admits on request: the owner lets the member in.
    authenticatedUser = await owner.toJson()
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId, userId, roleInGroup: 'usual' },
    })
  }
}

const comment = async (user, id: string) => {
  authenticatedUser = await user.toJson()
  await mutate({
    mutation: CreateComment,
    variables: { id, postId: 'post', content: `A comment by ${authenticatedUser?.id ?? ''}` },
  })
}

/** Who the comment `commentId` put a `commented_on_post` edge on. */
const notifiedIds = async (commentId: string): Promise<string[]> => {
  // Asked of the graph: the notifications query hides what the recipient cannot read, so it
  // would report nothing even if the edge had been written.
  const session = database.driver.session()
  try {
    const { records } = await session.readTransaction((transaction) =>
      transaction.run(
        `MATCH (:Comment { id: $commentId })-[:NOTIFIED { reason: 'commented_on_post' }]->(user:User)
         RETURN user.id AS id ORDER BY id`,
        { commentId },
      ),
    )
    return records.map((record) => record.get('id') as string)
  } finally {
    await session.close()
  }
}

const publishedTo = (): string[] =>
  pubsubSpy.mock.calls
    .filter(([trigger]) => trigger === 'NOTIFICATION_ADDED')
    .map(
      ([, payload]) =>
        (payload as { notificationAdded: { to: { id: string } } }).notificationAdded.to.id,
    )

const mailedTo = (): string[] =>
  vi
    .mocked(sendNotificationMailMock)
    .mock.calls.map(([notification]) => (notification as { to: { id: string } }).to.id)

// #10629: commenting on a post makes you observe it, and observing outlived the membership. A
// former member of a closed or hidden group was still told of every new comment there — the
// edge, the live push with the comment in it, and the mail with the post's title.
describe('observers of a post in a group', () => {
  const departures = [
    {
      name: 'leaves the group',
      depart: async (groupId: string) => {
        authenticatedUser = await former.toJson()
        await mutate({ mutation: LeaveGroup, variables: { groupId, userId: 'former' } })
      },
    },
    {
      name: 'is removed from the group',
      depart: async (groupId: string) => {
        authenticatedUser = await owner.toJson()
        await mutate({ mutation: RemoveUserFromGroup, variables: { groupId, userId: 'former' } })
      },
    },
  ]

  describe.each(['public', 'closed', 'hidden'])('in a %s group', (template) => {
    describe.each(departures)('when an observer $name', ({ depart }) => {
      beforeEach(async () => {
        owner = await buildUser('owner')
        former = await buildUser('former')
        member = await buildUser('member')
        authenticatedUser = await owner.toJson()
        await mutate({
          mutation: CreateGroup,
          variables: {
            id: 'group',
            name: `A ${template} group`,
            description: `A ${template} group whose former members observed a post`,
            template,
            actionRadius: 'national',
          },
        })
        await join(former, 'group', template)
        await join(member, 'group', template)
        authenticatedUser = await owner.toJson()
        await mutate({
          mutation: CreatePost,
          variables: {
            id: 'post',
            title: 'A post in the group',
            content: 'Its content',
            groupId: 'group',
          },
        })
        // Commenting makes the former member an observer of the post.
        await comment(former, 'by-former')
        await depart('group')
        vi.clearAllMocks()
        await comment(member, 'after-departure')
        published = publishedTo()
        mailed = mailedTo()
      })

      afterEach(async () => {
        await cleanDatabase()
      })

      it('still notifies the author, who is a member', async () => {
        await expect(notifiedIds('after-departure')).resolves.toContain('owner')
        expect(published).toContain('owner')
      })

      if (template === 'public') {
        // Everyone may read a public group's posts — leaving it takes nothing away.
        it('still notifies the former member', async () => {
          await expect(notifiedIds('after-departure')).resolves.toContain('former')
          expect(published).toContain('former')
        })
      } else {
        it('writes no notification for the former member', async () => {
          await expect(notifiedIds('after-departure')).resolves.not.toContain('former')
        })

        it('pushes nothing to the former member', () => {
          expect(published).not.toContain('former')
        })

        it('mails nothing to the former member', () => {
          expect(mailed).not.toContain('former')
        })
      }
    })
  })
})
