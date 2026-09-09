/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import bcrypt from 'bcryptjs'

import { AuthenticationError } from '@graphql/errors'
import { encode } from '@jwt/encode'

import normalizeEmail from './helpers/normalizeEmail'

import type { Context } from '@src/context'

export default {
  Query: {
    currentUser: async (_object, _params, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('You must be logged in')
      }
      const [user] = (
        await context.database.query({
          query: `
          MATCH (user:User {id: $user.id})-[:PRIMARY_EMAIL]->(e:EmailAddress)
          RETURN user {.*, email: e.email}
        `,
          variables: { user: context.user },
        })
      ).records.map((record) => record.get('user'))
      return user
    },
  },
  Mutation: {
    login: async (_, { email, password }, context: Context) => {
      const { driver } = context
      // if (user && user.id) {
      //   throw new Error('Already logged in.')
      // }
      email = normalizeEmail(email)
      const session = driver.session()
      try {
        const loginReadTxResultPromise = session.readTransaction(async (transaction) => {
          const loginTransactionResponse = await transaction.run(
            `
              MATCH (user:User {deleted: false})-[:PRIMARY_EMAIL]->(e:EmailAddress {email: $userEmail})
              RETURN user {.id, .slug, .name, .encryptedPassword, .disabled, email:e.email} as user LIMIT 1
            `,
            { userEmail: email },
          )
          return loginTransactionResponse.records.map((record) => record.get('user'))
        })
        const [currentUser] = await loginReadTxResultPromise
        if (
          currentUser &&
          (await bcrypt.compare(password, currentUser.encryptedPassword)) &&
          !currentUser.disabled
        ) {
          delete currentUser.encryptedPassword
          return encode(context)(currentUser)
        } else if (currentUser?.disabled) {
          throw new AuthenticationError('Your account has been disabled.')
        } else {
          throw new AuthenticationError('Incorrect email address or password.')
        }
      } finally {
        await session.close()
      }
    },
    changePassword: async (_, { oldPassword, newPassword }, context: Context) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      const { user } = context
      const stored = await context.database.query({
        query: 'MATCH (user:User {id: $id}) RETURN user.encryptedPassword AS encryptedPassword',
        variables: { id: user.id },
      })
      const encryptedPassword = stored.records[0]?.get('encryptedPassword') as string | undefined
      if (!encryptedPassword) {
        throw new AuthenticationError('Old password is not correct')
      }

      if (!(await bcrypt.compare(oldPassword, encryptedPassword))) {
        throw new AuthenticationError('Old password is not correct')
      }

      if (await bcrypt.compare(newPassword, encryptedPassword)) {
        throw new AuthenticationError('Old password and new password should be different')
      }

      const newEncryptedPassword = await bcrypt.hash(newPassword, 10)
      // `updatedAt` is written the way every other resolver writes it. neode used
      // `new Date().toISOString()`, which differs in the fractional digits only — both forms
      // satisfy db/schema's ISO_DATE_TIME, and the two spellings already coexist in the data.
      const updated = await context.database.write({
        query: `
          MATCH (user:User {id: $id})
          SET user.encryptedPassword = $encryptedPassword,
              user.updatedAt = toString(datetime())
          RETURN user {.*}
        `,
        variables: { id: user.id, encryptedPassword: newEncryptedPassword },
      })

      return encode(context)(updated.records[0].get('user'))
    },
  },
}
