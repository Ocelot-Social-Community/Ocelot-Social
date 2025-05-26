import type CONFIG from '.'

export const TEST_CONFIG: typeof CONFIG = {
  NODE_ENV: 'test',
  DEBUG: undefined,
  TEST: true,
  PRODUCTION: false,
  PRODUCTION_DB_CLEAN_ALLOW: false,
  DISABLED_MIDDLEWARES: [],
  SEND_MAIL: false,

  CLIENT_URI: 'http://localhost:3000',
  GRAPHQL_URI: 'http://localhost:4000',
  JWT_EXPIRES: '2y',

  MAPBOX_TOKEN: undefined,
  JWT_SECRET: undefined,
  PRIVATE_KEY_PASSPHRASE: undefined,

  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USERNAME: 'neo4j',
  NEO4J_PASSWORD: 'neo4j',

  SENTRY_DSN_BACKEND: undefined,
  COMMIT: undefined,

  REDIS_DOMAIN: undefined,
  REDIS_PORT: undefined,
  REDIS_PASSWORD: undefined,

  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_ENDPOINT: '',
  AWS_REGION: '',
  AWS_BUCKET: '',
  S3_PUBLIC_GATEWAY: undefined,
  IMAGOR_SECRET: undefined,

  EMAIL_DEFAULT_SENDER: '',
  SUPPORT_EMAIL: '',
  SUPPORT_URL: '',
  APPLICATION_NAME: '',
  ORGANIZATION_URL: '',
  PUBLIC_REGISTRATION: false,
  INVITE_REGISTRATION: true,
  INVITE_CODES_PERSONAL_PER_USER: 7,
  INVITE_CODES_GROUP_PER_USER: 7,
  CATEGORIES_ACTIVE: false,
  MAX_PINNED_POSTS: 1,

  LANGUAGE_DEFAULT: 'en',
}
