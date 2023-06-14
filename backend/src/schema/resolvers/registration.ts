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
      /*
      if (emailAddress.user) {
        // what to do?
      }
      */
      if (emailAddress.alreadyExistingEmail) return emailAddress.alreadyExistingEmail
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
  if (inviteCode) {
    optionalMatch = `
      OPTIONAL MATCH
      (inviteCode:InviteCode {code: $inviteCode})<-[:GENERATED]-(host:User)
      `
    optionalMerge = `
      MERGE (user)-[:REDEEMED { createdAt: toString(datetime()) }]->(inviteCode)
      MERGE (host)-[:INVITED { createdAt: toString(datetime()) }]->(user)
      MERGE (user)-[:FOLLOWS { createdAt: toString(datetime()) }]->(host)
      MERGE (host)-[:FOLLOWS { createdAt: toString(datetime()) }]->(user)
      `
  }
  const cypher = `
      MATCH (email:EmailAddress {nonce: $nonce, email: $email})
      WHERE NOT (email)-[:BELONGS_TO]->()
      ${optionalMatch}
      CREATE (user:User)
      MERGE (user)-[:PRIMARY_EMAIL]->(email)
      MERGE (user)<-[:BELONGS_TO]-(email)
      ${optionalMerge}
      SET user += $args
      SET user.id = randomUUID()
      SET user.role = 'user'
      SET user.createdAt = toString(datetime())
      SET user.updatedAt = toString(datetime())
      SET user.allowEmbedIframes = false
      SET user.showShoutsPublicly = false
      SET user.sendNotificationEmails = true
      SET email.verifiedAt = toString(datetime())
      WITH user
      OPTIONAL MATCH (post:Post)-[:IN]->(group:Group)
        WHERE NOT group.groupType = 'public'
      WITH user, collect(post) AS invisiblePosts
      FOREACH (invisiblePost IN invisiblePosts |
        MERGE (user)-[:CANNOT_SEE]->(invisiblePost)
      )
      RETURN user {.*}
    `
  return cypher
}
