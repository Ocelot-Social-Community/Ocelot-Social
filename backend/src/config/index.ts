/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable import-x/no-namespace */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

/* eslint-disable n/no-process-env */
import { config } from 'dotenv'

import { branding } from '@src/branding'

import { resolveLocale } from './locales'
import { SOFTWARE_DEFAULTS } from './softwareDefaults'

import type * as SMTPTransport from 'nodemailer/lib/smtp-pool'

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
  PRODUCTION_DB_CLEAN_ALLOW: env.PRODUCTION_DB_CLEAN_ALLOW === 'true', // default = SOFTWARE_DEFAULTS.PRODUCTION_DB_CLEAN_ALLOW (false)
  // split→trim→filter so an empty DISABLED_MIDDLEWARES yields [] rather than [''] (which
  // matches no middleware but prints a spurious `Disabled "" middleware` warning); trim also
  // tolerates "a, b".
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  DISABLED_MIDDLEWARES: ['test', 'development'].includes(env.NODE_ENV!)
    ? (env.DISABLED_MIDDLEWARES?.split(',')
        .map((name) => name.trim())
        .filter(Boolean) ?? [])
    : [],
  SEND_MAIL: env.NODE_ENV !== 'test',
  LOG_LEVEL: 'DEBUG',
  PROXY_S3: env.PROXY_S3,
}

const server = {
  // `||` (not `??`): for these an empty string is a misconfiguration, so fall back to the
  // working default rather than let '' through — an empty CLIENT_URI/GRAPHQL_URI crashes
  // `new URL(path, '')`, and an empty JWT_EXPIRES is rejected by jwt.sign at token issuance.
  CLIENT_URI: env.CLIENT_URI || SOFTWARE_DEFAULTS.CLIENT_URI,
  GRAPHQL_URI: env.GRAPHQL_URI || SOFTWARE_DEFAULTS.GRAPHQL_URI,
  JWT_EXPIRES: env.JWT_EXPIRES || SOFTWARE_DEFAULTS.JWT_EXPIRES,
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
const SMTP_DKIM_PRIVATEKEY = env.SMTP_DKIM_PRIVATEKEY?.replace(/\\n/g, '\n') // replace all "\n" in .env string by real line break
const SMTP_MAX_CONNECTIONS =
  (env.SMTP_MAX_CONNECTIONS && parseInt(env.SMTP_MAX_CONNECTIONS)) ||
  SOFTWARE_DEFAULTS.SMTP_MAX_CONNECTIONS
const SMTP_MAX_MESSAGES =
  (env.SMTP_MAX_MESSAGES && parseInt(env.SMTP_MAX_MESSAGES)) || SOFTWARE_DEFAULTS.SMTP_MAX_MESSAGES
const SMTP_REJECT_UNAUTHORIZED = env.SMTP_REJECT_UNAUTHORIZED !== 'false' // default = true

const nodemailerTransportOptions: SMTPTransport.Options = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  ignoreTLS: SMTP_IGNORE_TLS,
  secure: SMTP_SECURE, // true for 465, false for other ports
  pool: true,
  maxConnections: SMTP_MAX_CONNECTIONS,
  maxMessages: SMTP_MAX_MESSAGES,
  tls: {
    rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED,
  },
}
if (SMTP_USERNAME && SMTP_PASSWORD) {
  nodemailerTransportOptions.auth = {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD,
  }
}
if (SMTP_DKIM_DOMAINNAME && SMTP_DKIM_KEYSELECTOR && SMTP_DKIM_PRIVATEKEY) {
  nodemailerTransportOptions.dkim = {
    domainName: SMTP_DKIM_DOMAINNAME,
    keySelector: SMTP_DKIM_KEYSELECTOR,
    privateKey: SMTP_DKIM_PRIVATEKEY,
  }
}

const neo4j = {
  NEO4J_URI: env.NEO4J_URI ?? SOFTWARE_DEFAULTS.NEO4J_URI,
  NEO4J_USERNAME: env.NEO4J_USERNAME ?? SOFTWARE_DEFAULTS.NEO4J_USERNAME,
  NEO4J_PASSWORD: env.NEO4J_PASSWORD ?? SOFTWARE_DEFAULTS.NEO4J_PASSWORD,
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

// Normalise the LiveKit URL so the rest of the codebase can rely on it
// having a protocol prefix. The frontend uses wss:// for the realtime
// connection; the backend later converts to https:// for the RoomService
// REST calls. If the user supplies bare host (`livekit.example.com`) we
// default to wss://.
const LIVEKIT_URL = (() => {
  const raw = env.LIVEKIT_URL
  if (!raw) {
    return undefined
  }
  if (/^(wss?:|https?:)\/\//.test(raw)) {
    return raw
  }
  return `wss://${raw}`
})()
const LIVEKIT_API_KEY = env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = env.LIVEKIT_API_SECRET
const livekit = {
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_ENABLED: !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET),
}

const required = {
  EMAIL_DEFAULT_SENDER: env.EMAIL_DEFAULT_SENDER,

  AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT: env.AWS_ENDPOINT,
  AWS_REGION: env.AWS_REGION,
  AWS_BUCKET: env.AWS_BUCKET,

  IMAGOR_PUBLIC_URL: env.IMAGOR_PUBLIC_URL,
  IMAGOR_SECRET: env.IMAGOR_SECRET,

  MAPBOX_TOKEN: env.MAPBOX_TOKEN,
  JWT_SECRET: env.JWT_SECRET,
}

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
  // Contact / organisation identity — env-sourced (surfaced read-only in the admin env tab,
  // not policy-overridable), with the ocelot baseline as software default. `||` (not `??`):
  // an empty value is a misconfiguration, so fall back rather than show a blank support
  // address / link. The env var names are SUPPORT_LINK / ORGANIZATION_LINK.
  SUPPORT_EMAIL: env.SUPPORT_EMAIL || SOFTWARE_DEFAULTS.SUPPORT_EMAIL,
  SUPPORT_URL: env.SUPPORT_LINK || SOFTWARE_DEFAULTS.SUPPORT_LINK,
  APPLICATION_NAME: branding.metadata.applicationName,
  ORGANIZATION_URL: env.ORGANIZATION_LINK || SOFTWARE_DEFAULTS.ORGANIZATION_LINK,
  // publicRegistration, inviteRegistration, categoriesActive and apiKeysEnabled
  // are network-policy keys now — the backend reads them from the policy
  // (ENV-seeded), not from CONFIG. See backend/src/policy.
}

const language = {
  // Validate against the supported locales and fall back — an empty or invalid
  // LANGUAGE_DEFAULT (e.g. '' or 'xx') must NOT become the app-wide default locale
  // (`??` alone would let it through), which drives email localisation and the request
  // context's languageDefault. Read via `env` (not `process.env`) so a Cypress.env() override
  // is honoured, consistent with every other read above.
  LANGUAGE_DEFAULT: resolveLocale(env.LANGUAGE_DEFAULT, SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT),
}

const CONFIG = {
  ...environment,
  ...server,
  ...required,
  ...neo4j,
  ...sentry,
  ...redis,
  ...livekit,
  ...options,
  ...language,
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
  | 'IMAGOR_PUBLIC_URL'
>
export default CONFIG

export { nodemailerTransportOptions }
