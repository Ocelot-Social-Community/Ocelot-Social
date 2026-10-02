/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import ChangeGroupMemberRole from '@graphql/queries/groups/ChangeGroupMemberRole.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import elevateInGroup from '@graphql/queries/groups/elevateInGroup.gql'
import GroupPosts from '@graphql/queries/groups/GroupPosts.gql'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import removePostFromGroup from '@graphql/queries/groups/removePostFromGroup.gql'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

const DESCRIPTION = 'A group description that is long enough to satisfy the validation. '.repeat(3)

let owner
let member
let outsider
let moderator
let authenticatedUser: Context['user']
let rolesOverride: RoleDefinition[] | undefined
const context = () => ({ authenticatedUser, rolesOverride })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

// The moderator role, plus the right to moderate inside closed groups one is not a member of.
// Spelled out here rather than taken from the defaults so the test states what it relies on.
const MODERATOR_WITH_GROUP_RIGHTS: RoleDefinition[] = [
  { name: 'owner', protected: true, permissions: [] },
  {
    name: 'user',
    protected: false,
    permissions: ['post.create', 'comment.create', 'group.create_public', 'group.create_closed'],
  },
  {
    name: 'moderator',
    protected: false,
    permissions: [
      'post.create',
      'comment.create',
      'group.create_public',
      'group.create_closed',
      'content.moderate',
      'group.content.read.any_closed',
      'group.moderate.any_closed',
    ],
  },
]

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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
  await cleanDatabase()
  rolesOverride = undefined
  owner = await Factory.build(
    'user',
    { id: 'group-owner', name: 'Group Owner' },
    { email: 'group-owner@example.org', password: '1234' },
  )
  member = await Factory.build(
    'user',
    { id: 'group-member', name: 'Group Member' },
    { email: 'group-member@example.org', password: '1234' },
  )
  outsider = await Factory.build(
    'user',
    { id: 'outsider', name: 'Outsider' },
    { email: 'outsider@example.org', password: '1234' },
  )
  moderator = await Factory.build(
    'user',
    { id: 'network-moderator', name: 'Network Moderator', role: 'moderator' },
    { email: 'network-moderator@example.org', password: '1234' },
  )

  authenticatedUser = await owner.toJson()
  await mutate({
    mutation: CreateGroup,
    variables: {
      id: 'closed-group',
      name: 'Closed Group',
      about: 'We are closed',
      description: DESCRIPTION,
      groupType: 'closed',
      actionRadius: 'regional',
    },
  })
  // The member asks to join and is approved, so they are a member rather than an applicant.
  authenticatedUser = await member.toJson()
  await mutate({
    mutation: JoinGroup,
    variables: { groupId: 'closed-group', userId: 'group-member' },
  })
  authenticatedUser = await owner.toJson()
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: { groupId: 'closed-group', userId: 'group-member', roleInGroup: 'usual' },
  })

  authenticatedUser = await member.toJson()
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'members-post',
      title: 'A post by the member',
      content: 'Something the member wrote',
      groupId: 'closed-group',
    },
  })
  authenticatedUser = null
})

const postsOfGroup = async (): Promise<{ posts: Array<{ id: string }>; postsCount: number }> => {
  authenticatedUser = await owner.toJson()
  const { data } = await query({ query: GroupPosts, variables: { id: 'closed-group' } })
  return data.Group[0] as { posts: Array<{ id: string }>; postsCount: number }
}

const notificationsOf = async (userId: string) => {
  const result = await database.query({
    query: `MATCH (post:Post)-[n:NOTIFIED]->(:User {id: $userId})
            RETURN n.reason AS reason, post.id AS postId`,
    variables: { userId },
  })
  return result.records.map((record) => ({
    reason: record.get('reason') as string,
    postId: record.get('postId') as string,
  }))
}

describe('removePostFromGroup', () => {
  describe('as the group owner', () => {
    beforeEach(async () => {
      authenticatedUser = await owner.toJson()
    })

    it('takes the post out of the group and leaves the post itself alone', async () => {
      const { data, errors } = await mutate({
        mutation: removePostFromGroup,
        variables: { groupId: 'closed-group', postId: 'members-post' },
      })

      expect(errors).toBeUndefined()
      // The post is returned, not deleted: it belongs to its author and keeps existing.
      expect(data.removePostFromGroup).toMatchObject({ id: 'members-post' })

      const group = await postsOfGroup()

      expect(group.posts).toEqual([])
      expect(group.postsCount).toBe(0)
    })

    it('notifies the author, so a removal is never silent', async () => {
      await mutate({
        mutation: removePostFromGroup,
        variables: { groupId: 'closed-group', postId: 'members-post' },
      })

      expect(await notificationsOf('group-member')).toEqual(
        expect.arrayContaining([{ reason: 'post_removed_from_group', postId: 'members-post' }]),
      )
    })

    it('refuses a post that is not in that group', async () => {
      const { errors } = await mutate({
        mutation: removePostFromGroup,
        variables: { groupId: 'closed-group', postId: 'does-not-exist' },
      })

      expect(errors?.[0].message).toMatch(/not in this group/i)
    })
  })

  describe('as an ordinary member', () => {
    it('is refused: moderating is an admin right, not a membership one', async () => {
      authenticatedUser = await member.toJson()

      const { errors } = await mutate({
        mutation: removePostFromGroup,
        variables: { groupId: 'closed-group', postId: 'members-post' },
      })

      expect(errors?.[0].message).toBe('Not Authorized!')
      expect((await postsOfGroup()).posts).toHaveLength(1)
    })
  })

  describe('as somebody who is not in the group', () => {
    it('is refused without a network right', async () => {
      authenticatedUser = await outsider.toJson()

      const { errors } = await mutate({
        mutation: removePostFromGroup,
        variables: { groupId: 'closed-group', postId: 'members-post' },
      })

      expect(errors?.[0].message).toBe('Not Authorized!')
      expect((await postsOfGroup()).posts).toHaveLength(1)
    })

    it('refuses a network moderator who has not picked their rights up yet', async () => {
      // Holding `group.moderate.any_closed` lets them READ what the report points at; taking
      // the post out is an act, and acts wait for the ask (groupRole/elevation.ts).
      rolesOverride = MODERATOR_WITH_GROUP_RIGHTS
      authenticatedUser = await moderator.toJson()

      const { errors } = await mutate({
        mutation: removePostFromGroup,
        variables: { groupId: 'closed-group', postId: 'members-post' },
      })

      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      expect((await postsOfGroup()).posts).toHaveLength(1)
    })

    it('works for a network moderator who picked them up', async () => {
      // The network authority folded into the group scope: no membership, and still able to
      // moderate what a report pointed them at — once they said they are doing it.
      rolesOverride = MODERATOR_WITH_GROUP_RIGHTS
      authenticatedUser = await moderator.toJson()

      await mutate({
        mutation: elevateInGroup,
        variables: { groupId: 'closed-group', reason: 'Reviewing a report' },
      })

      const { errors } = await mutate({
        mutation: removePostFromGroup,
        variables: { groupId: 'closed-group', postId: 'members-post' },
      })

      expect(errors).toBeUndefined()
      expect((await postsOfGroup()).posts).toEqual([])
    })
  })
})
