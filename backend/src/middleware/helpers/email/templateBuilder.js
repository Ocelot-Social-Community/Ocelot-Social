import mustache from 'mustache'
import CONFIG from '../../../config'
import metadata from '../../../config/metadata.js'
import logosWebapp from '../../../config/logos.js'

import * as templates from './templates'
import * as templatesEN from './templates/en'
import * as templatesDE from './templates/de'

const from = CONFIG.EMAIL_DEFAULT_SENDER
const welcomeImageUrl = new URL(logosWebapp.LOGO_WELCOME_PATH, CONFIG.CLIENT_URI)

const defaultParams = {
  welcomeImageUrl,
  APPLICATION_NAME: CONFIG.APPLICATION_NAME,
  ORGANIZATION_NAME: metadata.ORGANIZATION_NAME,
  ORGANIZATION_URL: CONFIG.ORGANIZATION_URL,
  supportUrl: CONFIG.SUPPORT_URL,
}
const englishHint = 'English version below!'

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
      { ...defaultParams, englishHint, actionUrl, nonce, subject },
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
      { ...defaultParams, englishHint, actionUrl, name, nonce, subject },
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
      { ...defaultParams, englishHint, actionUrl, name, nonce, subject },
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
      { ...defaultParams, englishHint, actionUrl },
      { content: templates.wrongAccount },
    ),
  }
}

export const notificationTemplate = ({ email, notification }) => {
  const actionUrl = new URL('/notifications', CONFIG.CLIENT_URI)
  const settingsUrl = new URL('/settings/notifications', CONFIG.CLIENT_URI)
  const renderParams = { ...defaultParams, name: notification.to.name, settingsUrl, actionUrl }
  let content
  switch (notification.to.locale) {
    case 'de':
      content = templatesDE.notification
      break
    case 'en':
      content = templatesEN.notification
      break

    default:
      content = templatesEN.notification
      break
  }
  const subjectUnrendered = content.split('\n')[0].split('"')[1]
  const subject = mustache.render(subjectUnrendered, renderParams, {})

  return {
    from,
    to: email,
    subject,
    html: mustache.render(templates.layout, renderParams, { content }),
  }
}
