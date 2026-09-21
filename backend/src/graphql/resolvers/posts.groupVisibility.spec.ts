import { parse } from 'graphql'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import SignupVerification from '@graphql/queries/auth/SignupVerification.gql'
import ChangeGroupMemberRole from '@graphql/queries/groups/ChangeGroupMemberRole.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import LeaveGroup from '@graphql/queries/groups/LeaveGroup.gql'
import RemoveUserFromGroup from '@graphql/queries/groups/RemoveUserFromGroup.gql'
import UpdateGroup from '@graphql/queries/groups/UpdateGroup.gql'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { DocumentNode } from 'graphql'

// Characterisation of the CANNOT_SEE model — the materialised negative ACL that decides
// which posts in non-public groups a viewer may see.
//
// posts.inGroups.spec.ts already covers the STATIC matrix (anonymous / new / non-member /
// pending / member × public / closed / hidden). What it does not pin down is the part that
// makes CANNOT_SEE hard to reason about: the edges are written by five different mutations
// (registration.ts:97, posts.ts:285, groups.ts:352/365, groups.ts:449/455, groups.ts:858),
// and those five do NOT agree with each other. The stored state is therefore a function of
// the mutation HISTORY, not of the current graph — two users with identical memberships can
// have different visibility depending on how they got there.
//
// Two things are tested here:
//
//   1. Every membership-losing transition, separately for a viewer who AUTHORED the post and
//      one who did not. posts.inGroups.spec.ts cannot distinguish the two: its `allGroupsUser`
//      wrote all three group posts itself, so its "usual member leaves … stil shows the posts"
//      (line 1729) in fact only exercises the author exception, under a name that reads like a
//      general statement about leaving a group.
//
//   2. `restrictionDrift()` — the stored CANNOT_SEE edges diffed against what the group graph
//      alone implies. That is the invariant a derived rule would satisfy by construction, so
//      it is the measurement that says how far the materialised copy has moved away from it.
//
// TARGET SEMANTICS (decided, not yet implemented): visibility follows active group membership,
// with one exception — you always keep seeing a post you wrote yourself. `restrictionDrift()`
// encodes that target. Where the current implementation deviates, the test asserts the
// deviation EXPLICITLY rather than skipping it, so the eventual switch to a derived rule
// breaks exactly at the assertions that describe the intended behaviour change.

const ACTIVE_ROLES = ['usual', 'admin', 'owner']

let authenticatedUser: Context['user']
const policy = { categoriesActive: false }
const context = () => ({ authenticatedUser, policy })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const postIdsQuery = parse(`
  query {
    Post(orderBy: [createdAt_asc]) {
      id
    }
  }
`)

const description = 'A group for the visibility characterisation suite. ' + '-'.repeat(60)

// `rosie` ships no type declarations and there is no @types/rosie, so the default export of
// @db/factories resolves to an unresolved type and every call through it is an unsafe-call.
// The other suites blanket-disable the no-unsafe-* rules for the whole file; narrowing the two
// calls this suite makes keeps the rules active for everything else, where they still catch
// real mistakes. Replace with a shared ambient declaration if rosie ever gets typed centrally.
interface FactoryApi {
  build: (name: string, attributes: Record<string, unknown>) => Promise<unknown>
}
const factory = Factory as unknown as FactoryApi

/**
 * Runs a mutation and fails loudly on a GraphQL error.
 *
 * Every mutation here is fixture setup, and a silently rejected one (a shield rule that does
 * not apply, a renamed argument) would leave the graph in a state that still satisfies most
 * assertions below — a passing test measuring nothing.
 */
const expectMutation = async (mutation: DocumentNode, variables: Record<string, unknown>) => {
  const { errors } = await mutate({ mutation, variables })
  if (errors) {
    throw new Error(`Setup mutation failed: ${JSON.stringify(errors)}`)
  }
}

/** Builds a user node and returns it in the shape the test context expects as viewer. */
const buildUser = async (id: string, name: string): Promise<Context['user']> => {
  const built = (await factory.build('user', { id, name })) as {
    toJson: () => Promise<Context['user']>
  }
  return built.toJson()
}

/** Ids of the posts `viewer` gets served, sorted so assertions do not depend on paging order. */
const visiblePostIds = async (viewer: Context['user']): Promise<string[]> => {
  const previous = authenticatedUser
  authenticatedUser = viewer
  try {
    const result = await query({ query: postIdsQuery })

    expect(result.errors).toBeUndefined()

    const posts = (result.data as { Post?: { id: string }[] } | null)?.Post ?? []

    return posts.map((post) => post.id).sort()
  } finally {
    authenticatedUser = previous
  }
}

interface Drift {
  /** Pairs the group graph says must be restricted, but which carry no CANNOT_SEE edge. */
  missing: string[]
  /** CANNOT_SEE edges the group graph does not justify. */
  extra: string[]
}

/**
 * Diffs the stored CANNOT_SEE edges against the target semantics.
 *
 * `missing` is the direction that leaks: a post the viewer should not be served, that no edge
 * hides. `extra` is over-restriction: an edge that survives a membership the graph now grants,
 * or that the author exception should never have produced.
 *
 * Both are reported as `"<userId> → <postId>"` so a failure names the offending pair instead
 * of printing a count.
 */
const restrictionDrift = async (): Promise<Drift> => {
  const expected = await database.query({
    query: `
      MATCH (post:Post)-[:IN]->(group:Group)
        WHERE group.groupType <> 'public'
      MATCH (user:User)
        WHERE NOT EXISTS {
                MATCH (group)<-[membership:MEMBER_OF]-(user)
                WHERE membership.role IN $activeRoles
              }
          AND NOT EXISTS { MATCH (post)<-[:WROTE]-(user) }
      RETURN user.id + ' → ' + post.id AS pair
    `,
    variables: { activeRoles: ACTIVE_ROLES },
  })
  const actual = await database.query({
    query: `
      MATCH (user:User)-[:CANNOT_SEE]->(post:Post)
      RETURN user.id + ' → ' + post.id AS pair
    `,
    variables: {},
  })

  const expectedPairs = new Set(expected.records.map((record) => record.get('pair') as string))
  const actualPairs = new Set(actual.records.map((record) => record.get('pair') as string))

  return {
    missing: [...expectedPairs].filter((pair) => !actualPairs.has(pair)).sort(),
    extra: [...actualPairs].filter((pair) => !expectedPairs.has(pair)).sort(),
  }
}

const noDrift: Drift = { missing: [], extra: [] }

let owner: Context['user']
let author: Context['user']
let member: Context['user']
let outsider: Context['user']

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

/**
 * The starting graph every scenario begins from: three groups, one of each type, each holding
 * a post by `author` and one by `member`, plus a post in no group at all.
 */
const setupFixture = async () => {
  ;[owner, author, member, outsider] = await Promise.all([
    buildUser('gv-owner', 'Group Owner'),
    buildUser('gv-author', 'Post Author'),
    buildUser('gv-member', 'Plain Member'),
    buildUser('gv-outsider', 'Outsider'),
  ])

  authenticatedUser = owner
  for (const groupType of ['public', 'closed', 'hidden']) {
    const id = `gv-${groupType}`
    await expectMutation(CreateGroup, {
      id,
      name: `The ${groupType} group`,
      about: `The ${groupType} group`,
      description,
      groupType,
      actionRadius: 'regional',
      categoryIds: null,
    })
    for (const userId of ['gv-author', 'gv-member']) {
      await expectMutation(ChangeGroupMemberRole, { groupId: id, userId, roleInGroup: 'usual' })
    }
  }

  // Each group holds one post by `author` and one by `member`, so every scenario can ask the
  // author question and the non-author question about the same transition.
  for (const [viewer, suffix] of [
    [author, 'author'],
    [member, 'member'],
  ] as const) {
    authenticatedUser = viewer
    for (const groupId of ['gv-public', 'gv-closed', 'gv-hidden']) {
      await expectMutation(CreatePost, {
        id: `${groupId}-by-${suffix}`,
        title: `Post in ${groupId} by ${suffix}`,
        content: `Post in ${groupId} by ${suffix}`,
        groupId,
      })
    }
  }

  authenticatedUser = outsider
  await expectMutation(CreatePost, {
    id: 'gv-no-group',
    title: 'No group at all',
    content: 'No group at all',
  })

  authenticatedUser = null
}

/**
 * Registers the fixture plus the mutations that define one scenario.
 *
 * Every scenario below is a DIFFERENT history leading into the same starting graph, which is
 * exactly the variable under test — so each one gets its own database rather than inheriting
 * whatever the previous describe left behind. The assertions inside a scenario only ever READ,
 * which is why building once per scenario is enough; a per-test rebuild would triple the
 * runtime of this file to pin down nothing further.
 *
 * Both hooks are registered together so a scenario cannot set the graph up without tearing it
 * down again.
 */
const givenScenario = (scenario?: () => Promise<void>) => {
  beforeAll(async () => {
    await setupFixture()
    await scenario?.()
    authenticatedUser = null
  })

  afterAll(async () => {
    await cleanDatabase()
  })
}

/** What an outsider sees in the untouched fixture: the public group plus the groupless post. */
const PUBLICLY_VISIBLE = ['gv-no-group', 'gv-public-by-author', 'gv-public-by-member'].sort()
const ALL_POSTS = [
  ...PUBLICLY_VISIBLE,
  'gv-closed-by-author',
  'gv-closed-by-member',
  'gv-hidden-by-author',
  'gv-hidden-by-member',
].sort()

describe('post visibility derived from group membership', () => {
  describe('baseline', () => {
    givenScenario()

    it('serves active members everything and outsiders only the public posts', async () => {
      await expect(visiblePostIds(member)).resolves.toEqual(ALL_POSTS)
      await expect(visiblePostIds(outsider)).resolves.toEqual(PUBLICLY_VISIBLE)
    })

    it('stores exactly the CANNOT_SEE edges the group graph implies', async () => {
      await expect(restrictionDrift()).resolves.toEqual(noDrift)
    })
  })

  // groups.ts:855 — `WHERE … AND NOT author.id = $userId`. The author exception lives here
  // and only here; the two other membership-losing paths below disagree with it.
  describe.each([
    ['LeaveGroup', LeaveGroup, () => member],
    ['RemoveUserFromGroup', RemoveUserFromGroup, () => owner],
  ])('%s', (_name, mutation, actor) => {
    describe.each(['gv-closed', 'gv-hidden'])('%s group', (groupId) => {
      givenScenario(async () => {
        authenticatedUser = actor()
        await expectMutation(mutation, { groupId, userId: 'gv-member' })
      })

      it("hides the group's posts written by SOMEONE ELSE", async () => {
        await expect(visiblePostIds(member)).resolves.not.toContain(`${groupId}-by-author`)
      })

      // The behaviour posts.inGroups.spec.ts:1729 exercises without naming it.
      it('keeps the posts the departing user wrote THEMSELVES visible to them', async () => {
        await expect(visiblePostIds(member)).resolves.toContain(`${groupId}-by-member`)
      })

      it('leaves the other group untouched', async () => {
        const other = groupId === 'gv-closed' ? 'gv-hidden' : 'gv-closed'
        const visible = await visiblePostIds(member)

        expect(visible).toContain(`${other}-by-author`)
        expect(visible).toContain(`${other}-by-member`)
      })

      it('matches the group-derived truth', async () => {
        await expect(restrictionDrift()).resolves.toEqual(noDrift)
      })
    })
  })

  // groups.ts:452-455 — the same loss of membership, expressed as a role change, has NO
  // author exception: the FOREACH merges an edge for every post in the group.
  describe('ChangeGroupMemberRole to pending', () => {
    describe.each(['gv-closed', 'gv-hidden'])('%s group', (groupId) => {
      givenScenario(async () => {
        authenticatedUser = owner
        await expectMutation(ChangeGroupMemberRole, {
          groupId,
          userId: 'gv-member',
          roleInGroup: 'pending',
        })
      })

      it("hides the group's posts written by someone else", async () => {
        await expect(visiblePostIds(member)).resolves.not.toContain(`${groupId}-by-author`)
      })

      // DEVIATION from the target semantics, asserted rather than skipped.
      //
      // Losing membership through a role change hides the demoted user's OWN post; losing it
      // through LeaveGroup / RemoveUserFromGroup does not. Nothing about the two situations
      // justifies the difference — it is the absence of `NOT author.id = $userId` in
      // groups.ts:452-455. Under the author exception this assertion inverts.
      it('ALSO hides the demoted user their own post — unlike leaving the group', async () => {
        await expect(visiblePostIds(member)).resolves.not.toContain(`${groupId}-by-member`)
      })

      it('records the author-exception deviation as a surplus edge', async () => {
        await expect(restrictionDrift()).resolves.toEqual({
          missing: [],
          extra: [`gv-member → ${groupId}-by-member`],
        })
      })
    })

    describe('promoting back to usual', () => {
      givenScenario(async () => {
        authenticatedUser = owner
        await expectMutation(ChangeGroupMemberRole, {
          groupId: 'gv-closed',
          userId: 'gv-member',
          roleInGroup: 'pending',
        })
        await expectMutation(ChangeGroupMemberRole, {
          groupId: 'gv-closed',
          userId: 'gv-member',
          roleInGroup: 'usual',
        })
      })

      it('restores full visibility and leaves no stale edges behind', async () => {
        await expect(visiblePostIds(member)).resolves.toEqual(ALL_POSTS)
        await expect(restrictionDrift()).resolves.toEqual(noDrift)
      })
    })
  })

  // groups.ts:348-370. posts.inGroups / groups.spec cover public ↔ hidden; the transitions
  // BETWEEN two non-public types take the same `else` branch and were never exercised.
  describe('UpdateGroup groupType transitions', () => {
    const changeType = async (groupId: string, groupType: string) => {
      authenticatedUser = owner
      await expectMutation(UpdateGroup, { id: groupId, groupType })
      authenticatedUser = null
    }

    describe.each([
      ['closed → hidden', 'gv-closed', 'hidden'],
      ['hidden → closed', 'gv-hidden', 'closed'],
    ])('%s', (_name, groupId, groupType) => {
      givenScenario(async () => {
        await changeType(groupId, groupType)
      })

      it('keeps the posts hidden from outsiders and visible to members', async () => {
        await expect(visiblePostIds(outsider)).resolves.toEqual(PUBLICLY_VISIBLE)
        await expect(visiblePostIds(member)).resolves.toEqual(ALL_POSTS)
      })

      it('rebuilds the edges without drift', async () => {
        await expect(restrictionDrift()).resolves.toEqual(noDrift)
      })
    })

    describe('public → closed', () => {
      givenScenario(async () => {
        await changeType('gv-public', 'closed')
      })

      it('hides the now-closed posts from outsiders', async () => {
        await expect(visiblePostIds(outsider)).resolves.toEqual(['gv-no-group'])
      })

      it('keeps them visible to the members', async () => {
        await expect(visiblePostIds(member)).resolves.toEqual(ALL_POSTS)
      })

      it('matches the group-derived truth', async () => {
        await expect(restrictionDrift()).resolves.toEqual(noDrift)
      })
    })

    // Third answer to "do I keep seeing my own post". groups.ts:364 restricts every user who
    // is not an active member — the author of a post in the group included, once they left.
    describe('public → closed after the author left the group', () => {
      givenScenario(async () => {
        authenticatedUser = author
        await expectMutation(LeaveGroup, { groupId: 'gv-public', userId: 'gv-author' })
        await changeType('gv-public', 'closed')
      })

      // DEVIATION from the target semantics, asserted rather than skipped: under the author
      // exception the author keeps `gv-public-by-author` and this assertion inverts.
      it('hides the authors OWN post from them', async () => {
        await expect(visiblePostIds(author)).resolves.not.toContain('gv-public-by-author')
      })

      it('records it as a surplus edge', async () => {
        await expect(restrictionDrift()).resolves.toEqual({
          missing: [],
          extra: ['gv-author → gv-public-by-author'],
        })
      })
    })
  })

  // Users created after the fact. Both paths below produce a user with no membership anywhere;
  // only one of them ends up restricted, because only one of them runs the backfill.
  describe('users created after the posts exist', () => {
    let latecomer: Context['user']

    describe('registered through SignupVerification', () => {
      givenScenario(async () => {
        await factory.build('emailAddress', {
          email: 'gv-newcomer@example.org',
          nonce: '12345',
          verifiedAt: null,
        })
        const result = await mutate({
          mutation: SignupVerification,
          variables: {
            name: 'Newcomer',
            slug: 'gv-newcomer',
            nonce: '12345',
            password: '1234',
            email: 'gv-newcomer@example.org',
            termsAndConditionsAgreedVersion: '0.0.1',
          },
        })
        if (result.errors) {
          throw new Error(`Signup failed: ${JSON.stringify(result.errors)}`)
        }
        latecomer = (result.data as { SignupVerification: Context['user'] }).SignupVerification
      })

      it('is restricted to the public posts by the registration backfill', async () => {
        await expect(visiblePostIds(latecomer)).resolves.toEqual(PUBLICLY_VISIBLE)
      })

      it('matches the group-derived truth', async () => {
        await expect(restrictionDrift()).resolves.toEqual(noDrift)
      })
    })

    // NOT a statement of intended behaviour — a trap in the test harness, pinned so it is
    // discovered here rather than in whichever suite silently relies on it.
    //
    // `Factory.build('user')` writes the node directly and never runs registration.ts:97, so a
    // factory user created AFTER a post in a non-public group carries no CANNOT_SEE edge and is
    // served that post. Existing suites are safe only because they build their users first.
    // Any test that needs a realistic latecomer must go through SignupVerification.
    //
    // A group-derived rule removes the trap: it consults the membership, which a factory user
    // genuinely lacks. These assertions are then expected to flip to PUBLICLY_VISIBLE / noDrift.
    describe('built by the factory — harness artifact, not intended behaviour', () => {
      givenScenario(async () => {
        latecomer = await buildUser('gv-latecomer', 'Latecomer')
      })

      it('is served the posts of every non-public group', async () => {
        await expect(visiblePostIds(latecomer)).resolves.toEqual(ALL_POSTS)
      })

      it('leaves the group-derived restrictions unwritten', async () => {
        await expect(restrictionDrift()).resolves.toEqual({
          missing: [
            'gv-latecomer → gv-closed-by-author',
            'gv-latecomer → gv-closed-by-member',
            'gv-latecomer → gv-hidden-by-author',
            'gv-latecomer → gv-hidden-by-member',
          ],
          extra: [],
        })
      })
    })
  })
})
