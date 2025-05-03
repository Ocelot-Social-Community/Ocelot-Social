/* eslint-disable n/no-process-env */
import { config } from 'dotenv'

// Load env file
config()

// Use Cypress env or process.env
declare let Cypress: { env: () => Record<string, string> } | undefined
const env = typeof Cypress !== 'undefined' ? Cypress.env() : process.env

const toNumber = (env: string | undefined): number | undefined => {
  const number = Number(env)
  return isNaN(number) ? undefined : number
}

const environment = {
  NODE_ENV: env.NODE_ENV ?? process.env.NODE_ENV,
  DEBUG: env.NODE_ENV !== 'production' && env.DEBUG,
  TEST: env.NODE_ENV === 'test',
  PRODUCTION: env.NODE_ENV === 'production',
  // used for staging environments if 'PRODUCTION=true' and 'PRODUCTION_DB_CLEAN_ALLOW=true'
  PRODUCTION_DB_CLEAN_ALLOW: env.PRODUCTION_DB_CLEAN_ALLOW === 'true' || false, // default = false
  DISABLED_MIDDLEWARES: env.DISABLED_MIDDLEWARES?.split(',') ?? [],
}

const server = {
  CLIENT_URI: env.CLIENT_URI ?? 'http://localhost:3000',
  GRAPHQL_URI: env.GRAPHQL_URI ?? 'http://localhost:4000',
  JWT_EXPIRES: env.JWT_EXPIRES ?? '7d',
  JWT_SECRET: env.JWT_SECRET,
  MAPBOX_TOKEN:
    env.MAPBOX_TOKEN ??
    'pk.eyJ1IjoiYnVzZmFrdG9yIiwiYSI6ImNraDNiM3JxcDBhaWQydG1uczhpZWtpOW4ifQ.7TNRTO-o9aK1Y6MyW_Nd4g',
}

const hasDKIMData = env.SMTP_DKIM_DOMAINNAME && env.SMTP_DKIM_KEYSELECTOR && env.SMTP_DKIM_PRIVATKEY

const smtp = {
  SMTP_HOST: env.SMTP_HOST,
  SMTP_PORT: env.SMTP_PORT,
  SMTP_IGNORE_TLS: env.SMTP_IGNORE_TLS !== 'false', // default = true
  SMTP_SECURE: env.SMTP_SECURE === 'true',
  SMTP_USERNAME: env.SMTP_USERNAME,
  SMTP_PASSWORD: env.SMTP_PASSWORD,
  SMTP_DKIM_DOMAINNAME: hasDKIMData && env.SMTP_DKIM_DOMAINNAME,
  SMTP_DKIM_KEYSELECTOR: hasDKIMData && env.SMTP_DKIM_KEYSELECTOR,
  // PEM format: https://docs.progress.com/bundle/datadirect-hybrid-data-pipeline-installation-46/page/PEM-file-format.html
  SMTP_DKIM_PRIVATKEY: hasDKIMData && env.SMTP_DKIM_PRIVATKEY,
  SMTP_MAX_CONNECTIONS: env.SMTP_MAX_CONNECTIONS ?? 5,
  SMTP_MAX_MESSAGES: env.SMTP_MAX_MESSAGES ?? 100,
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
  REDIS_PORT: toNumber(env.REDIS_PORT),
  REDIS_PASSWORD: env.REDIS_PASSWORD,
}

const s3 = {
  AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT: env.AWS_ENDPOINT,
  AWS_REGION: env.AWS_REGION,
  AWS_BUCKET: env.AWS_BUCKET ?? '',
  S3_CONFIGURED:
    env.AWS_ACCESS_KEY_ID &&
    env.AWS_SECRET_ACCESS_KEY &&
    env.AWS_ENDPOINT &&
    env.AWS_REGION &&
    env.AWS_BUCKET,
}

const logos = {
  LOGO_HEADER_PATH: '/img/custom/logo-horizontal.svg',
  LOGO_SIGNUP_PATH: '/img/custom/logo-squared.svg',
  LOGO_WELCOME_PATH: '/img/custom/logo-squared.svg',
  LOGO_LOGOUT_PATH: '/img/custom/logo-squared.svg',
  LOGO_PASSWORD_RESET_PATH: '/img/custom/logo-squared.svg',
  LOGO_MAINTENACE_RESET_PATH: '/img/custom/logo-squared.svg',
}

const emails = {
  EMAIL_DEFAULT_SENDER: env.EMAIL_DEFAULT_SENDER ?? 'devops@ocelot.social',
  SUPPORT_EMAIL: env.SUPPORT_EMAIL ?? 'devops@ocelot.social',
  // MODERATION_EMAIL: 'devops@ocelot.social',
}

const metadata = {
  APPLICATION_NAME: env.APPLICATION_NAME ?? 'ocelot.social',
  APPLICATION_SHORT_NAME: env.APPLICATION_SHORT_NAME ?? 'ocelot.social',
  APPLICATION_DESCRIPTION: env.APPLICATION_DESCRIPTION ?? 'ocelot.social Community Network',
  COOKIE_NAME: env.COOKIE_NAME ?? 'ocelot-social-token',
  ORGANIZATION_NAME: env.ORGANIZATION_NAME ?? 'ocelot.social Community',
  ORGANIZATION_JURISDICTION: env.ORGANIZATION_JURISDICTION ?? 'City of Angels',
  THEME_COLOR: env.THEME_COLOR ?? 'rgb(23, 181, 63)', // $color-primary – as the main color in general. e.g. the color in the background of the app that is visible behind the transparent iPhone status bar to name one use case, or the current color of SVGs to name another use case
}

const badges = {
  TROPHY_BADGES_SELECTED_MAX: toNumber(env.TROPHY_BADGES_SELECTED_MAX) ?? 9,
}

const groups = {
  DESCRIPTION_WITHOUT_HTML_LENGTH_MIN: env.DESCRIPTION_WITHOUT_HTML_LENGTH_MIN ?? 3, // with removed HTML tags
  DESCRIPTION_EXCERPT_HTML_LENGTH: env.DESCRIPTION_EXCERPT_HTML_LENGTH ?? 250, // with removed HTML tags
}

const registration = {
  NONCE_LENGTH: toNumber(env.NONCE_LENGTH) ?? 5,
  INVITE_CODE_LENGTH: toNumber(env.INVITE_CODE_LENGTH) ?? 6,
  REGISTRATION_LAYOUT: env.REGISTRATION_LAYOUT ?? 'no-header',
}

const categories = {
  CATEGORIES_MIN: env.CATEGORIES_MIN ?? 1,
  CATEGORIES_MAX: env.CATEGORIES_MAX ?? 3,
}

const options = {
  PUBLIC_REGISTRATION: env.PUBLIC_REGISTRATION === 'true' || false,
  INVITE_REGISTRATION: env.INVITE_REGISTRATION !== 'false', // default = true
  CATEGORIES_ACTIVE: process.env.CATEGORIES_ACTIVE === 'true' || false,
  // ATTENTION: the following links have to be defined even for internal pages with full URLs as example like 'https://staging.ocelot.social/support', because they are used in e-mails!
  ORGANIZATION_URL: env.ORGANIZATION_URL ?? 'https://ocelot.social',
  SUPPORT_URL: env.SUPPORT_URL ?? 'https://ocelot.social',
}

// Check if all required configs are present
const required = ['JWT_SECRET']
required.forEach((entry) => {
  // eslint-disable-next-line security/detect-object-injection
  if (!env[entry]) {
    throw new Error(`ERROR: "${entry}" env variable is missing.`)
  }
})

export default {
  ...environment,
  ...server,
  ...smtp,
  ...neo4j,
  ...sentry,
  ...redis,
  ...s3,
  ...options,
  ...logos,
  ...emails,
  ...metadata,
  ...badges,
  ...groups,
  ...registration,
  ...categories,
}
