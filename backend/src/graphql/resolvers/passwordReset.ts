/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'

import registrationConstants from '@constants/registrationBranded'
import type { Context } from '@src/context'

import createPasswordReset from './helpers/createPasswordReset'
import normalizeEmail from './helpers/normalizeEmail'

export default {
  Mutation: {
    requestPasswordReset: async (_parent, { email }, context: Context) => {
      const { driver } = context
      email = normalizeEmail(email)
      // TODO: why this is generated differntly from 'backend/src/schema/resolvers/helpers/generateNonce.js'?
      const nonce = uuid().substring(0, registrationConstants.NONCE_LENGTH)
      return createPasswordReset({ driver, nonce, email })
    },
    resetPassword: async (_parent, { email, nonce, newPassword }, { driver }) => {
      email = normalizeEmail(email)
      const stillValid = new Date()
      stillValid.setDate(stillValid.getDate() - 1)
      const encryptedNewPassword = await bcrypt.hash(newPassword, 10)
      const session = driver.session()
      try {
        const passwordResetTxPromise = session.writeTransaction(async (transaction) => {
          const passwordResetTransactionResponse = await transaction.run(
            `
              MATCH (passwordReset:PasswordReset {nonce: $nonce})
              MATCH (email:EmailAddress {email: $email})<-[:PRIMARY_EMAIL]-(user:User)-[:REQUESTED]->(passwordReset)
              WHERE duration.between(passwordReset.issuedAt, datetime()).days <= 0 AND passwordReset.usedAt IS NULL
              SET passwordReset.usedAt = datetime()
              SET user.encryptedPassword = $encryptedNewPassword
              SET user.updatedAt = toString(datetime())
              RETURN passwordReset
            `,
            {
              stillValid,
              email,
              nonce,
              encryptedNewPassword,
            },
          )
          return passwordResetTransactionResponse.records.map((record) =>
            record.get('passwordReset'),
          )
        })
        const [reset] = await passwordResetTxPromise
        return !!reset?.properties.usedAt
      } finally {
        session.close()
      }
    },
  },
}
