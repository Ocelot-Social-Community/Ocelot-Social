/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import path from 'node:path'

import Email from 'email-templates'
import { createTransport } from 'nodemailer'

import CONFIG from '@config/index'
import logosWebapp from '@config/logos'
import metadata from '@config/metadata'

import { i18n } from './i18n'

const hasEmailConfig = CONFIG.SMTP_HOST && CONFIG.SMTP_PORT
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

const transport = createTransport({
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

export const sendMail = async () => {
  i18n.setLocale('en')

  const email = new Email({
    message: {
      from: `${CONFIG.APPLICATION_NAME} – ${i18n.__('notification')}`,
    },
    transport,
    preview: {
      open: {
        app: 'brave-browser',
      },
    },
  })

  try {
    await email.send({
      template: path.join(__dirname, 'templates', 'removed_user_from_group'),
      message: {
        to: 'test@example.org',
      },
      locals: {
        ...defaultParams,
        name: 'Elon',
        postTitle: 'Mein genialer Beitrag',
        postUrl: new URL('/post/id/slug', CONFIG.CLIENT_URI),
        commentUrl: new URL('/post/id/slug#commentId-xxx', CONFIG.CLIENT_URI),
        chattingUser: 'SR-71',
        chatUrl: new URL('/chat', CONFIG.CLIENT_URI),
        groupUrl: new URL('/group/id/slug', CONFIG.CLIENT_URI),
        groupName: 'The Group',
      },
    })
  } catch (error) {
    console.log(error)
  }
}
