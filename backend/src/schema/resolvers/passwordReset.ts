import { v4 as uuid } from 'uuid'
import bcrypt from 'bcryptjs'
import CONSTANTS_REGISTRATION from './../../constants/registration'
import createPasswordReset from './helpers/createPasswordReset'

export default {
  Mutation: {
    requestPasswordReset: async (_parent, { email }, { driver }) => {
      // TODO: why this is generated differntly from 'backend/src/schema/resolvers/helpers/generateNonce.ts'?
      const nonce = uuid().substring(0, CONSTANTS_REGISTRATION.NONCE_LENGTH)
      return createPasswordReset({ driver, nonce, email })
    },
    resetPassword: async (_parent, { email, nonce, newPassword }, { driver }) => {
      const stillValid = new Date()
      stillValid.setDate(stillValid.getDate() - 1)
      const encryptedNewPassword = await bcrypt.hashSync(newPassword, 10)
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
        return !!(reset && reset.properties.usedAt)
      } finally {
        session.close()
      }
    },
  },
}
