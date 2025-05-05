/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  sendRegistrationMail,
  sendEmailVerification,
  sendResetPasswordMail,
  sendWrongEmail,
} from '@src/emails/sendEmail'

const sendSignupMail = async (resolve, root, args, context, resolveInfo) => {
  const { inviteCode, locale } = args
  const response = await resolve(root, args, context, resolveInfo)
  const { email, nonce } = response
  if (nonce) {
    // emails that already exist do not have a nonce
    if (inviteCode) {
      await sendRegistrationMail({ email, nonce, locale, inviteCode })
    } else {
      await sendRegistrationMail({ email, nonce, locale })
    }
  }
  delete response.nonce
  return response
}

const sendPasswordResetMail = async (resolve, root, args, context, resolveInfo) => {
  const { email, locale } = args
  const { email: userFound, nonce, name } = await resolve(root, args, context, resolveInfo)
  if (userFound) {
    await sendResetPasswordMail({ email, nonce, name, locale })
  } else {
    await sendWrongEmail({ email, locale })
  }
  return true
}

const sendEmailVerificationMail = async (resolve, root, args, context, resolveInfo) => {
  const response = await resolve(root, args, context, resolveInfo)
  const { email, nonce, name, locale } = response
  if (nonce) {
    await sendEmailVerification({ email, nonce, name, locale })
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
