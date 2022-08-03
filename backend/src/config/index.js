import dotenv from 'dotenv'
import emails from './emails.js'
import metadata from './metadata.js'

// Load env file
if (require.resolve) {
  try {
    dotenv.config({ path: require.resolve('../../.env') })
  } catch (error) {
    // This error is thrown when the .env is not found
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error
    }
  }
}

// Use Cypress env or process.env
const env = typeof Cypress !== 'undefined' ? Cypress.env() : process.env // eslint-disable-line no-undef

const environment = {
  NODE_ENV: env.NODE_ENV || process.NODE_ENV,
  DEBUG: env.NODE_ENV !== 'production' && env.DEBUG,
  TEST: env.NODE_ENV === 'test',
  PRODUCTION: env.NODE_ENV === 'production',
  // used for staging enviroments if 'PRODUCTION=true' and 'PRODUCTION_DB_CLEAN_ALLOW=true'
  PRODUCTION_DB_CLEAN_ALLOW: env.PRODUCTION_DB_CLEAN_ALLOW === 'true' || false, // default = false
  DISABLED_MIDDLEWARES: (env.NODE_ENV !== 'production' && env.DISABLED_MIDDLEWARES) || false,
}

const required = {
  MAPBOX_TOKEN: env.MAPBOX_TOKEN,
  JWT_SECRET: env.JWT_SECRET,
  PRIVATE_KEY_PASSPHRASE: env.PRIVATE_KEY_PASSPHRASE,
}

const server = {
  CLIENT_URI: env.CLIENT_URI || 'http://localhost:3000',
  GRAPHQL_URI: env.GRAPHQL_URI || 'http://localhost:4000',
  JWT_EXPIRES: env.JWT_EXPIRES || '2y',
}

const smtp = {
  SMTP_HOST: env.SMTP_HOST,
  SMTP_PORT: env.SMTP_PORT,
  SMTP_IGNORE_TLS: env.SMTP_IGNORE_TLS !== 'false', // default = true
  SMTP_SECURE: env.SMTP_SECURE === 'true',
  SMTP_USERNAME: env.SMTP_USERNAME,
  SMTP_PASSWORD: env.SMTP_PASSWORD,
}

const neo4j = {
  NEO4J_URI: env.NEO4J_URI || 'bolt://localhost:7687',
  NEO4J_USERNAME: env.NEO4J_USERNAME || 'neo4j',
  NEO4J_PASSWORD: env.NEO4J_PASSWORD || 'neo4j',
}

const sentry = {
  SENTRY_DSN_BACKEND: env.SENTRY_DSN_BACKEND,
  COMMIT: env.COMMIT,
}

const redis = {
  REDIS_DOMAIN: env.REDIS_DOMAIN,
  REDIS_PORT: env.REDIS_PORT,
  REDIS_PASSWORD: env.REDIS_PASSWORD,
}

const s3 = {
  AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT: env.AWS_ENDPOINT,
  AWS_REGION: env.AWS_REGION,
  AWS_BUCKET: env.AWS_BUCKET,
  S3_CONFIGURED:
    env.AWS_ACCESS_KEY_ID &&
    env.AWS_SECRET_ACCESS_KEY &&
    env.AWS_ENDPOINT &&
    env.AWS_REGION &&
    env.AWS_BUCKET,
}

const options = {
  EMAIL_DEFAULT_SENDER: env.EMAIL_DEFAULT_SENDER,
  SUPPORT_URL: emails.SUPPORT_LINK,
  APPLICATION_NAME: metadata.APPLICATION_NAME,
  ORGANIZATION_URL: emails.ORGANIZATION_LINK,
  PUBLIC_REGISTRATION: env.PUBLIC_REGISTRATION === 'true' || false,
  INVITE_REGISTRATION: env.INVITE_REGISTRATION !== 'false', // default = true
  CATEGORIES_ACTIVE: process.env.CATEGORIES_ACTIVE === 'true' || false,
}

// Check if all required configs are present
if (require.resolve) {
  // are we in a nodejs environment?
  Object.entries(required).map((entry) => {
    if (!entry[1]) {
      throw new Error(`ERROR: "${entry[0]}" env variable is missing.`)
    }
  })
}

export default {
  ...environment,
  ...server,
  ...required,
  ...smtp,
  ...neo4j,
  ...sentry,
  ...redis,
  ...s3,
  ...options,
}
