/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import path from 'node:path'

import Email from 'email-templates'
import { createTransport } from 'nodemailer'

import CONFIG from '@config/index'
import logosWebapp from '@config/logos'
import metadata from '@config/metadata'

const hasAuthData = CONFIG.SMTP_USERNAME && CONFIG.SMTP_PASSWORD
const hasDKIMData =
  CONFIG.SMTP_DKIM_DOMAINNAME && CONFIG.SMTP_DKIM_KEYSELECTOR && CONFIG.SMTP_DKIM_PRIVATKEY

const welcomeImageUrl = new URL(logosWebapp.LOGO_WELCOME_PATH, CONFIG.CLIENT_URI)
const settingsUrl = new URL('/settings/notifications', CONFIG.CLIENT_URI)

const defaultParams = {
  welcomeImageUrl,
  APPLICATION_NAME: CONFIG.APPLICATION_NAME,
  ORGANIZATION_NAME: metadata.ORGANIZATION_NAME,
  ORGANIZATION_URL: CONFIG.ORGANIZATION_URL,
  supportUrl: CONFIG.SUPPORT_URL,
  settingsUrl,
}

export const transport = createTransport({
  host: CONFIG.SMTP_HOST,
  port: CONFIG.SMTP_PORT,
  ignoreTLS: CONFIG.SMTP_IGNORE_TLS,
  secure: CONFIG.SMTP_SECURE, // true for 465, false for other ports
  pool: true,
  maxConnections: CONFIG.SMTP_MAX_CONNECTIONS,
  maxMessages: CONFIG.SMTP_MAX_MESSAGES,
  auth: hasAuthData && {
    user: CONFIG.SMTP_USERNAME,
    pass: CONFIG.SMTP_PASSWORD,
  },
  dkim: hasDKIMData && {
    domainName: CONFIG.SMTP_DKIM_DOMAINNAME,
    keySelector: CONFIG.SMTP_DKIM_KEYSELECTOR,
    privateKey: CONFIG.SMTP_DKIM_PRIVATKEY,
  },
})

const email = new Email({
  message: {
    from: `${CONFIG.APPLICATION_NAME}`,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendMail = async (notification: any) => {
  const locale = notification?.to?.locale
  const to = notification?.email
  const name = notification?.to?.name
  const template = notification?.reason

  try {
    await email.send({
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
  } catch (error) {
    throw new Error(error)
  }
}
