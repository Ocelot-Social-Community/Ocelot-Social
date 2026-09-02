import { v4 as uuid } from 'uuid'

import { SocialMedia } from '@db/schema/entities/SocialMedia'
import { validateProperty } from '@db/schema/validate'
import { UserInputError } from '@graphql/errors'

import Resolver from './helpers/Resolver'

import type { EntityProperties } from '@db/schema/types'
import type { Context } from '@src/context/index'

// Written in Cypher rather than through neode. The three mutations used it as an ORM — the
// only place in the production code that did, next to registration and user_management — and
// what it contributed was two defaults (`id`, `createdAt`) plus an edge, all of which the
// statement says outright now.

interface SocialMediaParams {
  id?: string
  url: string
}

/** What the mutations return: the node's properties, as SocialMedia.gql declares them. */
type SocialMediaNode = EntityProperties<typeof SocialMedia>

export default {
  Mutation: {
    CreateSocialMedia: async (
      _object,
      params: SocialMediaParams,
      context: Context,
      _resolveInfo,
    ) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      // Was neode's Joi `uri: true` on the model. The rule now lives in the declaration, so
      // the audit can check the nodes that already exist against the same one.
      const invalid = validateProperty(SocialMedia, 'url', params.url)
      if (invalid) {
        throw new UserInputError(invalid)
      }
      // `id` was neode's uuid default; the mutation also accepts one from the client (see
      // SocialMedia.gql), which neode honoured too.
      const result = await context.database.write({
        query: `
          MATCH (user:User {id: $userId})
          CREATE (socialMedia:SocialMedia)
          SET socialMedia.id = $id,
              socialMedia.url = $url,
              socialMedia.createdAt = toString(datetime())
          MERGE (socialMedia)-[:OWNED_BY]->(user)
          RETURN socialMedia {.*}
        `,
        variables: { userId: context.user.id, id: params.id ?? uuid(), url: params.url },
      })
      return result.records[0]?.get('socialMedia') as SocialMediaNode | undefined
    },

    UpdateSocialMedia: async (_object, params: SocialMediaParams, context: Context) => {
      const invalid = validateProperty(SocialMedia, 'url', params.url)
      if (invalid) {
        throw new UserInputError(invalid)
      }
      const result = await context.database.write({
        query: `
          MATCH (socialMedia:SocialMedia {id: $id})
          SET socialMedia.url = $url
          RETURN socialMedia {.*}
        `,
        variables: { id: params.id, url: params.url },
      })
      return result.records[0]?.get('socialMedia') as SocialMediaNode | undefined
    },

    DeleteSocialMedia: async (_object, { id }: { id: string }, context: Context) => {
      // Returns the node as it was before deletion, which is what the mutation is declared to
      // return — hence reading the properties out before DETACH DELETE rather than after.
      const result = await context.database.write({
        query: `
          MATCH (socialMedia:SocialMedia {id: $id})
          WITH socialMedia, socialMedia {.*} AS deleted
          DETACH DELETE socialMedia
          RETURN deleted
        `,
        variables: { id },
      })
      // No record means no such node: null rather than an error, as before.
      return (result.records[0]?.get('deleted') as SocialMediaNode | undefined) ?? null
    },
  },
  SocialMedia: Resolver('SocialMedia', {
    idAttribute: 'url',
    hasOne: {
      ownedBy: '-[:OWNED_BY]->(related:User)',
    },
  }),
}
