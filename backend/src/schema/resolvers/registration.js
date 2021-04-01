import { UserInputError } from 'apollo-server'
import { getNeode } from '../../db/neo4j'
import encryptPassword from '../../helpers/encryptPassword'
import generateNonce from './helpers/generateNonce'
import existingEmailAddress from './helpers/existingEmailAddress'
import normalizeEmail from './helpers/normalizeEmail'

const neode = getNeode()

export default {
  Mutation: {
    Signup: async (_parent, args, context) => {
      args.nonce = generateNonce()
      args.email = normalizeEmail(args.email)
      let emailAddress = await existingEmailAddress({ args, context })
      if (emailAddress) return emailAddress
      try {
        emailAddress = await neode.create('EmailAddress', args)
        return emailAddress.toJson()
      } catch (e) {
        throw new UserInputError(e.message)
      }
    },
    SignupVerification: async (_parent, args, context) => {
      const { termsAndConditionsAgreedVersion } = args
      const regEx = new RegExp(/^[0-9]+\.[0-9]+\.[0-9]+$/g)
      if (!regEx.test(termsAndConditionsAgreedVersion)) {
        throw new UserInputError('Invalid version format!')
      }
      args.termsAndConditionsAgreedAt = new Date().toISOString()

      let { nonce, email, inviteCode } = args
      email = normalizeEmail(email)
      delete args.nonce
      delete args.email
      delete args.inviteCode
      args = encryptPassword(args)

      const { driver } = context
      const session = driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createUserTransactionResponse = await transaction.run(signupCypher(inviteCode), {
          args,
          nonce,
          email,
          inviteCode,
        })
        const [user] = createUserTransactionResponse.records.map((record) => record.get('user'))
        if (!user) throw new UserInputError('Invalid email or nonce')
        return user
      })
      try {
        const user = await writeTxResultPromise
        return user
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('User with this slug already exists!')
        throw new UserInputError(e.message)
      } finally {
        session.close()
      }
    },
  },
}

const signupCypher = (inviteCode) => {
  let optionalMatch = ''
  let optionalMerge = ''
  let optionalSet = ''
  if (inviteCode) {
    optionalMatch = `
      OPTIONAL MATCH
      (inviteCode:InviteCode {code: $inviteCode})<-[:GENERATED]-(host:User)
      `
    optionalMerge = `
      MERGE(user)-[redeemed:REDEEMED]->(inviteCode)
      MERGE(host)-[invited:INVITED]->(user)
      MERGE(user)-[uFollowsH:FOLLOWS]->(host)
      MERGE(host)-[hFollowsU:FOLLOWS]->(user)
      `
    optionalSet = `
      SET redeemed.createdAt = user.createdAt
      SET invited.createdAt = user.createdAt
      SET uFollowsH.createdAt = user.createdAt
      SET hFollowsU.createdAt = user.createdAt
      `
  }
  const cypher = `
      MATCH(email:EmailAddress {nonce: $nonce, email: $email})
      WHERE NOT (email)-[:BELONGS_TO]->()
      ${optionalMatch}
      CREATE (user:User)
      MERGE(user)-[:PRIMARY_EMAIL]->(email)
      MERGE(user)<-[:BELONGS_TO]-(email)
      ${optionalMerge}
      SET user += $args
      SET user.id = randomUUID()
      SET user.role = 'user'
      SET user.createdAt = toString(datetime())
      SET user.updatedAt = user.createdAt
      SET user.allowEmbedIframes = FALSE
      SET user.showShoutsPublicly = FALSE
      SET email.verifiedAt = user.createdAt
      ${optionalSet}
      RETURN user {.*}
    `
  return cypher
}
