/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import hashtagSuggestions from '@graphql/queries/posts/hashtagSuggestions.gql'
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

// "relation:tag" per suggestion — order and grouping in one readable assertion.
const suggest = async (variables = {}) => {
  const { data, errors } = await query({ query: hashtagSuggestions, variables })

  expect(errors).toBeUndefined()

  return data.hashtagSuggestions.map(({ relation, tag }) => `${relation}:${tag.id}`)
}

describe('hashtagSuggestions', () => {
  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(query({ query: hashtagSuggestions })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('given tags on my posts and on those of others', () => {
    beforeEach(async () => {
      // One statement: the edges ARE the fixture. Posts per tag — Frieden 1 (mine), Freiheit 1
      // (mine) + 1, Demokratie 3, Frei 2, Natur 1, Dorf 0.
      await database.write({
        query: `
          CREATE
            (me:User {id: 'me', slug: 'me'}),
            (other:User {id: 'other', slug: 'other'}),
            (frieden:Tag {id: 'Frieden'}),
            (freiheit:Tag {id: 'Freiheit'}),
            (demokratie:Tag {id: 'Demokratie'}),
            (frei:Tag {id: 'Frei'}),
            (natur:Tag {id: 'Natur'}),
            (dorf:Tag {id: 'Dorf'}),
            (deleted:Tag {id: 'Geloescht', deleted: true}),
            (disabled:Tag {id: 'Gesperrt', disabled: true}),
            (mine1:Post {id: 'mine1'}),
            (mine2:Post {id: 'mine2'}),
            (theirs1:Post {id: 'theirs1'}),
            (theirs2:Post {id: 'theirs2'}),
            (theirs3:Post {id: 'theirs3'}),
            (me)-[:WROTE]->(mine1),
            (me)-[:WROTE]->(mine2),
            (other)-[:WROTE]->(theirs1),
            (other)-[:WROTE]->(theirs2),
            (other)-[:WROTE]->(theirs3),
            (mine1)-[:TAGGED]->(frieden),
            (mine2)-[:TAGGED]->(freiheit),
            (theirs1)-[:TAGGED]->(freiheit),
            (theirs1)-[:TAGGED]->(demokratie),
            (theirs2)-[:TAGGED]->(demokratie),
            (theirs3)-[:TAGGED]->(demokratie),
            (theirs1)-[:TAGGED]->(frei),
            (theirs2)-[:TAGGED]->(frei),
            (theirs3)-[:TAGGED]->(natur),
            (theirs1)-[:TAGGED]->(deleted),
            (theirs1)-[:TAGGED]->(disabled)
        `,
      })
      authenticatedUser = { id: 'me' } as Context['user']
    })

    it('lists the tags of my own posts first, then the others by number of posts', async () => {
      await expect(suggest()).resolves.toEqual([
        'usedByMe:Freiheit',
        'usedByMe:Frieden',
        'popular:Demokratie',
        'popular:Frei',
        'popular:Natur',
        'popular:Dorf',
      ])
    })

    it('leaves out deleted and disabled tags', async () => {
      const suggestions = await suggest({ query: 'ge' })

      expect(suggestions).toEqual([])
    })

    it('matches the start of the tag, case-insensitively', async () => {
      await expect(suggest({ query: 'fR' })).resolves.toEqual([
        'usedByMe:Freiheit',
        'usedByMe:Frieden',
        'popular:Frei',
      ])
    })

    it('does not match inside a tag', async () => {
      await expect(suggest({ query: 'rieden' })).resolves.toEqual([])
    })

    // The editor reads off the list whether the typed tag exists already.
    it('puts an exact match first within its relation', async () => {
      await database.write({
        query: `MATCH (post:Post {id: 'theirs1'}) CREATE (post)-[:TAGGED]->(:Tag {id: 'D'})`,
      })

      await expect(suggest({ query: 'd' })).resolves.toEqual([
        'popular:D',
        'popular:Demokratie',
        'popular:Dorf',
      ])
    })

    it('limits the list', async () => {
      await expect(suggest({ first: 3 })).resolves.toEqual([
        'usedByMe:Freiheit',
        'usedByMe:Frieden',
        'popular:Demokratie',
      ])
    })

    it('clamps the limit to 1–25', async () => {
      await expect(suggest({ first: 0 })).resolves.toHaveLength(1)
      await expect(suggest({ first: 1000 })).resolves.toHaveLength(6)
    })

    it('counts a tag as used by me only for my own posts', async () => {
      authenticatedUser = { id: 'other' } as Context['user']
      const suggestions = await suggest()

      expect(suggestions).toContain('popular:Frieden')
      expect(suggestions).toContain('usedByMe:Demokratie')
    })
  })
})
