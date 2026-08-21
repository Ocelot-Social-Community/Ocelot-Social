/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import path from 'node:path'

import Email from 'email-templates'
import { createTransport } from 'nodemailer'

// import type Email as EmailType from '@types/email-templates'

import CONFIG, { nodemailerTransportOptions } from '@config/index'
import { SUPPORTED_LOCALES } from '@config/locales'
import { branding } from '@src/branding'

import type { User } from '@db/schema/entities/User'
import type { EntityProperties } from '@db/schema/types'

const settingsUrl = new URL('/settings/notifications', CONFIG.CLIENT_URI)

/**
 * The locals every mail starts from. Spread into `locals` at send time (`...defaultParams`), which is
 * what evaluates the getters below — so the brand is read when a mail is RENDERED, not when this
 * module happens to be imported.
 *
 * That distinction is the whole point. `branding` is built as an access-time accessor (each domain is
 * a getter over getBranding(); see @ocelot-social/branding index.ts), and reading it into a plain
 * property here would freeze whatever was set at import time. It works today only because
 * src/index.ts imports ./branding/bootstrap FIRST — an ordering nothing enforces. Any other way in
 * (a test, a script, a worker or cron sender that does not go through src/index.ts) would silently
 * render the framework defaults: an ocelot-green logo at /img/custom/… on a branded network, which
 * is exactly the kind of failure nobody reports as a bug because the mail still looks like a mail.
 *
 * The CONFIG values stay plain properties: they come from the environment, are fixed for the process,
 * and SUPPORT_EMAIL is deliberately writable/deletable — the mails render a "with support" and a
 * "without support" variant, and the tests reach the latter via `delete defaultParams.SUPPORT_EMAIL`.
 */
export const defaultParams = {
  get welcomeImageUrl(): URL {
    return new URL(branding.logos.welcomePath, CONFIG.CLIENT_URI)
  },
  APPLICATION_NAME: CONFIG.APPLICATION_NAME,
  get ORGANIZATION_NAME(): string {
    return branding.metadata.organizationName
  },
  ORGANIZATION_URL: CONFIG.ORGANIZATION_URL,
  // CONFIG always supplies a value now (software default), so widen the type to keep the
  // "without support" path valid.
  SUPPORT_EMAIL: CONFIG.SUPPORT_EMAIL as string | undefined,
  supportUrl: CONFIG.SUPPORT_URL,
  settingsUrl,
  renderSettingsUrl: true,
}

const from = { name: CONFIG.APPLICATION_NAME, address: CONFIG.EMAIL_DEFAULT_SENDER }

const transport = createTransport(nodemailerTransportOptions)

const email = new Email({
  message: {
    from,
  },
  transport,
  i18n: {
    locales: [...SUPPORTED_LOCALES],
    defaultLocale: CONFIG.LANGUAGE_DEFAULT,
    retryInDefaultLocale: false,
    directory: path.join(__dirname, 'locales'),
    updateFiles: false,
    objectNotation: true,
    mustacheConfig: {
      tags: ['{', '}'],
      disable: false,
    },
  },
  send: CONFIG.SEND_MAIL,
  preview: false,
  // This is very useful to see the emails sent by the unit tests
  /*
  preview: {
    open: {
      app: 'brave-browser',
    },
  },
  */
})

interface OriginalMessage {
  to: string
  from: string
  attachments: string[]
  subject: string
  html: string
  text: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendNotificationMail = async (notification: any): Promise<OriginalMessage> => {
  const locale = notification?.to?.locale
  const name = notification?.to?.name
  const to = { name, address: notification?.email }
  const template = notification?.reason

  const { originalMessage } = await email.send({
    template: path.join(__dirname, 'templates', template),
    message: {
      to,
    },
    locals: {
      ...defaultParams,
      locale,
      name,
      postTitle:
        notification?.from?.__typename === 'Comment'
          ? notification?.from?.post?.title
          : notification?.from?.title,
      postUrl: new URL(
        notification?.from?.__typename === 'Comment'
          ? `/post/${encodeURIComponent(notification?.from?.post?.id)}/${encodeURIComponent(notification?.from?.post?.slug)}`
          : `/post/${encodeURIComponent(notification?.from?.id)}/${encodeURIComponent(notification?.from?.slug)}`,
        CONFIG.CLIENT_URI,
      ),
      postAuthorName:
        notification?.from?.__typename === 'Comment' ? undefined : notification?.from?.author?.name,
      postAuthorUrl:
        notification?.from?.__typename === 'Comment'
          ? undefined
          : new URL(
              `profile/${encodeURIComponent(notification?.from?.author?.id)}/${encodeURIComponent(notification?.from?.author?.slug)}`,
              CONFIG.CLIENT_URI,
            ),
      commenterName:
        notification?.from?.__typename === 'Comment' ? notification?.from?.author?.name : undefined,
      commenterUrl:
        notification?.from?.__typename === 'Comment'
          ? new URL(
              `/profile/${encodeURIComponent(notification?.from?.author?.id)}/${encodeURIComponent(notification?.from?.author?.slug)}`,
              CONFIG.CLIENT_URI,
            )
          : undefined,
      commentUrl:
        notification?.from?.__typename === 'Comment'
          ? new URL(
              `/post/${encodeURIComponent(notification?.from?.post?.id)}/${encodeURIComponent(notification?.from?.post?.slug)}#commentId-${encodeURIComponent(notification?.from?.id)}`,
              CONFIG.CLIENT_URI,
            )
          : undefined,
      // chattingUser: 'SR-71',
      // chatUrl: new URL('/chat', CONFIG.CLIENT_URI),
      groupUrl:
        notification?.from?.__typename === 'Group'
          ? new URL(
              `/groups/${encodeURIComponent(notification?.from?.id)}/${encodeURIComponent(notification?.from?.slug)}`,
              CONFIG.CLIENT_URI,
            )
          : undefined,
      groupName: notification?.from?.__typename === 'Group' ? notification?.from?.name : undefined,
      groupRelatedUserName:
        notification?.from?.__typename === 'Group' ? notification?.relatedUser?.name : undefined,
      groupRelatedUserUrl:
        notification?.from?.__typename === 'Group'
          ? new URL(
              `/profile/${encodeURIComponent(notification?.relatedUser?.id)}/${encodeURIComponent(notification?.relatedUser?.slug)}`,
              CONFIG.CLIENT_URI,
            )
          : undefined,
    },
  })
  return originalMessage as OriginalMessage
}

export interface ChatMessageEmailInput {
  senderUser: EntityProperties<typeof User>
  recipientUser: EntityProperties<typeof User>
  email: string
}

export const sendChatMessageMail = async (
  data: ChatMessageEmailInput,
): Promise<OriginalMessage> => {
  const { senderUser, recipientUser } = data
  const to = { name: recipientUser.name, address: data.email }
  const { originalMessage } = await email.send({
    template: path.join(__dirname, 'templates', 'chat_message'),
    message: {
      to,
    },
    locals: {
      ...defaultParams,
      locale: recipientUser.locale,
      name: recipientUser.name,
      chattingUser: senderUser.name,
      chattingUserUrl: new URL(
        `/profile/${encodeURIComponent(senderUser.id)}/${encodeURIComponent(senderUser.slug)}`,
        CONFIG.CLIENT_URI,
      ),
      chatUrl: new URL('/chat', CONFIG.CLIENT_URI),
    },
  })
  return originalMessage as OriginalMessage
}

interface VerifyMailInput {
  name: string
  email: string
  nonce: string
  locale: string
}

interface RegistrationMailInput extends VerifyMailInput {
  inviteCode?: string
}

export const sendRegistrationMail = async (
  data: RegistrationMailInput,
): Promise<OriginalMessage> => {
  const { name, nonce, locale, inviteCode } = data
  const to = { name, address: data.email }
  const actionUrl = new URL('/registration', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', to.address)
  actionUrl.searchParams.set('nonce', nonce)
  if (inviteCode) {
    actionUrl.searchParams.set('inviteCode', inviteCode)
    actionUrl.searchParams.set('method', 'invite-code')
  } else {
    actionUrl.searchParams.set('method', 'invite-mail')
  }

  const { originalMessage } = await email.send({
    template: path.join(__dirname, 'templates', 'registration'),
    message: {
      to,
    },
    locals: {
      ...defaultParams,
      locale,
      actionUrl,
      nonce,
      renderSettingsUrl: false,
    },
  })
  return originalMessage as OriginalMessage
}

interface EmailVerificationInput extends VerifyMailInput {
  name: string
}

export const sendEmailVerification = async (
  data: EmailVerificationInput,
): Promise<OriginalMessage> => {
  const { nonce, locale, name } = data
  const to = { name, address: data.email }
  const actionUrl = new URL('/settings/my-email-address/verify', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', to.address)
  actionUrl.searchParams.set('nonce', nonce)

  const { originalMessage } = await email.send({
    template: path.join(__dirname, 'templates', 'emailVerification'),
    message: {
      to,
    },
    locals: {
      ...defaultParams,
      locale,
      actionUrl,
      nonce,
      name,
      renderSettingsUrl: false,
    },
  })
  return originalMessage as OriginalMessage
}

export const sendResetPasswordMail = async (
  data: EmailVerificationInput,
): Promise<OriginalMessage> => {
  const { nonce, locale, name } = data
  const to = { name, address: data.email }
  const actionUrl = new URL('/password-reset/change-password', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', to.address)
  actionUrl.searchParams.set('nonce', nonce)
  const { originalMessage } = await email.send({
    template: path.join(__dirname, 'templates', 'resetPassword'),
    message: {
      to,
    },
    locals: {
      ...defaultParams,
      locale,
      actionUrl,
      nonce,
      name,
      renderSettingsUrl: false,
    },
  })
  return originalMessage as OriginalMessage
}

export const sendWrongEmail = async (data: {
  name: string
  locale: string
  email: string
}): Promise<OriginalMessage> => {
  const { locale, name } = data
  const to = { name, address: data.email }
  const actionUrl = new URL('/password-reset/request', CONFIG.CLIENT_URI)
  const { originalMessage } = await email.send({
    template: path.join(__dirname, 'templates', 'wrongEmail'),
    message: {
      to,
    },
    locals: {
      ...defaultParams,
      locale,
      actionUrl,
      renderSettingsUrl: false,
    },
  })
  return originalMessage as OriginalMessage
}
