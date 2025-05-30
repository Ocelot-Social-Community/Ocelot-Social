/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import normalizeEmail from './normalizeEmail'

export default async function alreadyExistingMail({ args, context }) {
  args.email = normalizeEmail(args.email)
  const session = context.driver.session()
  try {
    const existingEmailAddressTxPromise = session.writeTransaction(async (transaction) => {
      const existingEmailAddressTransactionResponse = await transaction.run(
        `
          MATCH (email:EmailAddress {email: $email})
          OPTIONAL MATCH (email)-[:BELONGS_TO]-(user)
          RETURN email, user
        `,
        { email: args.email },
      )
      return existingEmailAddressTransactionResponse.records.map((record) => {
        return {
          alreadyExistingEmail: record.get('email').properties,
          user: record.get('user') && record.get('user').properties,
        }
      })
    })
    const [emailBelongsToUser] = await existingEmailAddressTxPromise
    /*
      const { alreadyExistingEmail, user } = 
      if (user) throw new UserInputError('A user account with this email already exists.')
    */
    return emailBelongsToUser || {}
  } finally {
    session.close()
  }
}
