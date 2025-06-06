/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UserInputError } from 'apollo-server'
// eslint-disable-next-line import/extensions
import Validator from 'neode/build/Services/Validator.js'

import existingEmailAddress from './helpers/existingEmailAddress'
import generateNonce from './helpers/generateNonce'
import normalizeEmail from './helpers/normalizeEmail'
import Resolver from './helpers/Resolver'

export default {
  Query: {
    VerifyNonce: async (_parent, args, context, _resolveInfo) => {
      args.email = normalizeEmail(args.email)
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const result = await txc.run(
          `
            MATCH (email:EmailAddress {email: $email, nonce: $nonce})
            RETURN count(email) > 0 AS result
          `,
          { email: args.email, nonce: args.nonce },
        )
        return result
      })
      try {
        const txResult = await readTxResultPromise
        return txResult.records[0].get('result')
      } finally {
        session.close()
      }
    },
  },
  Mutation: {
    AddEmailAddress: async (_parent, args, context, _resolveInfo) => {
      let response
      args.email = normalizeEmail(args.email)
      try {
        const { neode } = context
        await new Validator(neode, neode.model('UnverifiedEmailAddress'), args)
      } catch (e) {
        throw new UserInputError('must be a valid email')
      }

      // check email does not belong to anybody
      const existingEmail = await existingEmailAddress({ args, context })
      if (existingEmail?.alreadyExistingEmail && existingEmail.user)
        return existingEmail.alreadyExistingEmail

      const nonce = generateNonce()
      const {
        user: { id: userId },
      } = context

      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (txc) => {
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
      try {
        const txResult = await writeTxResultPromise
        response = txResult[0]
      } finally {
        session.close()
      }
      return response
    },
    VerifyEmailAddress: async (_parent, args, context, _resolveInfo) => {
      let response
      const {
        user: { id: userId },
      } = context
      args.email = normalizeEmail(args.email)
      const { nonce, email } = args
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (txc) => {
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
      try {
        const txResult = await writeTxResultPromise
        response = txResult[0]
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('A user account with this email already exists.')
        throw new Error(e)
      } finally {
        session.close()
      }
      if (!response) throw new UserInputError('Invalid nonce or no email address found.')
      return response
    },
  },
  EmailAddress: {
    ...Resolver('EmailAddress', {
      undefinedToNull: ['verifiedAt'],
    }),
  },
}
