/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTransport } from 'nodemailer'
import { htmlToText } from 'nodemailer-html-to-text'

import CONFIG from '@config/index'
import { cleanHtml } from '@middleware/helpers/cleanHtml'

const hasEmailConfig = CONFIG.SMTP_HOST && CONFIG.SMTP_PORT
const hasAuthData = CONFIG.SMTP_USERNAME && CONFIG.SMTP_PASSWORD
const hasDKIMData =
  CONFIG.SMTP_DKIM_DOMAINNAME && CONFIG.SMTP_DKIM_KEYSELECTOR && CONFIG.SMTP_DKIM_PRIVATKEY

const transporter = createTransport({
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function
let sendMailCallback: any = async () => {}
if (!hasEmailConfig) {
  if (!CONFIG.TEST) {
    // eslint-disable-next-line no-console
    console.log('Warning: Middlewares will not try to send mails.')
    // TODO: disable e-mail logging on database seeding?
    // TODO: implement general logging like 'log4js', see Gradido project: https://github.com/gradido/gradido/blob/master/backend/log4js-config.json
    sendMailCallback = async (templateArgs) => {
      // eslint-disable-next-line no-console
      console.log('--- Log Unsend E-Mail ---')
      // eslint-disable-next-line no-console
      console.log('To: ' + templateArgs.to)
      // eslint-disable-next-line no-console
      console.log('From: ' + templateArgs.from)
      // eslint-disable-next-line no-console
      console.log('Subject: ' + templateArgs.subject)
      // eslint-disable-next-line no-console
      console.log('Content:')
      // eslint-disable-next-line no-console
      console.log(
        cleanHtml(templateArgs.html, 'dummyKey', {
          allowedTags: ['a'],
          allowedAttributes: { a: ['href'] },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).replace(/&amp;/g, '&'),
      )
    }
  }
} else {
  sendMailCallback = async (templateArgs) => {
    transporter.use(
      'compile',
      htmlToText({
        ignoreImage: true,
        wordwrap: false,
      }),
    )

    await transporter.sendMail(templateArgs)
  }
}

export const sendMail = sendMailCallback
