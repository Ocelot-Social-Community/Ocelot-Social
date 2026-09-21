import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { up } from './migrations/20260916120000-remove-notifications-about-invisible-posts'

const noop = () => undefined

const run = async (query: string, params: Record<string, unknown> = {}) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((tx) => tx.run(query, params))
  } finally {
    await session.close()
  }
}

/** Who still holds a notification about the given resource, after the migration ran. */
const recipientsOf = async (resourceId: string): Promise<string[]> => {
  const result = await run(
    `MATCH ({ id: $resourceId })-[:NOTIFIED]->(user:User) RETURN user.id AS id ORDER BY id`,
    { resourceId },
  )
  return result.records.map((record) => record.get('id') as string)
}

// The graph the live bug produced, in miniature. One author, one post per group type, and a set
// of readers that differ ONLY in their relationship to the group — so every assertion below
// isolates the membership rule and nothing else.
//
// Raw Cypher rather than the factories: the notifications being tested are ones no mutation
// writes any more, which is the whole point of a cleanup migration. Building them through the
// API would first require re-introducing the defect.
describe('migration: remove-notifications-about-invisible-posts', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await run(`
      CREATE (author:User {id: 'author', slug: 'author', deleted: false})
      CREATE (member:User {id: 'member', slug: 'member', deleted: false})
      CREATE (pending:User {id: 'pending', slug: 'pending', deleted: false})
      CREATE (outsider:User {id: 'outsider', slug: 'outsider', deleted: false})

      CREATE (hidden:Group {id: 'hidden-group', slug: 'hidden-group', groupType: 'hidden'})
      CREATE (open:Group {id: 'public-group', slug: 'public-group', groupType: 'public'})

      CREATE (member)-[:MEMBER_OF {role: 'usual'}]->(hidden)
      CREATE (pending)-[:MEMBER_OF {role: 'pending'}]->(hidden)

      CREATE (hiddenPost:Post {id: 'hidden-post', deleted: false, disabled: false})
      CREATE (publicPost:Post {id: 'public-post', deleted: false, disabled: false})
      CREATE (timelinePost:Post {id: 'timeline-post', deleted: false, disabled: false})
      CREATE (hiddenPost)-[:IN]->(hidden)
      CREATE (publicPost)-[:IN]->(open)

      CREATE (comment:Comment {id: 'hidden-comment', deleted: false, disabled: false})
      CREATE (comment)-[:COMMENTS]->(hiddenPost)

      CREATE (hiddenPost)-[:NOTIFIED {reason: 'followed_user_posted', read: false}]->(outsider)
      CREATE (hiddenPost)-[:NOTIFIED {reason: 'followed_user_posted', read: false}]->(pending)
      CREATE (hiddenPost)-[:NOTIFIED {reason: 'post_in_group', read: false}]->(member)
      CREATE (comment)-[:NOTIFIED {reason: 'commented_on_post', read: false}]->(outsider)
      CREATE (comment)-[:NOTIFIED {reason: 'commented_on_post', read: false}]->(member)
      CREATE (publicPost)-[:NOTIFIED {reason: 'followed_user_posted', read: false}]->(outsider)
      CREATE (timelinePost)-[:NOTIFIED {reason: 'followed_user_posted', read: false}]->(outsider)
      CREATE (hidden)-[:NOTIFIED {reason: 'user_joined_group', read: false}]->(member)
    `)
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  it('deletes the notification about a hidden-group post for a non-member', async () => {
    await up(noop)

    expect(await recipientsOf('hidden-post')).not.toContain('outsider')
  })

  it('deletes it for a PENDING member, who cannot open the post either', async () => {
    // `post_in_group` excludes a pending role when it writes, so the cleanup has to exclude it
    // when it deletes. Treating any MEMBER_OF edge as membership would strand this one.
    await up(noop)

    expect(await recipientsOf('hidden-post')).not.toContain('pending')
  })

  it('keeps it for an active member', async () => {
    await up(noop)

    expect(await recipientsOf('hidden-post')).toEqual(['member'])
  })

  it('deletes a notification about a COMMENT on a hidden-group post', async () => {
    // A comment carries no group of its own. Reached through `:COMMENTS`, because it is exactly
    // as unreachable as the post it hangs off.
    await up(noop)

    expect(await recipientsOf('hidden-comment')).toEqual(['member'])
  })

  it('keeps notifications about a post in a public group', async () => {
    await up(noop)

    expect(await recipientsOf('public-post')).toEqual(['outsider'])
  })

  it('keeps notifications about a post in no group at all', async () => {
    // The overwhelming majority of notifications on any instance. A cleanup that took these
    // would empty every bell in the network.
    await up(noop)

    expect(await recipientsOf('timeline-post')).toEqual(['outsider'])
  })

  it('leaves notifications attached to a Group node alone', async () => {
    // `user_joined_group` and friends point at the Group, not at a post. The label guard in the
    // match is what keeps `coalesce(commentedOn, resource)` from reading a Group as one.
    await up(noop)

    expect(await recipientsOf('hidden-group')).toEqual(['member'])
  })

  it('is idempotent', async () => {
    await up(noop)
    const afterFirst = await recipientsOf('hidden-post')

    await up(noop)

    expect(await recipientsOf('hidden-post')).toEqual(afterFirst)
  })
})
