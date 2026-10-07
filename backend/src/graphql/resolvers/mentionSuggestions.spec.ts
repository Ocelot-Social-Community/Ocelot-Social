/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import mentionSuggestions from '@graphql/queries/users/mentionSuggestions.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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

afterEach(async () => {
  await cleanDatabase()
})

// "relation:slug" per suggestion — order and grouping in one readable assertion.
const suggest = async (variables = {}) => {
  const { data, errors } = await query({ query: mentionSuggestions, variables })

  expect(errors).toBeUndefined()

  return data.mentionSuggestions.map(({ relation, user }) => `${relation}:${user.slug}`)
}

const loginAs = (id: string) => {
  authenticatedUser = { id } as Context['user']
}

describe('mentionSuggestions', () => {
  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(query({ query: mentionSuggestions })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('given a post with participants and users in every relation to me', () => {
    beforeEach(async () => {
      // Written as one statement on purpose: the relations ARE the fixture, and the resolver reads
      // nothing but these edges and the handful of properties set here.
      await database.write({
        query: `
          CREATE
            (me:User {id: 'me', slug: 'me', name: 'Me'}),
            (author:User {id: 'author', slug: 'anna-author', name: 'Anna Author'}),
            (commenter:User {id: 'commenter', slug: 'carl-commenter', name: 'Carl Commenter'}),
            (inPost:User {id: 'in-post', slug: 'ida-in-post'}),
            (inComment:User {id: 'in-comment', slug: 'ivo-in-comment'}),
            (followed:User {id: 'followed', slug: 'fred-followed', name: 'Fred Followed'}),
            (follower:User {id: 'follower', slug: 'fay-follower'}),
            (other:User {id: 'other', slug: 'otto-other', name: 'Otto Other'}),
            (mutedByMe:User {id: 'muted-by-me', slug: 'aaron-muted'}),
            (mutedMe:User {id: 'muted-me', slug: 'mia-muted-me', name: 'Olivia'}),
            (blockedByMe:User {id: 'blocked-by-me', slug: 'bea-blocked'}),
            (blockedMe:User {id: 'blocked-me', slug: 'ben-blocker'}),
            (blocksAuthor:User {id: 'blocks-author', slug: 'bo-blocks-author'}),
            (deleted:User {id: 'deleted', slug: 'dora-deleted', deleted: true}),
            (disabled:User {id: 'disabled', slug: 'dan-disabled', disabled: true}),
            (post:Post {id: 'post'}),
            (comment:Comment {id: 'comment'}),
            (author)-[:WROTE]->(post),
            (commenter)-[:WROTE]->(comment)-[:COMMENTS]->(post),
            (post)-[:NOTIFIED {reason: 'mentioned_in_post'}]->(inPost),
            (comment)-[:NOTIFIED {reason: 'mentioned_in_comment'}]->(inComment),
            // A notification that is NOT a mention must not make someone a participant.
            (post)-[:NOTIFIED {reason: 'commented_on_post'}]->(other),
            (me)-[:FOLLOWS]->(followed),
            (follower)-[:FOLLOWS]->(me),
            (me)-[:MUTED]->(mutedByMe),
            (mutedMe)-[:MUTED]->(me),
            (me)-[:BLOCKED]->(blockedByMe),
            (blockedMe)-[:BLOCKED]->(me),
            (blocksAuthor)-[:BLOCKED]->(author)
        `,
      })
      loginAs('me')
    })

    it('lists whom I follow, then my followers, then everyone else', async () => {
      await expect(suggest()).resolves.toEqual([
        'following:fred-followed',
        'follower:fay-follower',
        'other:anna-author',
        'other:bo-blocks-author',
        'other:carl-commenter',
        'other:ida-in-post',
        'other:ivo-in-comment',
        'other:mia-muted-me',
        'other:otto-other',
        // Muted by me: still offered, but last within its relation despite the "a".
        'other:aaron-muted',
      ])
    })

    it('leaves out me, deleted and disabled users, and blocks in either direction', async () => {
      const slugs = (await suggest({ first: 25 })).map((entry) => entry.split(':')[1])

      expect(slugs).not.toContain('me')
      expect(slugs).not.toContain('dora-deleted')
      expect(slugs).not.toContain('dan-disabled')
      expect(slugs).not.toContain('bea-blocked')
      expect(slugs).not.toContain('ben-blocker')
    })

    // Dropping them would let me read off the list who has muted me.
    it('keeps users who have muted me', async () => {
      await expect(suggest()).resolves.toContain('other:mia-muted-me')
    })

    describe('with a post', () => {
      it('puts author, commenters and everyone mentioned first, each once', async () => {
        await expect(suggest({ postId: 'post' })).resolves.toEqual([
          'participant:anna-author',
          'participant:carl-commenter',
          'participant:ida-in-post',
          'participant:ivo-in-comment',
          'following:fred-followed',
          'follower:fay-follower',
          'other:mia-muted-me',
          'other:otto-other',
          'other:aaron-muted',
        ])
      })

      // A mention in a comment does not notify someone in a block with the post's author.
      it('leaves out users in a block with the author of the post', async () => {
        await expect(suggest({ postId: 'post' })).resolves.not.toContain('other:bo-blocks-author')
      })

      it('ranks a participant I also follow as participant', async () => {
        await database.write({
          query: `MATCH (me:User {id: 'me'}), (author:User {id: 'author'})
                  CREATE (me)-[:FOLLOWS]->(author)`,
        })
        const suggestions = await suggest({ postId: 'post' })

        expect(suggestions).toContain('participant:anna-author')
        expect(suggestions).not.toContain('following:anna-author')
      })

      it('ignores a post that does not exist', async () => {
        await expect(suggest({ postId: 'no-such-post', first: 2 })).resolves.toEqual([
          'following:fred-followed',
          'follower:fay-follower',
        ])
      })
    })

    describe('with a query', () => {
      it('matches the start of the slug, case-insensitively', async () => {
        await expect(suggest({ query: 'F' })).resolves.toEqual([
          'following:fred-followed',
          'follower:fay-follower',
        ])
      })

      it('matches the start of any word of the name', async () => {
        await expect(suggest({ query: 'comm' })).resolves.toEqual(['other:carl-commenter'])
      })

      it('does not match inside a word', async () => {
        await expect(suggest({ query: 'ollowed' })).resolves.toEqual([])
      })

      it('lists slug matches before name matches within a relation', async () => {
        await expect(suggest({ query: 'o' })).resolves.toEqual([
          'other:otto-other',
          'other:mia-muted-me',
        ])
      })

      it('ignores surrounding whitespace', async () => {
        await expect(suggest({ query: ' fred ' })).resolves.toEqual(['following:fred-followed'])
      })
    })

    describe('with a limit', () => {
      it('fills up with other users only as far as the limit goes', async () => {
        await expect(suggest({ first: 3 })).resolves.toEqual([
          'following:fred-followed',
          'follower:fay-follower',
          'other:anna-author',
        ])
      })

      it('does not exceed it with related users alone', async () => {
        await expect(suggest({ first: 1 })).resolves.toEqual(['following:fred-followed'])
      })

      it('clamps it to 1–25', async () => {
        await expect(suggest({ first: 0 })).resolves.toHaveLength(1)
        await expect(suggest({ first: 1000 })).resolves.toHaveLength(10)
      })
    })
  })

  describe('given a group', () => {
    const createGroup = async (groupType: string, myRole: string | null) => {
      await database.write({
        query: `
          CREATE
            (me:User {id: 'me', slug: 'me'}),
            (member:User {id: 'member', slug: 'mel-member'}),
            (pending:User {id: 'pending', slug: 'pat-pending'}),
            (noMember:User {id: 'no-member', slug: 'nora-no-member'}),
            (followed:User {id: 'followed', slug: 'fred-followed'}),
            (group:Group {id: 'group', groupType: $groupType}),
            (post:Post {id: 'group-post'}),
            (member)-[:MEMBER_OF {role: 'usual'}]->(group),
            (pending)-[:MEMBER_OF {role: 'pending'}]->(group),
            (member)-[:WROTE]->(post)-[:IN]->(group),
            (me)-[:FOLLOWS]->(followed)
          FOREACH (role IN $myRoles | CREATE (me)-[:MEMBER_OF {role: role}]->(group))
        `,
        variables: { groupType, myRoles: myRole ? [myRole] : [] },
      })
      loginAs('me')
    }

    describe('that is public', () => {
      beforeEach(async () => {
        await createGroup('public', null)
      })

      it('lists its active members first and everyone else after', async () => {
        await expect(suggest({ groupId: 'group' })).resolves.toEqual([
          'groupMember:mel-member',
          'following:fred-followed',
          'other:nora-no-member',
          'other:pat-pending',
        ])
      })

      it('takes the group from the post', async () => {
        await expect(suggest({ postId: 'group-post' })).resolves.toEqual([
          'participant:mel-member',
          'following:fred-followed',
          'other:nora-no-member',
          'other:pat-pending',
        ])
      })
    })

    describe.each(['closed', 'hidden'])('that is %s', (groupType) => {
      // Nobody else would be notified of the mention.
      it('offers only active members to a member', async () => {
        await createGroup(groupType, 'usual')

        await expect(suggest({ groupId: 'group' })).resolves.toEqual(['groupMember:mel-member'])
        await expect(suggest({ postId: 'group-post' })).resolves.toEqual(['participant:mel-member'])
      })

      // Otherwise the list would give the members away.
      it('offers nobody to someone who is not a member', async () => {
        await createGroup(groupType, null)

        await expect(suggest({ groupId: 'group' })).resolves.toEqual([])
        await expect(suggest({ postId: 'group-post' })).resolves.toEqual([])
      })

      it('offers nobody to a pending member', async () => {
        await createGroup(groupType, 'pending')

        await expect(suggest({ groupId: 'group' })).resolves.toEqual([])
      })
    })

    it('ignores groupId when a post is given', async () => {
      await createGroup('closed', 'usual')
      await database.write({
        query: `MATCH (noMember:User {id: 'no-member'})
                CREATE (noMember)-[:WROTE]->(:Post {id: 'public-post'})`,
      })

      await expect(suggest({ postId: 'public-post', groupId: 'group' })).resolves.toContain(
        'participant:nora-no-member',
      )
    })
  })
})
