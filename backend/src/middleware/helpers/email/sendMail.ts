/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTransport } from 'nodemailer'
import { htmlToText } from 'nodemailer-html-to-text'

import CONFIG, { nodemailerTransportOptions } from '@config/index'
import { cleanHtml } from '@middleware/helpers/cleanHtml'

const hasEmailConfig = nodemailerTransportOptions.host && nodemailerTransportOptions.port

const transporter = createTransport(nodemailerTransportOptions)

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
