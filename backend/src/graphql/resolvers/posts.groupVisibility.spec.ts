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
import pinPost from '@graphql/queries/posts/pinPost.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { DocumentNode } from 'graphql'

// Post visibility across every transition that changes it.
//
// THE RULE: a post in a non-public group is served to the group's active members, and to its
// own author. Nothing else. It is derived from the graph on every read — there is no stored
// restriction, so there is no state here that can be right or wrong independently of the
// memberships it is read from.
//
// posts.inGroups.spec.ts covers the STATIC matrix (anonymous / new / non-member / pending /
// member × public / closed / hidden). This file covers the TRANSITIONS, and covers each of them
// twice: once for a viewer who wrote the post and once for a viewer who did not. That split is
// the whole point. posts.inGroups.spec.ts cannot make it — its `allGroupsUser` wrote all three
// group posts itself, so "usual member leaves … stil shows the posts" (line 1729) exercises
// only the author exception under a name that reads like a general claim about leaving a group.
//
// These tests were written against the previous implementation, a materialised
// `(:User)-[:CANNOT_SEE]->(:Post)` edge maintained by five different mutations. Six of them
// asserted the opposite of what they assert now, because those five writers did not agree with
// each other: losing membership by being demoted hid your own posts, losing it by leaving did
// not, and losing it because the group turned private hid them again. The rule below has one
// answer, so the three cases that used to differ are now `describe.each` branches of the same
// expectation — which is the observable half of what the refactor bought.

let authenticatedUser: Context['user']
// `maxPinnedPosts` is set because one scenario pins a post; pinning is refused outright at 0.
const policy = { categoriesActive: false, maxPinnedPosts: 3 }
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
const buildUser = async (id: string, name: string, role?: string): Promise<Context['user']> => {
  const built = (await factory.build('user', role ? { id, name, role } : { id, name })) as {
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

/**
 * The three ways `gv-member` can stop being an active member of a group.
 *
 * Listed together because the rule gives them ONE answer. Under the CANNOT_SEE model they were
 * three code paths with three different opinions about the member's own posts — the author
 * exception existed only in the Leave/Remove branch. Running the same expectations over all
 * three is what says that is over.
 */
const LOSING_MEMBERSHIP: [string, (groupId: string) => Promise<void>][] = [
  [
    'the member leaves',
    async (groupId) => {
      authenticatedUser = member
      await expectMutation(LeaveGroup, { groupId, userId: 'gv-member' })
    },
  ],
  [
    'an owner removes the member',
    async (groupId) => {
      authenticatedUser = owner
      await expectMutation(RemoveUserFromGroup, { groupId, userId: 'gv-member' })
    },
  ],
  [
    'an owner demotes the member to pending',
    async (groupId) => {
      authenticatedUser = owner
      await expectMutation(ChangeGroupMemberRole, {
        groupId,
        userId: 'gv-member',
        roleInGroup: 'pending',
      })
    },
  ],
]

describe('post visibility derived from group membership', () => {
  describe('baseline', () => {
    givenScenario()

    it('serves active members everything and outsiders only the public posts', async () => {
      await expect(visiblePostIds(member)).resolves.toEqual(ALL_POSTS)
      await expect(visiblePostIds(outsider)).resolves.toEqual(PUBLICLY_VISIBLE)
    })
  })

  describe.each(LOSING_MEMBERSHIP)('%s', (_name, losesMembership) => {
    describe.each(['gv-closed', 'gv-hidden'])('%s group', (groupId) => {
      givenScenario(async () => losesMembership(groupId))

      it("hides the group's posts written by SOMEONE ELSE", async () => {
        await expect(visiblePostIds(member)).resolves.not.toContain(`${groupId}-by-author`)
      })

      // The author exception. posts.inGroups.spec.ts:1729 exercises it without naming it, and
      // only for the one path that used to implement it.
      it('keeps the posts the departing user wrote THEMSELVES visible to them', async () => {
        await expect(visiblePostIds(member)).resolves.toContain(`${groupId}-by-member`)
      })

      it('leaves the other group untouched', async () => {
        const other = groupId === 'gv-closed' ? 'gv-hidden' : 'gv-closed'
        const visible = await visiblePostIds(member)

        expect(visible).toContain(`${other}-by-author`)
        expect(visible).toContain(`${other}-by-member`)
      })
    })
  })

  describe('ChangeGroupMemberRole', () => {
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

      it('restores full visibility', async () => {
        await expect(visiblePostIds(member)).resolves.toEqual(ALL_POSTS)
      })
    })
  })

  // posts.inGroups / groups.spec cover public ↔ hidden. The transitions BETWEEN two non-public
  // types were never exercised: under CANNOT_SEE they hit the same edge-rewriting branch, and
  // under the derived rule they must be a no-op for visibility — both types are non-public, so
  // nothing about who may read the group's posts changes.
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
    })

    // The case that used to give a THIRD answer to "do I keep seeing my own post": the author
    // is not a member any more when the group turns private, and the rewrite that ran here
    // restricted every non-member, the author included. The author exception is part of the
    // rule now, so it applies here too.
    describe('public → closed after the author left the group', () => {
      givenScenario(async () => {
        authenticatedUser = author
        await expectMutation(LeaveGroup, { groupId: 'gv-public', userId: 'gv-author' })
        await changeType('gv-public', 'closed')
      })

      it('keeps the authors own post visible to them', async () => {
        await expect(visiblePostIds(author)).resolves.toContain('gv-public-by-author')
      })

      it('hides it from everyone outside the group', async () => {
        await expect(visiblePostIds(outsider)).resolves.toEqual(['gv-no-group'])
      })
    })

    // A pinned post skips the filters that express PREFERENCE — that is what pinning is for.
    // It must not skip the ones that express PERMISSION, and it used to: the pinned-post
    // wrapper put the entire filter into one branch of `pinned OR (…)`, so `post.pinned = true`
    // satisfied the query by itself.
    //
    // `pinPost` refuses a post in a non-public group, which is why this needs the group to turn
    // private AFTERWARDS. Nothing un-pins a post when that happens.
    describe('a post pinned while its group was still public', () => {
      givenScenario(async () => {
        const admin = await buildUser('gv-pin-admin', 'Pinning Admin', 'admin')
        authenticatedUser = admin
        await expectMutation(pinPost, { id: 'gv-public-by-author' })
        authenticatedUser = owner
        await expectMutation(UpdateGroup, { id: 'gv-public', groupType: 'hidden' })
      })

      it('is hidden from a non-member once the group turns private', async () => {
        await expect(visiblePostIds(outsider)).resolves.not.toContain('gv-public-by-author')
      })

      it('is hidden from a logged-out visitor', async () => {
        await expect(visiblePostIds(null)).resolves.not.toContain('gv-public-by-author')
      })

      it('is still served to the members', async () => {
        await expect(visiblePostIds(member)).resolves.toContain('gv-public-by-author')
      })
    })
  })

  // Users created after the posts exist. The two paths differ in everything except the part
  // that matters: neither produces a membership.
  //
  // They used to differ in outcome, and that difference was a trap. SignupVerification ran a
  // backfill that wrote a CANNOT_SEE edge to every existing post in a non-public group;
  // `Factory.build('user')` writes the node directly and ran nothing, so a factory user built
  // after such a post was served it. Existing suites were correct only because they build
  // their users first. Reading the rule from the membership — which neither user has — makes
  // the two paths agree, so the trap is gone rather than documented.
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

      it('sees only the public posts', async () => {
        await expect(visiblePostIds(latecomer)).resolves.toEqual(PUBLICLY_VISIBLE)
      })
    })

    describe('built directly by the factory', () => {
      givenScenario(async () => {
        latecomer = await buildUser('gv-latecomer', 'Latecomer')
      })

      it('sees only the public posts, same as a registered one', async () => {
        await expect(visiblePostIds(latecomer)).resolves.toEqual(PUBLICLY_VISIBLE)
      })
    })
  })
})
