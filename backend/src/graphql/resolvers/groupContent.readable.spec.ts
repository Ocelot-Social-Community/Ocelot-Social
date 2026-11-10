import { parse } from 'graphql'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CreateComment from '@graphql/queries/comments/CreateComment.gql'
import ChangeGroupMemberRole from '@graphql/queries/groups/ChangeGroupMemberRole.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import LeaveGroup from '@graphql/queries/groups/LeaveGroup.gql'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// The content of a closed or hidden group stays inside it — on every way to it, not only the
// Post query. The Comment query listed every comment of every group to anyone, visitors
// included, with the title of its post; a profile's contributions, comments and shouts, a
// tag's and a category's posts did the same. Each is asked here as a visitor, as a stranger
// and as a member, next to a public group whose content everybody reads.

let authenticatedUser: Context['user']
// Categories are switched on after the posts exist: creating a post would otherwise require one.
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

interface Viewer {
  toJson: () => Promise<Context['user']>
}
const viewers = new Map<string, Viewer>()

const TEMPLATES = ['public', 'closed', 'hidden'] as const

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

const as = async (name: string | null) => {
  const viewer = name ? viewers.get(name) : undefined
  authenticatedUser = viewer ? await viewer.toJson() : null
}

const join = async (name: string, template: string) => {
  await as(name)
  await mutate({ mutation: JoinGroup, variables: { groupId: template, userId: name } })
  if (template !== 'public') {
    await as('owner')
    await mutate({
      mutation: ChangeGroupMemberRole,
      variables: { groupId: template, userId: name, roleInGroup: 'usual' },
    })
  }
}

const run = async (cypher: string) => {
  const session = database.driver.session()
  try {
    await session.writeTransaction((transaction) => transaction.run(cypher))
  } finally {
    await session.close()
  }
}

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server

  for (const name of ['owner', 'member', 'former', 'stranger']) {
    viewers.set(name, await buildUser(name))
  }
  for (const template of TEMPLATES) {
    await as('owner')
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: template,
        name: `A ${template} group`,
        description: `A ${template} group whose content is asked for on every way to it`,
        template,
        actionRadius: 'national',
      },
    })
    await join('member', template)
    await join('former', template)
    await as('owner')
    await mutate({
      mutation: CreatePost,
      variables: {
        id: `post-${template}`,
        title: `In ${template}`,
        content: 'Its content',
        groupId: template,
      },
    })
    for (const name of ['member', 'former']) {
      await as(name)
      await mutate({
        mutation: CreateComment,
        variables: { id: `${name}-${template}`, postId: `post-${template}`, content: `By ${name}` },
      })
    }
    await as('former')
    await mutate({ mutation: LeaveGroup, variables: { groupId: template, userId: 'former' } })
  }
  // Tagged, filed and shouted straight in the graph: these tests ask who may READ them.
  await run(`
    MERGE (tag:Tag { id: 'shared-tag' })
    MERGE (category:Category { id: 'shared-category', name: 'Shared', slug: 'shared', icon: 'globe' })
    WITH tag, category
    MATCH (post:Post), (owner:User { id: 'owner' })
    MERGE (post)-[:TAGGED]->(tag)
    MERGE (post)-[:CATEGORIZED]->(category)
    MERGE (owner)-[:SHOUTED]->(post)
  `)
  policy.categoriesActive = true
  // Three groups, four users, each joining, commenting and leaving through the API: well over
  // the default hook timeout on a slow runner, and nothing in it waits on anything but Neo4j.
}, 60_000)

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

const ask = async <T>(viewer: string | null, source: string): Promise<T> => {
  await as(viewer)
  const result = await query({ query: parse(source) })

  expect(result.errors).toBeUndefined()

  return result.data as T
}

const sorted = (items: { id: string }[]): string[] => items.map(({ id }) => id).sort()

const commentIds = async (viewer: string | null) =>
  sorted((await ask<{ Comment: { id: string }[] }>(viewer, '{ Comment { id } }')).Comment)

const taggedPostIds = async (viewer: string | null) =>
  sorted(
    (
      await ask<{ Tag: { taggedPosts: { id: string }[] }[] }>(
        viewer,
        '{ Tag { taggedPosts { id } } }',
      )
    ).Tag[0].taggedPosts,
  )

const categoryPostIds = async (viewer: string | null) =>
  sorted(
    (
      await ask<{ Category: { posts: { id: string }[] }[] }>(
        viewer,
        '{ Category { posts { id } } }',
      )
    ).Category[0].posts,
  )

interface Profile {
  User: {
    contributions: { id: string }[]
    shouted: { id: string }[]
  }[]
}

const profileOfOwner = async (viewer: string) => {
  const { User } = await ask<Profile>(
    viewer,
    '{ User(id: "owner") { contributions { id } shouted { id } } }',
  )
  return { contributions: sorted(User[0].contributions), shouted: sorted(User[0].shouted) }
}

const commentsOfMember = async (viewer: string) =>
  sorted(
    (
      await ask<{ User: { comments: { id: string }[] }[] }>(
        viewer,
        '{ User(id: "member") { comments { id } } }',
      )
    ).User[0].comments,
  )

const everyPost = ['post-closed', 'post-hidden', 'post-public']
const publicPost = ['post-public']

describe.each([null, 'stranger'])('asked by %s', (viewer) => {
  it('lists only the comments of the public group', async () => {
    await expect(commentIds(viewer)).resolves.toEqual(['former-public', 'member-public'])
  })

  it("lists only the public group's post under a tag", async () => {
    await expect(taggedPostIds(viewer)).resolves.toEqual(publicPost)
  })

  it("lists only the public group's post in a category", async () => {
    await expect(categoryPostIds(viewer)).resolves.toEqual(publicPost)
  })
})

describe('asked by a stranger, on a profile', () => {
  it("shows only the public group's post among what the owner wrote and shouted", async () => {
    await expect(profileOfOwner('stranger')).resolves.toEqual({
      contributions: publicPost,
      shouted: publicPost,
    })
  })

  it("shows only the public group's comment among what the member wrote", async () => {
    await expect(commentsOfMember('stranger')).resolves.toEqual(['member-public'])
  })
})

describe('asked by a member of every group', () => {
  it('lists every comment', async () => {
    await expect(commentIds('member')).resolves.toEqual(
      TEMPLATES.flatMap((template) => [`former-${template}`, `member-${template}`]).sort(),
    )
  })

  it('lists every post under a tag and in a category', async () => {
    await expect(taggedPostIds('member')).resolves.toEqual(everyPost)
    await expect(categoryPostIds('member')).resolves.toEqual(everyPost)
  })

  it('shows everything on a profile', async () => {
    await expect(profileOfOwner('member')).resolves.toEqual({
      contributions: everyPost,
      shouted: everyPost,
    })
    await expect(commentsOfMember('member')).resolves.toEqual([
      'member-closed',
      'member-hidden',
      'member-public',
    ])
  })
})

describe('asked by a former member', () => {
  it('lists their own comments in the groups they left, and nobody else’s', async () => {
    await expect(commentIds('former')).resolves.toEqual([
      'former-closed',
      'former-hidden',
      'former-public',
      'member-public',
    ])
  })

  it('does not lead from their own comment to the post of a group they left', async () => {
    const { Comment } = await ask<{ Comment: { id: string; post: { id: string } | null }[] }>(
      'former',
      '{ Comment(id: "former-closed") { id post { id } } }',
    )

    expect(Comment).toEqual([{ id: 'former-closed', post: null }])
  })

  it('still leads from their comment in a public group to its post', async () => {
    const { Comment } = await ask<{ Comment: { id: string; post: { id: string } | null }[] }>(
      'former',
      '{ Comment(id: "former-public") { id post { id } } }',
    )

    expect(Comment).toEqual([{ id: 'former-public', post: { id: 'post-public' } }])
  })
})
