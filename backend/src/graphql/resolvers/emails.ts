/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UnverifiedEmailAddress } from '@db/schema/entities/UnverifiedEmailAddress'
import { validateProperty } from '@db/schema/validate'
import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'

import existingEmailAddress from './helpers/existingEmailAddress'
import generateNonce from './helpers/generateNonce'
import normalizeEmail from './helpers/normalizeEmail'

export default {
  Query: {
    VerifyNonce: async (_parent, args, context, _resolveInfo) => {
      args.email = normalizeEmail(args.email as string)
      const session = context.driver.session()
      try {
        const txResult = await session.readTransaction(async (txc) => {
          return await txc.run(
            `
              MATCH (email:EmailAddress {email: $email, nonce: $nonce})
              RETURN count(email) > 0 AS result
            `,
            { email: args.email, nonce: args.nonce },
          )
        })
        return txResult.records[0].get('result')
      } finally {
        await session.close()
      }
    },
  },
  Mutation: {
    AddEmailAddress: async (_parent, args, context, _resolveInfo) => {
      args.email = normalizeEmail(args.email as string)
      // Was neode's Joi validator, called for its throw and nothing else. Only the address is
      // checked here — the node is written further down, with its own nonce and timestamp.
      if (validateProperty(UnverifiedEmailAddress, 'email', args.email)) {
        throw new AppError(Errors.EMAIL_CHANGE_ADDRESS_INVALID)
      }

      // check email does not belong to anybody
      const existingEmail = await existingEmailAddress({ args, context })
      if (existingEmail?.alreadyExistingEmail && existingEmail.user) {
        return existingEmail.alreadyExistingEmail
      }

      const nonce = generateNonce()
      const {
        user: { id: userId },
      } = context

      const session = context.driver.session()
      try {
        const txResult = await session.writeTransaction(async (txc) => {
          const result = await txc.run(
            `
              MATCH (user:User {id: $userId})
              MERGE (user)<-[:BELONGS_TO]-(email:UnverifiedEmailAddress {email: $email, nonce: $nonce})
              SET email.createdAt = toString(datetime())
              RETURN email, user
            `,
            { userId, email: args.email, nonce },
          )
          return result.records.map((record) => ({
            name: record.get('user').properties.name,
            locale: record.get('user').properties.locale,
            ...record.get('email').properties,
          }))
        })
        const response = txResult[0]
        if (!response) {
          throw new AppError(Errors.USER_DOES_NOT_EXIST)
        }
        return response
      } finally {
        await session.close()
      }
    },
    VerifyEmailAddress: async (_parent, args, context, _resolveInfo) => {
      const {
        user: { id: userId },
      } = context
      args.email = normalizeEmail(args.email as string)
      const { nonce, email } = args
      const session = context.driver.session()
      let response
      try {
        const txResult = await session.writeTransaction(async (txc) => {
          const result = await txc.run(
            `
              MATCH (user:User {id: $userId})-[:PRIMARY_EMAIL]->(previous:EmailAddress)
              MATCH (user)<-[:BELONGS_TO]-(email:UnverifiedEmailAddress {email: $email, nonce: $nonce})
              OPTIONAL MATCH (abandonedEmail:EmailAddress{email: $email}) WHERE NOT EXISTS ((abandonedEmail)<-[]-())
              DELETE abandonedEmail
              MERGE (user)-[:PRIMARY_EMAIL]->(email)
              SET email:EmailAddress
              SET email.verifiedAt = toString(datetime())
              REMOVE email:UnverifiedEmailAddress
              DETACH DELETE previous
              RETURN email
            `,
            { userId, email, nonce },
          )
          return result.records.map((record) => record.get('email').properties)
        })
        response = txResult[0]
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
          throw new AppError(Errors.EMAIL_CHANGE_ADDRESS_ALREADY_IN_USE)
        }
        throw e
      } finally {
        await session.close()
      }
      if (!response) {
        throw new AppError(Errors.EMAIL_CHANGE_CONFIRMATION_CODE_INVALID)
      }
      return response
    },
  },
}
