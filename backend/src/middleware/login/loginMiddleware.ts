import { sendMail } from '../helpers/email/sendMail'
import {
  signupTemplate,
  resetPasswordTemplate,
  wrongAccountTemplate,
  emailVerificationTemplate,
} from '../helpers/email/templateBuilder'

const sendSignupMail = async (resolve, root, args, context, resolveInfo) => {
  const { inviteCode } = args
  const response = await resolve(root, args, context, resolveInfo)
  const { email, nonce } = response
  if (nonce) {
    // emails that already exist do not have a nonce
    if (inviteCode) {
      await sendMail(signupTemplate({ email, variables: { nonce, inviteCode } }))
    } else {
      await sendMail(signupTemplate({ email, variables: { nonce } }))
    }
  }
  delete response.nonce
  return response
}

const sendPasswordResetMail = async (resolve, root, args, context, resolveInfo) => {
  const { email } = args
  const { email: userFound, nonce, name } = await resolve(root, args, context, resolveInfo)
  const template = userFound ? resetPasswordTemplate : wrongAccountTemplate
  await sendMail(template({ email, variables: { nonce, name } }))
  return true
}

const sendEmailVerificationMail = async (resolve, root, args, context, resolveInfo) => {
  const response = await resolve(root, args, context, resolveInfo)
  const { email, nonce, name } = response
  if (nonce) {
    await sendMail(emailVerificationTemplate({ email, variables: { nonce, name } }))
  }
  delete response.nonce
  return response
}

export default {
  Mutation: {
    AddEmailAddress: sendEmailVerificationMail,
    requestPasswordReset: sendPasswordResetMail,
    Signup: sendSignupMail,
  },
}
