import CONFIG from '../../../config'
import { cleanHtml } from '../../../middleware/helpers/cleanHtml'
import nodemailer from 'nodemailer'
import { htmlToText } from 'nodemailer-html-to-text'

const hasEmailConfig = CONFIG.SMTP_HOST && CONFIG.SMTP_PORT
const hasAuthData = CONFIG.SMTP_USERNAME && CONFIG.SMTP_PASSWORD
const hasDKIMData =
  CONFIG.SMTP_DKIM_DOMAINNAME && CONFIG.SMTP_DKIM_KEYSELECTOR && CONFIG.SMTP_DKIM_PRIVATKEY

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
        } as any).replace(/&amp;/g, '&'),
      )
    }
  }
} else {
  sendMailCallback = async (templateArgs) => {
    const transporter = nodemailer.createTransport({
      host: CONFIG.SMTP_HOST,
      port: CONFIG.SMTP_PORT,
      ignoreTLS: CONFIG.SMTP_IGNORE_TLS,
      secure: CONFIG.SMTP_SECURE, // true for 465, false for other ports
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
