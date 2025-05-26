/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable n/no-process-env */
import { config } from 'dotenv'
// eslint-disable-next-line import/no-namespace
import * as SMTPTransport from 'nodemailer/lib/smtp-pool'

import emails from './emails'
import metadata from './metadata'

// Load env file
config()

// Use Cypress env or process.env
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let Cypress: any | undefined
const env = (typeof Cypress !== 'undefined' ? Cypress.env() : process.env) as typeof process.env

const environment = {
  NODE_ENV: env.NODE_ENV ?? process.env.NODE_ENV,
  DEBUG: env.NODE_ENV !== 'production' && env.DEBUG,
  TEST: env.NODE_ENV === 'test',
  PRODUCTION: env.NODE_ENV === 'production',
  // used for staging enviroments if 'PRODUCTION=true' and 'PRODUCTION_DB_CLEAN_ALLOW=true'
  PRODUCTION_DB_CLEAN_ALLOW: env.PRODUCTION_DB_CLEAN_ALLOW === 'true' || false, // default = false
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  DISABLED_MIDDLEWARES: ['test', 'development'].includes(env.NODE_ENV!)
    ? (env.DISABLED_MIDDLEWARES?.split(',') ?? [])
    : [],
  SEND_MAIL: env.NODE_ENV !== 'test',
  LOG_LEVEL: 'DEBUG',
}

const server = {
  CLIENT_URI: env.CLIENT_URI ?? 'http://localhost:3000',
  GRAPHQL_URI: env.GRAPHQL_URI ?? 'http://localhost:4000',
  JWT_EXPIRES: env.JWT_EXPIRES ?? '2y',
}

const SMTP_HOST = env.SMTP_HOST
const SMTP_PORT = (env.SMTP_PORT && parseInt(env.SMTP_PORT)) || undefined
const SMTP_IGNORE_TLS = env.SMTP_IGNORE_TLS !== 'false' // default = true
const SMTP_SECURE = env.SMTP_SECURE === 'true'
const SMTP_USERNAME = env.SMTP_USERNAME
const SMTP_PASSWORD = env.SMTP_PASSWORD
const SMTP_DKIM_DOMAINNAME = env.SMTP_DKIM_DOMAINNAME
const SMTP_DKIM_KEYSELECTOR = env.SMTP_DKIM_KEYSELECTOR
// PEM format = https://docs.progress.com/bundle/datadirect-hybrid-data-pipeline-installation-46/page/PEM-file-format.html
const SMTP_DKIM_PRIVATKEY = env.SMTP_DKIM_PRIVATKEY?.replace(/\\n/g, '\n') // replace all "\n" in .env string by real line break
const SMTP_MAX_CONNECTIONS = (env.SMTP_MAX_CONNECTIONS && parseInt(env.SMTP_MAX_CONNECTIONS)) || 5
const SMTP_MAX_MESSAGES = (env.SMTP_MAX_MESSAGES && parseInt(env.SMTP_MAX_MESSAGES)) || 100

const nodemailerTransportOptions: SMTPTransport.Options = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  ignoreTLS: SMTP_IGNORE_TLS,
  secure: SMTP_SECURE, // true for 465, false for other ports
  pool: true,
  maxConnections: SMTP_MAX_CONNECTIONS,
  maxMessages: SMTP_MAX_MESSAGES,
}
if (SMTP_USERNAME && SMTP_PASSWORD) {
  nodemailerTransportOptions.auth = {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD,
  }
}
if (SMTP_DKIM_DOMAINNAME && SMTP_DKIM_KEYSELECTOR && SMTP_DKIM_PRIVATKEY) {
  nodemailerTransportOptions.dkim = {
    domainName: SMTP_DKIM_DOMAINNAME,
    keySelector: SMTP_DKIM_KEYSELECTOR,
    privateKey: SMTP_DKIM_PRIVATKEY,
  }
}

const neo4j = {
  NEO4J_URI: env.NEO4J_URI ?? 'bolt://localhost:7687',
  NEO4J_USERNAME: env.NEO4J_USERNAME ?? 'neo4j',
  NEO4J_PASSWORD: env.NEO4J_PASSWORD ?? 'neo4j',
}

const sentry = {
  SENTRY_DSN_BACKEND: env.SENTRY_DSN_BACKEND,
  COMMIT: env.COMMIT,
}

const redis = {
  REDIS_DOMAIN: env.REDIS_DOMAIN,
  REDIS_PORT: (env.REDIS_PORT && parseInt(env.REDIS_PORT)) || undefined,
  REDIS_PASSWORD: env.REDIS_PASSWORD,
}

const required = {
  AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT: env.AWS_ENDPOINT,
  AWS_REGION: env.AWS_REGION,
  AWS_BUCKET: env.AWS_BUCKET,

  MAPBOX_TOKEN: env.MAPBOX_TOKEN,
  JWT_SECRET: env.JWT_SECRET,
  PRIVATE_KEY_PASSPHRASE: env.PRIVATE_KEY_PASSPHRASE,
}

const IMAGOR_SECRET = env.IMAGOR_SECRET
const S3_PUBLIC_GATEWAY = env.S3_PUBLIC_GATEWAY

// https://stackoverflow.com/a/53050575
type NoUndefinedField<T> = { [P in keyof T]-?: NoUndefinedField<NonNullable<T[P]>> }

function assertRequiredConfig(
  conf: typeof required,
): asserts conf is NoUndefinedField<typeof required> {
  Object.entries(conf).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`ERROR: "${key}" env variable is missing.`)
    }
  })
}

assertRequiredConfig(required)

const options = {
  EMAIL_DEFAULT_SENDER: env.EMAIL_DEFAULT_SENDER,
  SUPPORT_EMAIL: env.SUPPORT_EMAIL,
  SUPPORT_URL: emails.SUPPORT_LINK,
  APPLICATION_NAME: metadata.APPLICATION_NAME,
  ORGANIZATION_URL: emails.ORGANIZATION_LINK,
  PUBLIC_REGISTRATION: env.PUBLIC_REGISTRATION === 'true' || false,
  INVITE_REGISTRATION: env.INVITE_REGISTRATION !== 'false', // default = true
  INVITE_CODES_PERSONAL_PER_USER:
    (env.INVITE_CODES_PERSONAL_PER_USER && parseInt(env.INVITE_CODES_PERSONAL_PER_USER)) || 7,
  INVITE_CODES_GROUP_PER_USER:
    (env.INVITE_CODES_GROUP_PER_USER && parseInt(env.INVITE_CODES_GROUP_PER_USER)) || 7,
  CATEGORIES_ACTIVE: process.env.CATEGORIES_ACTIVE === 'true' || false,
  MAX_PINNED_POSTS: Number.isNaN(Number(process.env.MAX_PINNED_POSTS))
    ? 1
    : Number(process.env.MAX_PINNED_POSTS),
}

const language = {
  LANGUAGE_DEFAULT: process.env.LANGUAGE_DEFAULT ?? 'en',
}

const CONFIG = {
  ...environment,
  ...server,
  ...required,
  ...neo4j,
  ...sentry,
  ...redis,
  ...options,
  ...language,
  IMAGOR_SECRET,
  S3_PUBLIC_GATEWAY,
}

export type Config = typeof CONFIG
export type S3Config = Pick<
  Config,
  | 'AWS_ACCESS_KEY_ID'
  | 'AWS_SECRET_ACCESS_KEY'
  | 'AWS_ENDPOINT'
  | 'AWS_REGION'
  | 'AWS_BUCKET'
  | 'IMAGOR_SECRET'
  | 'S3_PUBLIC_GATEWAY'
>
export default CONFIG

export { nodemailerTransportOptions }
