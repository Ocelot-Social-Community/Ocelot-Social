/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { AuthenticationError } from 'apollo-server'
import bcrypt from 'bcryptjs'

import { getNeode } from '@db/neo4j'
import { encode } from '@jwt/encode'
import type { Context } from '@src/context'

import normalizeEmail from './helpers/normalizeEmail'

const neode = getNeode()

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
              RETURN user {.id, .slug, .name, .encryptedPassword, .role, .disabled, email:e.email} as user LIMIT 1
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
      const currentUser = await neode.find('User', user.id)

      const encryptedPassword = currentUser.get<string>('encryptedPassword')
      if (!(await bcrypt.compare(oldPassword, encryptedPassword))) {
        throw new AuthenticationError('Old password is not correct')
      }

      if (await bcrypt.compare(newPassword, encryptedPassword)) {
        throw new AuthenticationError('Old password and new password should be different')
      }

      const newEncryptedPassword = await bcrypt.hash(newPassword, 10)
      await currentUser.update({
        encryptedPassword: newEncryptedPassword,
        updatedAt: new Date().toISOString(),
      })

      return encode(context)(await currentUser.toJson())
    },
  },
}
