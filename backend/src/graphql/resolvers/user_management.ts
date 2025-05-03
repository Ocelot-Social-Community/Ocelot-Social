/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { AuthenticationError } from 'apollo-server'
import bcrypt from 'bcryptjs'
import { neo4jgraphql } from 'neo4j-graphql-js'

import { getNeode } from '@db/neo4j'
import encode from '@jwt/encode'

import normalizeEmail from './helpers/normalizeEmail'

const neode = getNeode()

export default {
  Query: {
    currentUser: async (object, params, context, resolveInfo) =>
      neo4jgraphql(object, { id: context.user.id }, context, resolveInfo),
  },
  Mutation: {
    login: async (_, { email, password }, { driver }) => {
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
          return encode(currentUser)
        } else if (currentUser?.disabled) {
          throw new AuthenticationError('Your account has been disabled.')
        } else {
          throw new AuthenticationError('Incorrect email address or password.')
        }
      } finally {
        session.close()
      }
    },
    changePassword: async (_, { oldPassword, newPassword }, { user }) => {
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

      return encode(await currentUser.toJson())
    },
  },
}
