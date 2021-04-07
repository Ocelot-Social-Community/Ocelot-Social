import mustache from 'mustache'
import CONFIG from '../../config'

import * as templates from './templates'

const from = CONFIG.EMAIL_DEFAULT_SENDER
const welcomeImageUrl = new URL(`/img/custom/welcome.svg`, CONFIG.CLIENT_URI)

const defaultParams = {
  supportUrl: CONFIG.SUPPORT_URL,
  APPLICATION_NAME: CONFIG.APPLICATION_NAME,
  ORGANIZATION_URL: CONFIG.ORGANIZATION_URL,
  welcomeImageUrl,
}

export const signupTemplate = ({ email, nonce, inviteCode = null }) => {
  const subject = `Willkommen, Bienvenue, Welcome to ${CONFIG.APPLICATION_NAME}!`
  // dev format example: http://localhost:3000/registration?method=invite-mail&email=wolle.huss%40pjannto.com&nonce=64853
  const actionUrl = new URL('/registration', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', email)
  actionUrl.searchParams.set('nonce', nonce)
  if (inviteCode) {
    actionUrl.searchParams.set('inviteCode', inviteCode)
    actionUrl.searchParams.set('method', 'invite-code')
  } else {
    actionUrl.searchParams.set('method', 'invite-mail')
  }

  return {
    from,
    to: email,
    subject,
    html: mustache.render(
      templates.layout,
      { ...defaultParams, actionUrl, nonce, subject },
      { content: templates.signup },
    ),
  }
}

export const emailVerificationTemplate = ({ email, nonce, name }) => {
  const subject = 'Neue E-Mail Adresse | New E-Mail Address'
  const actionUrl = new URL('/settings/my-email-address/verify', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', email)
  actionUrl.searchParams.set('nonce', nonce)

  return {
    from,
    to: email,
    subject,
    html: mustache.render(
      templates.layout,
      { ...defaultParams, actionUrl, name, nonce, subject },
      { content: templates.emailVerification },
    ),
  }
}

export const resetPasswordTemplate = ({ email, nonce, name }) => {
  const subject = 'Neues Passwort | Reset Password'
  const actionUrl = new URL('/password-reset/change-password', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('nonce', nonce)
  actionUrl.searchParams.set('email', email)

  return {
    from,
    to: email,
    subject,
    html: mustache.render(
      templates.layout,
      { ...defaultParams, actionUrl, name, nonce, subject },
      { content: templates.passwordReset },
    ),
  }
}

export const wrongAccountTemplate = ({ email }) => {
  const subject = 'Falsche Mailadresse? | Wrong E-mail?'
  const actionUrl = new URL('/password-reset/request', CONFIG.CLIENT_URI)

  return {
    from,
    to: email,
    subject,
    html: mustache.render(
      templates.layout,
      { ...defaultParams, actionUrl, supportUrl: CONFIG.SUPPORT_URL, welcomeImageUrl },
      { content: templates.wrongAccount },
    ),
  }
}
