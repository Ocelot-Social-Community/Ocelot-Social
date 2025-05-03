// eslint-disable-next-line import/no-namespace
import * as SMTPTransport from 'nodemailer/lib/smtp-pool'

import CONFIG from '@config/index'

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_IGNORE_TLS,
  SMTP_SECURE,
  SMTP_MAX_CONNECTIONS,
  SMTP_MAX_MESSAGES,
  SMTP_DKIM_DOMAINNAME,
  SMTP_DKIM_KEYSELECTOR,
  SMTP_DKIM_PRIVATKEY,
} = CONFIG
const transportOptions: SMTPTransport.Options = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  ignoreTLS: SMTP_IGNORE_TLS,
  secure: SMTP_SECURE, // true for 465, false for other ports
  pool: true,
  maxConnections: SMTP_MAX_CONNECTIONS,
  maxMessages: SMTP_MAX_MESSAGES,
}
if (SMTP_USERNAME && SMTP_PASSWORD) {
  transportOptions.auth = {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD,
  }
}
if (SMTP_DKIM_DOMAINNAME && SMTP_DKIM_KEYSELECTOR && SMTP_DKIM_PRIVATKEY) {
  transportOptions.dkim = {
    domainName: SMTP_DKIM_DOMAINNAME,
    keySelector: SMTP_DKIM_KEYSELECTOR,
    privateKey: SMTP_DKIM_PRIVATKEY,
  }
}

export { transportOptions }
