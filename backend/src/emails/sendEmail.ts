/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import path from 'node:path'

import Email from 'email-templates'
import { createTransport } from 'nodemailer'

// import type Email as EmailType from '@types/email-templates'

import CONFIG, { nodemailerTransportOptions } from '@config/index'
import logosWebapp from '@config/logosBranded'
import metadata from '@config/metadata'
import { UserDbProperties } from '@db/types/User'

const welcomeImageUrl = new URL(logosWebapp.LOGO_WELCOME_PATH, CONFIG.CLIENT_URI)
const settingsUrl = new URL('/settings/notifications', CONFIG.CLIENT_URI)

const defaultParams = {
  welcomeImageUrl,
  APPLICATION_NAME: CONFIG.APPLICATION_NAME,
  ORGANIZATION_NAME: metadata.ORGANIZATION_NAME,
  ORGANIZATION_URL: CONFIG.ORGANIZATION_URL,
  supportUrl: CONFIG.SUPPORT_URL,
  settingsUrl,
  renderSettingsUrl: true,
}

const from = `${CONFIG.APPLICATION_NAME} <${CONFIG.EMAIL_DEFAULT_SENDER}>`

const transport = createTransport(nodemailerTransportOptions)

const email = new Email({
  message: {
    from,
  },
  transport,
  i18n: {
    locales: ['en', 'de'],
    defaultLocale: 'en',
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
  const to = notification?.email
  const name = notification?.to?.name
  const template = notification?.reason

  try {
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
            ? `/post/${notification?.from?.post?.id}/${notification?.from?.post?.slug}`
            : `/post/${notification?.from?.id}/${notification?.from?.slug}`,
          CONFIG.CLIENT_URI,
        ),
        postAuthorName:
          notification?.from?.__typename === 'Comment'
            ? undefined
            : notification?.from?.author?.name,
        postAuthorUrl:
          notification?.from?.__typename === 'Comment'
            ? undefined
            : new URL(
                `user/${notification?.from?.author?.id}/${notification?.from?.author?.slug}`,
                CONFIG.CLIENT_URI,
              ),
        commenterName:
          notification?.from?.__typename === 'Comment'
            ? notification?.from?.author?.name
            : undefined,
        commenterUrl:
          notification?.from?.__typename === 'Comment'
            ? new URL(
                `/user/${notification?.from?.author?.id}/${notification?.from?.author?.slug}`,
                CONFIG.CLIENT_URI,
              )
            : undefined,
        commentUrl:
          notification?.from?.__typename === 'Comment'
            ? new URL(
                `/post/${notification?.from?.post?.id}/${notification?.from?.post?.slug}#commentId-${notification?.from?.id}`,
                CONFIG.CLIENT_URI,
              )
            : undefined,
        // chattingUser: 'SR-71',
        // chatUrl: new URL('/chat', CONFIG.CLIENT_URI),
        groupUrl:
          notification?.from?.__typename === 'Group'
            ? new URL(
                `/group/${notification?.from?.id}/${notification?.from?.slug}`,
                CONFIG.CLIENT_URI,
              )
            : undefined,
        groupName:
          notification?.from?.__typename === 'Group' ? notification?.from?.name : undefined,
        groupRelatedUserName:
          notification?.from?.__typename === 'Group' ? notification?.relatedUser?.name : undefined,
        groupRelatedUserUrl:
          notification?.from?.__typename === 'Group'
            ? new URL(
                `/user/${notification?.relatedUser?.id}/${notification?.relatedUser?.slug}`,
                CONFIG.CLIENT_URI,
              )
            : undefined,
      },
    })
    return originalMessage as OriginalMessage
  } catch (error) {
    throw new Error(error)
  }
}

export interface ChatMessageEmailInput {
  senderUser: UserDbProperties
  recipientUser: UserDbProperties
  email: string
}

export const sendChatMessageMail = async (
  data: ChatMessageEmailInput,
): Promise<OriginalMessage> => {
  const { senderUser, recipientUser } = data
  const to = data.email
  try {
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
        chattingUserUrl: new URL(`/user/${senderUser.id}/${senderUser.slug}`, CONFIG.CLIENT_URI),
        chatUrl: new URL('/chat', CONFIG.CLIENT_URI),
      },
    })
    return originalMessage as OriginalMessage
  } catch (error) {
    throw new Error(error)
  }
}

interface VerifyMailInput {
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
  const { nonce, locale, inviteCode } = data
  const to = data.email
  const actionUrl = new URL('/registration', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', to)
  actionUrl.searchParams.set('nonce', nonce)
  if (inviteCode) {
    actionUrl.searchParams.set('inviteCode', inviteCode)
    actionUrl.searchParams.set('method', 'invite-code')
  } else {
    actionUrl.searchParams.set('method', 'invite-mail')
  }

  try {
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
  } catch (error) {
    throw new Error(error)
  }
}

interface EmailVerificationInput extends VerifyMailInput {
  name: string
}

export const sendEmailVerification = async (
  data: EmailVerificationInput,
): Promise<OriginalMessage> => {
  const { nonce, locale, name } = data
  const to = data.email
  const actionUrl = new URL('/settings/my-email-address/verify', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', to)
  actionUrl.searchParams.set('nonce', nonce)

  try {
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
  } catch (error) {
    throw new Error(error)
  }
}

export const sendResetPasswordMail = async (
  data: EmailVerificationInput,
): Promise<OriginalMessage> => {
  const { nonce, locale, name } = data
  const to = data.email
  const actionUrl = new URL('/password-reset/change-password', CONFIG.CLIENT_URI)
  actionUrl.searchParams.set('email', to)
  actionUrl.searchParams.set('nonce', nonce)
  try {
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
  } catch (error) {
    throw new Error(error)
  }
}

export const sendWrongEmail = async (data: {
  locale: string
  email: string
}): Promise<OriginalMessage> => {
  const { locale } = data
  const to = data.email
  const actionUrl = new URL('/password-reset/request', CONFIG.CLIENT_URI)
  try {
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
  } catch (error) {
    throw new Error(error)
  }
}
