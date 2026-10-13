/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parse } from 'graphql'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import elevateInGroup from '@graphql/queries/groups/elevateInGroup.gql'
import fileReport from '@graphql/queries/moderation/fileReport.gql'
import Post from '@graphql/queries/posts/Post.gql'
import profilePagePosts from '@graphql/queries/posts/profilePagePosts.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'
import type { RoleDefinition } from '@src/role'

// Reading into a group nobody invited you into is an intervention, not a side effect of holding a
// network right (#10506).
//
// A network admin holds `group.content.read.any_hidden`, a moderator `…any_closed`. Those rights
// used to open every group of their type in every list: the admin's start page carried the posts
// of hidden groups they had never opened. Now the content follows an elevation in that very
// group, and only where the request names it — the group page, one post, the report queue.
//
// Against a real database: the elevation edge, the post filter and the queue all take part.

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
let rolesOverride: RoleDefinition[] | undefined
const context = () => ({ authenticatedUser, policy, roles: rolesOverride })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const reportsWithGroup = parse(`
  query {
    reports {
      resourceHidden
      group {
        id
        slug
      }
      resource {
        __typename
        ... on Post {
          id
          title
        }
      }
    }
  }
`)

beforeAll(async () => {
  await cleanDatabase()
  const setup = await createApolloTestSetup({ context })
  mutate = setup.mutate
  query = setup.query
  database = setup.database
  server = setup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

let owner
let networkAdmin

const putInGroup = async (postId: string, groupId: string): Promise<void> => {
  await database.write({
    query: `MATCH (post:Post {id: $postId}), (group:Group {id: $groupId})
            MERGE (post)-[:IN]->(group)`,
    variables: { postId, groupId },
  })
}

// Network rights the way a role carries them; the viewer is a stranger to every group.
const asNetworkAdmin = async (...permissions: PermissionKey[]) => {
  rolesOverride = [{ name: 'user', protected: false, permissions }]
  authenticatedUser = await networkAdmin.toJson()
}

const elevate = async (groupId: string) => {
  const { errors } = await mutate({
    mutation: elevateInGroup,
    variables: { groupId, reason: 'Looking at a report' },
  })

  expect(errors?.[0]?.message).toBeUndefined()
}

const feed = async (): Promise<string[]> => {
  const { data, errors } = await query({ query: Post, variables: {} })

  expect(errors?.[0]?.message).toBeUndefined()

  return ((data?.Post ?? []) as { id: string }[]).map((post) => post.id).sort()
}

const groupPage = async (groupId: string): Promise<string[]> => {
  const { data, errors } = await query({
    query: profilePagePosts,
    variables: { filter: { group: { id: groupId } } },
  })

  expect(errors?.[0]?.message).toBeUndefined()

  return ((data?.profilePagePosts ?? []) as { id: string }[]).map((post) => post.id)
}

const singlePost = async (id: string): Promise<string[]> => {
  const { data, errors } = await query({ query: Post, variables: { id } })

  expect(errors?.[0]?.message).toBeUndefined()

  return ((data?.Post ?? []) as { id: string }[]).map((post) => post.id)
}

beforeEach(async () => {
  await cleanDatabase()
  rolesOverride = undefined
  owner = await Factory.build(
    'user',
    { id: 'group-owner', name: 'Group Owner' },
    { email: 'group-owner@example.org', password: '1234' },
  )
  networkAdmin = await Factory.build(
    'user',
    { id: 'network-admin', name: 'Network Admin' },
    { email: 'network-admin@example.org', password: '1234' },
  )
  await Factory.build('group', { id: 'hidden-group', template: 'hidden' }, { owner })
  await Factory.build('group', { id: 'closed-group', template: 'closed' }, { owner })
  await Factory.build(
    'post',
    { id: 'hidden-post', title: 'In the hidden group' },
    { author: owner },
  )
  await Factory.build(
    'post',
    { id: 'closed-post', title: 'In the closed group' },
    { author: owner },
  )
  await Factory.build('post', { id: 'public-post', title: 'In no group' }, { author: owner })
  await putInGroup('hidden-post', 'hidden-group')
  await putInGroup('closed-post', 'closed-group')
})

describe('a network admin who has not elevated', () => {
  beforeEach(async () => {
    await asNetworkAdmin('group.content.read.any_hidden', 'group.content.read.any_closed')
  })

  it('sees no hidden or closed group content in the feed', async () => {
    expect(await feed()).toEqual(['public-post'])
  })

  it('sees nothing on the group page', async () => {
    expect(await groupPage('hidden-group')).toEqual([])
    expect(await groupPage('closed-group')).toEqual([])
  })

  it('does not get the post when asking for it by id', async () => {
    expect(await singlePost('hidden-post')).toEqual([])
  })
})

describe('a network admin who elevated in one group', () => {
  beforeEach(async () => {
    await asNetworkAdmin('group.content.read.any_hidden', 'group.content.read.any_closed')
    await elevate('hidden-group')
  })

  it('reads that group on its page', async () => {
    expect(await groupPage('hidden-group')).toEqual(['hidden-post'])
  })

  it('reads one of its posts by id', async () => {
    expect(await singlePost('hidden-post')).toEqual(['hidden-post'])
  })

  it('still sees none of it in the feed', async () => {
    // An elevation is asked for to look inside one group, not subscribed to.
    expect(await feed()).toEqual(['public-post'])
  })

  it('reads no other group with it', async () => {
    expect(await groupPage('closed-group')).toEqual([])
    expect(await singlePost('closed-post')).toEqual([])
  })

  it('loses it again once the elevation has run out', async () => {
    await database.write({
      query: `MATCH (:User {id: 'network-admin'})-[e:ELEVATED_IN]->(:Group {id: 'hidden-group'})
              SET e.expiresAt = datetime() - duration('PT1M')`,
    })

    expect(await groupPage('hidden-group')).toEqual([])
    expect(await singlePost('hidden-post')).toEqual([])
  })

  it('loses it when the right is withdrawn while the elevation runs', async () => {
    rolesOverride = [{ name: 'user', protected: false, permissions: [] }]

    expect(await groupPage('hidden-group')).toEqual([])
  })
})

describe('the report queue, for a moderator who may read into the group', () => {
  beforeEach(async () => {
    // A member reports: the author may not report their own post.
    const member = await Factory.build(
      'user',
      { id: 'group-member', name: 'Group Member' },
      { email: 'group-member@example.org', password: '1234' },
    )
    await database.write({
      query: `MATCH (user:User {id: 'group-member'}), (group:Group {id: 'hidden-group'})
              MERGE (user)-[m:MEMBER_OF]->(group)
              SET m.role = 'usual', m.createdAt = toString(datetime())`,
    })
    authenticatedUser = await member.toJson()
    const { errors } = await mutate({
      mutation: fileReport,
      variables: {
        resourceId: 'hidden-post',
        reasonCategory: 'other',
        reasonDescription: 'Something is wrong with it',
      },
    })
    if (errors) {
      throw new Error(errors[0].message)
    }
    await asNetworkAdmin('content.moderate', 'group.content.read.any_hidden')
  })

  const queue = async () => {
    const { data, errors } = await query({ query: reportsWithGroup })

    expect(errors?.[0]?.message).toBeUndefined()

    return data?.reports as {
      resourceHidden: boolean
      group: { id: string } | null
      resource: { title: string | null }
    }[]
  }

  it('masks the content until they elevated, and says where to do so', async () => {
    const [report] = await queue()

    expect(report).toMatchObject({
      resourceHidden: true,
      group: { id: 'hidden-group' },
      resource: { title: '' },
    })
  })

  it('shows the content once they elevated in that group', async () => {
    await elevate('hidden-group')
    const [report] = await queue()

    expect(report).toMatchObject({
      resourceHidden: false,
      group: { id: 'hidden-group' },
      resource: { title: 'In the hidden group' },
    })
  })
})
