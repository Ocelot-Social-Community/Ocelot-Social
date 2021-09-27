import CONFIG from '../../../config'
import nodemailer from 'nodemailer'
import { htmlToText } from 'nodemailer-html-to-text'

const hasEmailConfig = CONFIG.SMTP_HOST && CONFIG.SMTP_PORT
const hasAuthData = CONFIG.SMTP_USERNAME && CONFIG.SMTP_PASSWORD

let sendMailCallback = async () => {}
if (!hasEmailConfig) {
  if (!CONFIG.TEST) {
    // eslint-disable-next-line no-console
    console.log('Warning: Middlewares will not try to send mails.')
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
