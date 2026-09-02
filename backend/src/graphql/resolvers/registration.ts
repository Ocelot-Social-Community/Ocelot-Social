/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { hash } from 'bcryptjs'

import { EmailAddress } from '@db/schema/entities/EmailAddress'
import { validateProperties } from '@db/schema/validate'
import { UserInputError } from '@graphql/errors'

import existingEmailAddress from './helpers/existingEmailAddress'
import generateNonce from './helpers/generateNonce'
import normalizeEmail from './helpers/normalizeEmail'
import { redeemInviteCode } from './inviteCodes'
import { createOrUpdateLocations } from './users/location'

import type { Context } from '@src/context/index'

export default {
  Mutation: {
    Signup: async (_parent, args, context) => {
      args.nonce = generateNonce()
      args.email = normalizeEmail(args.email)
      const emailAddress = await existingEmailAddress({ args, context })
      /*
      if (emailAddress.user) {
        // what to do?
      }
      */
      if (emailAddress.alreadyExistingEmail) {
        return emailAddress.alreadyExistingEmail
      }
      // neode validated the address against db/models/EmailAddress before writing; that check
      // moves to the declaration. `args` carries more than the node does (locale, inviteCode),
      // so only the declared properties go in — `additionalProperties: false` would reject the
      // rest, and they are arguments, not node properties.
      const properties = {
        email: args.email as string,
        nonce: args.nonce as string,
        createdAt: new Date().toISOString(),
      }
      const invalid = validateProperties(EmailAddress, properties)
      if (invalid) {
        throw new UserInputError(invalid)
      }
      const created = await context.database.write({
        query: `
          CREATE (emailAddress:EmailAddress)
          SET emailAddress += $properties
          RETURN emailAddress {.*}
        `,
        variables: { properties },
      })
      return created.records[0].get('emailAddress')
    },
    SignupVerification: async (_parent, args, context: Context) => {
      const { termsAndConditionsAgreedVersion } = args
      const regEx = /^[0-9]+\.[0-9]+\.[0-9]+$/g
      if (!regEx.test(termsAndConditionsAgreedVersion)) {
        throw new UserInputError('Invalid version format!')
      }
      args.termsAndConditionsAgreedAt = new Date().toISOString()

      let { nonce, email, inviteCode, locationName } = args
      email = normalizeEmail(email)
      delete args.nonce
      delete args.email
      delete args.inviteCode
      args.encryptedPassword = await hash(args.password, 10)
      delete args.password
      delete args.locationName

      if (locationName === '') {
        locationName = null
      }

      const { driver } = context
      const session = driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createUserTransactionResponse = await transaction.run(
          `
            MATCH (email:EmailAddress {nonce: $nonce, email: $email})
            WHERE NOT (email)-[:BELONGS_TO]->()
            CREATE (user:User)
            MERGE (user)-[:PRIMARY_EMAIL]->(email)
            MERGE (user)<-[:BELONGS_TO]-(email)
            SET user += $args
            SET user.id = randomUUID()
            SET user.createdAt = toString(datetime())
            SET user.updatedAt = toString(datetime())
            SET user.allowEmbedIframes = false
            SET user.showShoutsPublicly = false
            SET user.locationName = $locationName
            SET email.verifiedAt = toString(datetime())
            WITH user
            OPTIONAL MATCH (post:Post)-[:IN]->(group:Group)
              WHERE NOT group.groupType = 'public'
            WITH user, collect(post) AS invisiblePosts
            FOREACH (invisiblePost IN invisiblePosts |
              MERGE (user)-[:CANNOT_SEE]->(invisiblePost)
            )
            WITH user
            OPTIONAL MATCH (baselineRole:Role {id: 'user'})
            FOREACH (r IN CASE WHEN baselineRole IS NULL THEN [] ELSE [baselineRole] END |
              MERGE (user)-[:HAS_ROLE]->(r)
            )
            RETURN user {.*} AS user, baselineRole IS NOT NULL AS roleAssigned
          `,
          {
            args,
            nonce,
            email,
            inviteCode,
            locationName,
          },
        )
        const [record] = createUserTransactionResponse.records
        const user = record?.get('user')
        if (!user) {
          throw new UserInputError('Invalid email or nonce')
        }
        // The single-role model requires exactly one HAS_ROLE edge. If the baseline
        // 'user' role node is not seeded, fail hard (rolls back this transaction)
        // rather than persist a half-initialized, edgeless user that later breaks
        // roleName / userRoles / role filters.
        if (!record.get('roleAssigned')) {
          throw new Error(
            'The baseline "user" role is not seeded; cannot assign a role to the new account.',
          )
        }

        return user
      })
      try {
        const user = await writeTxResultPromise

        // To allow redeeming and return an User object we require a User in the context
        context.user = user

        if (inviteCode) {
          await redeemInviteCode(context, inviteCode, true)
        }

        await createOrUpdateLocations('User', user.id, locationName, session, context)
        return user
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
          throw new UserInputError('User with this slug already exists!')
        }
        throw new UserInputError(e.message)
      } finally {
        await session.close()
      }
    },
  },
}
