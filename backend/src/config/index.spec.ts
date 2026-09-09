// config/index.ts derives everything ONCE, at module evaluation, into constants. Reading the
// already-imported CONFIG therefore proves nothing about how it got there: a `??` where `||` was
// meant, an inverted SMTP flag, a required var that is not actually enforced — none of that is
// observable without re-evaluating the module against a chosen environment. Every case below
// does exactly that.

import { describe, it, expect } from 'vitest'

import { branding } from '@src/branding'

import { SOFTWARE_DEFAULTS } from './softwareDefaults'

import type { Config } from './index'

// The parts of the nodemailer options this spec reads back. Stated structurally rather than
// pulled from SMTPTransport.Options so the assertions below are checked against the shape the
// mailer actually consumes, not against a type that declares every field optional anyway.
interface LoadedConfig {
  default: Config
  nodemailerTransportOptions: {
    host?: string
    port?: number
    ignoreTLS?: boolean
    secure?: boolean
    pool?: boolean
    maxConnections?: number
    maxMessages?: number
    tls?: { rejectUnauthorized: boolean }
    auth?: { user: string; pass: string }
    dkim?: { domainName: string; keySelector: string; privateKey: string }
  }
}

// config/index.ts refuses to load without these, so every case supplies them; the cases about
// the requirement itself override one back to missing.
const REQUIRED: Record<string, string> = {
  NODE_ENV: 'test',
  EMAIL_DEFAULT_SENDER: 'noreply@example.org',
  AWS_ACCESS_KEY_ID: 'aws-key',
  AWS_SECRET_ACCESS_KEY: 'aws-secret',
  AWS_ENDPOINT: 'https://s3.example.org',
  AWS_REGION: 'eu-central-1',
  AWS_BUCKET: 'bucket',
  IMAGOR_PUBLIC_URL: 'https://imagor.example.org',
  IMAGOR_SECRET: 'imagor-secret',
  MAPBOX_TOKEN: 'mapbox-token',
  JWT_SECRET: 'jwt-secret',
}

// Injecting a global `Cypress` makes config read Cypress.env() instead of process.env — the
// branch that lets the e2e runner drive the backend's configuration. It is also what makes this
// spec hermetic: process.env and the repo's own .env (which sets SMTP_*, LIVEKIT_*, NEO4J_* …)
// are bypassed entirely, so "unset" really means unset and a case cannot pass or fail because of
// what the developer happens to have in .env. Same mechanism as softwareDefaults.spec.ts.
//
// A key mapped to `undefined` is an absent variable (process.env behaves the same way).
const loadConfig = async (env: Record<string, string | undefined> = {}): Promise<LoadedConfig> => {
  vi.resetModules()
  const g = globalThis as unknown as { Cypress?: { env: () => Record<string, string | undefined> } }
  g.Cypress = { env: () => ({ ...REQUIRED, ...env }) }
  try {
    return (await import('./index')) as unknown as LoadedConfig
  } finally {
    delete g.Cypress
    vi.resetModules()
  }
}

describe('required environment variables', () => {
  // Booting without these does not fail at startup on its own — it fails later, per request, as
  // an unsigned token, a broken upload or a 500 from the geocoder. The assertion turns all of
  // those into one loud message at boot, so the misconfiguration is found before traffic is.
  it('refuses to load when a required variable is missing', async () => {
    await expect(loadConfig({ JWT_SECRET: undefined })).rejects.toThrow(
      'ERROR: "JWT_SECRET" env variable is missing.',
    )
  })

  // An empty value is the common shape of the mistake (`AWS_BUCKET=` left in a .env, or a
  // Kubernetes secret key that resolved to nothing), and it must not pass as "present".
  it('treats an empty required variable as missing', async () => {
    await expect(loadConfig({ AWS_BUCKET: '' })).rejects.toThrow(
      'ERROR: "AWS_BUCKET" env variable is missing.',
    )
  })

  it('exposes the required values once all are present', async () => {
    const { default: CONFIG } = await loadConfig()

    expect(CONFIG.JWT_SECRET).toBe('jwt-secret')
    expect(CONFIG.AWS_BUCKET).toBe('bucket')
    expect(CONFIG.IMAGOR_PUBLIC_URL).toBe('https://imagor.example.org')
  })
})

describe('environment flags', () => {
  it('derives PRODUCTION / TEST / SEND_MAIL from NODE_ENV in production', async () => {
    const { default: CONFIG } = await loadConfig({ NODE_ENV: 'production' })

    expect(CONFIG.PRODUCTION).toBe(true)
    expect(CONFIG.TEST).toBe(false)
    // Mails are suppressed for `test` only — a production deployment that stopped sending
    // registration mails would look perfectly healthy otherwise.
    expect(CONFIG.SEND_MAIL).toBe(true)
  })

  it('suppresses mail delivery while testing', async () => {
    const { default: CONFIG } = await loadConfig({ NODE_ENV: 'test' })

    expect(CONFIG.TEST).toBe(true)
    expect(CONFIG.PRODUCTION).toBe(false)
    expect(CONFIG.SEND_MAIL).toBe(false)
  })

  // DEBUG turns on verbose query/resolver logging. In production that is both a performance
  // and a data-exposure problem, so it is gated on NODE_ENV rather than trusted from the
  // environment — setting DEBUG=true on a production deployment must have no effect.
  it('forces DEBUG off in production and honours it elsewhere', async () => {
    const { default: production } = await loadConfig({ NODE_ENV: 'production', DEBUG: 'true' })

    expect(production.DEBUG).toBe(false)

    const { default: development } = await loadConfig({ NODE_ENV: 'development', DEBUG: 'true' })

    expect(development.DEBUG).toBe('true')
  })

  // The flag that allows wiping a database flagged as production (staging environments run with
  // PRODUCTION=true). Anything but the exact string must NOT arm it.
  it('arms PRODUCTION_DB_CLEAN_ALLOW only for the literal "true"', async () => {
    const { default: armed } = await loadConfig({ PRODUCTION_DB_CLEAN_ALLOW: 'true' })

    expect(armed.PRODUCTION_DB_CLEAN_ALLOW).toBe(true)

    const { default: notArmed } = await loadConfig({ PRODUCTION_DB_CLEAN_ALLOW: 'yes' })

    expect(notArmed.PRODUCTION_DB_CLEAN_ALLOW).toBe(false)

    const { default: unset } = await loadConfig({ PRODUCTION_DB_CLEAN_ALLOW: undefined })

    expect(unset.PRODUCTION_DB_CLEAN_ALLOW).toBe(SOFTWARE_DEFAULTS.PRODUCTION_DB_CLEAN_ALLOW)
  })

  // Under Cypress the env map replaces process.env wholesale, so a variable the runner does not
  // set would be lost. NODE_ENV is the one the whole flag block above keys off, hence the
  // explicit fallback to the real process environment.
  it('falls back to process.env.NODE_ENV when the Cypress env carries none', async () => {
    const { default: CONFIG } = await loadConfig({ NODE_ENV: undefined })

    // n/no-process-env routes runtime code through CONFIG — which is the module under test here,
    // and the fallback under test is literally `process.env.NODE_ENV`. Comparing against the real
    // value (rather than hard-coding 'test') keeps the case honest whatever NODE_ENV the run uses.
    // eslint-disable-next-line n/no-process-env
    expect(CONFIG.NODE_ENV).toBe(process.env.NODE_ENV)
  })
})

describe('DISABLED_MIDDLEWARES', () => {
  // Whitespace is what a hand-edited .env actually contains ("xss, sentry"), and an empty
  // segment would be looked up as a middleware named '' — no match, but a spurious
  // `Disabled "" middleware` warning on every boot.
  it('splits, trims and drops empty segments', async () => {
    const { default: CONFIG } = await loadConfig({
      NODE_ENV: 'test',
      DISABLED_MIDDLEWARES: ' xss , notifications ,',
    })

    expect(CONFIG.DISABLED_MIDDLEWARES).toEqual(['xss', 'notifications'])
  })

  it('yields an empty list for an empty or absent value', async () => {
    const { default: empty } = await loadConfig({ NODE_ENV: 'test', DISABLED_MIDDLEWARES: '' })

    expect(empty.DISABLED_MIDDLEWARES).toEqual([])

    const { default: unset } = await loadConfig({
      NODE_ENV: 'test',
      DISABLED_MIDDLEWARES: undefined,
    })

    expect(unset.DISABLED_MIDDLEWARES).toEqual([])
  })

  it('is honoured in development', async () => {
    const { default: CONFIG } = await loadConfig({
      NODE_ENV: 'development',
      DISABLED_MIDDLEWARES: 'xss',
    })

    expect(CONFIG.DISABLED_MIDDLEWARES).toEqual(['xss'])
  })

  // The escape hatch exists to make local debugging possible; honouring it in production would
  // let an env var switch off XSS sanitising or permission checks on a live instance.
  it('is ignored outside test/development', async () => {
    const { default: CONFIG } = await loadConfig({
      NODE_ENV: 'production',
      DISABLED_MIDDLEWARES: 'xss,permissions',
    })

    expect(CONFIG.DISABLED_MIDDLEWARES).toEqual([])
  })
})

describe('server URIs and token lifetime', () => {
  it('uses the configured URIs', async () => {
    const { default: CONFIG } = await loadConfig({
      CLIENT_URI: 'https://app.example.org',
      GRAPHQL_URI: 'https://api.example.org',
    })

    expect(CONFIG.CLIENT_URI).toBe('https://app.example.org')
    expect(CONFIG.GRAPHQL_URI).toBe('https://api.example.org')
  })

  // `||`, not `??`: an empty CLIENT_URI is a misconfiguration, and letting '' through crashes
  // every `new URL(path, CLIENT_URI)` — the mail templates and slug links are built that way.
  it('falls back to the software defaults for empty or absent URIs', async () => {
    const { default: empty } = await loadConfig({ CLIENT_URI: '', GRAPHQL_URI: '' })

    expect(empty.CLIENT_URI).toBe(SOFTWARE_DEFAULTS.CLIENT_URI)
    expect(empty.GRAPHQL_URI).toBe(SOFTWARE_DEFAULTS.GRAPHQL_URI)

    const { default: unset } = await loadConfig({ CLIENT_URI: undefined, GRAPHQL_URI: undefined })

    expect(unset.CLIENT_URI).toBe(SOFTWARE_DEFAULTS.CLIENT_URI)
    expect(unset.GRAPHQL_URI).toBe(SOFTWARE_DEFAULTS.GRAPHQL_URI)
  })

  it('accepts a parseable JWT_EXPIRES', async () => {
    const { default: CONFIG } = await loadConfig({ JWT_EXPIRES: '12h' })

    expect(CONFIG.JWT_EXPIRES).toBe('12h')
  })

  // Validated, not merely defaulted: jwt.sign THROWS on a lifetime it cannot parse, so an
  // unparseable value takes down every login instead of degrading to the default.
  it('falls back for an unparseable JWT_EXPIRES', async () => {
    const { default: garbage } = await loadConfig({ JWT_EXPIRES: 'forever' })

    expect(garbage.JWT_EXPIRES).toBe(SOFTWARE_DEFAULTS.JWT_EXPIRES)

    const { default: unset } = await loadConfig({ JWT_EXPIRES: undefined })

    expect(unset.JWT_EXPIRES).toBe(SOFTWARE_DEFAULTS.JWT_EXPIRES)
  })
})

describe('SMTP transport options', () => {
  it('passes host and a numeric port through', async () => {
    const { nodemailerTransportOptions } = await loadConfig({
      SMTP_HOST: 'mail.example.org',
      SMTP_PORT: '587',
    })

    expect(nodemailerTransportOptions.host).toBe('mail.example.org')
    // A string port would make nodemailer's `secure` inference (port === 465) miss.
    expect(nodemailerTransportOptions.port).toBe(587)
  })

  it('leaves the port undefined when absent, so nodemailer picks its own', async () => {
    const { nodemailerTransportOptions } = await loadConfig({ SMTP_PORT: undefined })

    expect(nodemailerTransportOptions.port).toBeUndefined()
  })

  // The TLS flags default to the SAFE side of their comparison — only the literal 'false'
  // relaxes them. A typo ('False', 'no') must not silently disable certificate verification.
  it('relaxes TLS only for the literal "false"', async () => {
    const { nodemailerTransportOptions: relaxed } = await loadConfig({
      SMTP_IGNORE_TLS: 'false',
      SMTP_REJECT_UNAUTHORIZED: 'false',
    })

    expect(relaxed.ignoreTLS).toBe(false)
    expect(relaxed.tls?.rejectUnauthorized).toBe(false)

    const { nodemailerTransportOptions: typo } = await loadConfig({
      SMTP_IGNORE_TLS: 'False',
      SMTP_REJECT_UNAUTHORIZED: 'no',
    })

    expect(typo.ignoreTLS).toBe(SOFTWARE_DEFAULTS.SMTP_IGNORE_TLS)
    expect(typo.tls?.rejectUnauthorized).toBe(SOFTWARE_DEFAULTS.SMTP_REJECT_UNAUTHORIZED)
  })

  it('enables implicit TLS only for the literal "true"', async () => {
    const { nodemailerTransportOptions: secure } = await loadConfig({ SMTP_SECURE: 'true' })

    expect(secure.secure).toBe(true)

    const { nodemailerTransportOptions: other } = await loadConfig({ SMTP_SECURE: '1' })

    expect(other.secure).toBe(SOFTWARE_DEFAULTS.SMTP_SECURE)
  })

  it('parses the pool limits and falls back on absent or zero values', async () => {
    const { nodemailerTransportOptions: configured } = await loadConfig({
      SMTP_MAX_CONNECTIONS: '20',
      SMTP_MAX_MESSAGES: '500',
    })

    expect(configured.maxConnections).toBe(20)
    expect(configured.maxMessages).toBe(500)

    // '0' would mean "no connections / no messages at all" — the pool would never send.
    const { nodemailerTransportOptions: zero } = await loadConfig({
      SMTP_MAX_CONNECTIONS: '0',
      SMTP_MAX_MESSAGES: '0',
    })

    expect(zero.maxConnections).toBe(SOFTWARE_DEFAULTS.SMTP_MAX_CONNECTIONS)
    expect(zero.maxMessages).toBe(SOFTWARE_DEFAULTS.SMTP_MAX_MESSAGES)
  })

  it('sets auth only when both username and password are present', async () => {
    const { nodemailerTransportOptions: withAuth } = await loadConfig({
      SMTP_USERNAME: 'mailer',
      SMTP_PASSWORD: 's3cret',
    })

    expect(withAuth.auth).toEqual({ user: 'mailer', pass: 's3cret' })

    // Half a credential is worse than none: nodemailer would attempt AUTH with an empty
    // password and the server rejects the whole connection, rather than relaying unauthenticated.
    const { nodemailerTransportOptions: halfAuth } = await loadConfig({
      SMTP_USERNAME: 'mailer',
      SMTP_PASSWORD: undefined,
    })

    expect(halfAuth.auth).toBeUndefined()
  })

  it('sets DKIM only when all three parts are present, unescaping the key', async () => {
    const { nodemailerTransportOptions: signed } = await loadConfig({
      SMTP_DKIM_DOMAINNAME: 'example.org',
      SMTP_DKIM_KEYSELECTOR: 'default',
      // A .env file cannot hold real line breaks, so the PEM arrives with literal "\n"
      // sequences; handing that to nodemailer unchanged yields an unparseable key and every
      // mail goes out unsigned (i.e. straight to spam).
      SMTP_DKIM_PRIVATEKEY: '-----BEGIN KEY-----\\nabc\\n-----END KEY-----',
    })

    expect(signed.dkim).toEqual({
      domainName: 'example.org',
      keySelector: 'default',
      privateKey: '-----BEGIN KEY-----\nabc\n-----END KEY-----',
    })

    const { nodemailerTransportOptions: partial } = await loadConfig({
      SMTP_DKIM_DOMAINNAME: 'example.org',
      SMTP_DKIM_KEYSELECTOR: 'default',
      SMTP_DKIM_PRIVATEKEY: undefined,
    })

    expect(partial.dkim).toBeUndefined()
  })
})

describe('neo4j, sentry and redis', () => {
  it('uses the configured connection settings', async () => {
    const { default: CONFIG } = await loadConfig({
      NEO4J_URI: 'bolt://db.example.org:7687',
      NEO4J_USERNAME: 'ocelot',
      NEO4J_PASSWORD: 'pw',
      NEO4J_PROFILE: 'neo4j-enterprise',
    })

    expect(CONFIG.NEO4J_URI).toBe('bolt://db.example.org:7687')
    expect(CONFIG.NEO4J_USERNAME).toBe('ocelot')
    expect(CONFIG.NEO4J_PASSWORD).toBe('pw')
    // Selects which constraint classes the DDL may emit — a wrong value makes the server
    // reject the startup statements.
    expect(CONFIG.NEO4J_PROFILE).toBe('neo4j-enterprise')
  })

  it('falls back to the software defaults when unset', async () => {
    const { default: CONFIG } = await loadConfig({
      NEO4J_URI: undefined,
      NEO4J_USERNAME: undefined,
      NEO4J_PASSWORD: undefined,
      NEO4J_PROFILE: undefined,
    })

    expect(CONFIG.NEO4J_URI).toBe(SOFTWARE_DEFAULTS.NEO4J_URI)
    expect(CONFIG.NEO4J_USERNAME).toBe(SOFTWARE_DEFAULTS.NEO4J_USERNAME)
    expect(CONFIG.NEO4J_PASSWORD).toBe(SOFTWARE_DEFAULTS.NEO4J_PASSWORD)
    expect(CONFIG.NEO4J_PROFILE).toBe(SOFTWARE_DEFAULTS.NEO4J_PROFILE)
  })

  it('carries the sentry DSN and the deployed commit', async () => {
    const { default: CONFIG } = await loadConfig({
      SENTRY_DSN_BACKEND: 'https://key@sentry.example.org/1',
      COMMIT: 'deadbeef',
    })

    // COMMIT is what makes a reported error attributable to a deployment.
    expect(CONFIG.SENTRY_DSN_BACKEND).toBe('https://key@sentry.example.org/1')
    expect(CONFIG.COMMIT).toBe('deadbeef')
  })

  it('parses the redis port and leaves it undefined when absent', async () => {
    const { default: configured } = await loadConfig({
      REDIS_DOMAIN: 'redis.example.org',
      REDIS_PORT: '6380',
      REDIS_PASSWORD: 'pw',
    })

    expect(configured.REDIS_DOMAIN).toBe('redis.example.org')
    expect(configured.REDIS_PORT).toBe(6380)
    expect(configured.REDIS_PASSWORD).toBe('pw')

    // No redis configured is a supported single-instance setup, not an error — the port must
    // stay undefined rather than become NaN, which ioredis would refuse to connect with.
    const { default: unset } = await loadConfig({ REDIS_PORT: undefined })

    expect(unset.REDIS_PORT).toBeUndefined()
  })
})

describe('LiveKit', () => {
  // The rest of the codebase assumes a protocol prefix: the frontend connects over wss:// and
  // the backend rewrites to https:// for the RoomService REST calls. A bare host copied from a
  // provider dashboard would otherwise produce `new URL('livekit.example.org')` → throw.
  it('prefixes a bare host with wss://', async () => {
    const { default: CONFIG } = await loadConfig({ LIVEKIT_URL: 'livekit.example.org' })

    expect(CONFIG.LIVEKIT_URL).toBe('wss://livekit.example.org')
  })

  it.each(['wss://livekit.example.org', 'ws://localhost:7880', 'https://livekit.example.org'])(
    'keeps an explicit protocol (%s)',
    async (url) => {
      const { default: CONFIG } = await loadConfig({ LIVEKIT_URL: url })

      expect(CONFIG.LIVEKIT_URL).toBe(url)
    },
  )

  it('enables video calls only when URL, key and secret are all present', async () => {
    const { default: complete } = await loadConfig({
      LIVEKIT_URL: 'livekit.example.org',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret',
    })

    expect(complete.LIVEKIT_ENABLED).toBe(true)

    // A half-configured LiveKit must report itself disabled: the feature gate is what keeps the
    // UI from offering a call that would fail at token issuance.
    const { default: noSecret } = await loadConfig({
      LIVEKIT_URL: 'livekit.example.org',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: undefined,
    })

    expect(noSecret.LIVEKIT_ENABLED).toBe(false)
  })

  it('reports disabled and an undefined URL when LiveKit is not configured', async () => {
    const { default: CONFIG } = await loadConfig({
      LIVEKIT_URL: undefined,
      LIVEKIT_API_KEY: undefined,
      LIVEKIT_API_SECRET: undefined,
    })

    expect(CONFIG.LIVEKIT_URL).toBeUndefined()
    expect(CONFIG.LIVEKIT_ENABLED).toBe(false)
  })
})

describe('contact identity and language', () => {
  // Note the env var names differ from the CONFIG keys (SUPPORT_LINK → SUPPORT_URL): reading the
  // wrong one would leave the deployment showing the ocelot baseline with nothing to explain it.
  it('maps SUPPORT_LINK / ORGANIZATION_LINK onto the *_URL config keys', async () => {
    const { default: CONFIG } = await loadConfig({
      SUPPORT_EMAIL: 'help@example.org',
      SUPPORT_LINK: 'https://help.example.org',
      ORGANIZATION_LINK: 'https://example.org',
    })

    expect(CONFIG.SUPPORT_EMAIL).toBe('help@example.org')
    expect(CONFIG.SUPPORT_URL).toBe('https://help.example.org')
    expect(CONFIG.ORGANIZATION_URL).toBe('https://example.org')
  })

  // `||`: an empty value would render as a blank support address / dead link in the footer and
  // in every notification mail.
  it('falls back to the ocelot baseline for empty or absent contact values', async () => {
    const { default: empty } = await loadConfig({
      SUPPORT_EMAIL: '',
      SUPPORT_LINK: '',
      ORGANIZATION_LINK: '',
    })

    expect(empty.SUPPORT_EMAIL).toBe(SOFTWARE_DEFAULTS.SUPPORT_EMAIL)
    expect(empty.SUPPORT_URL).toBe(SOFTWARE_DEFAULTS.SUPPORT_LINK)
    expect(empty.ORGANIZATION_URL).toBe(SOFTWARE_DEFAULTS.ORGANIZATION_LINK)
  })

  it('takes the application name from the branding package, not from the environment', async () => {
    const { default: CONFIG } = await loadConfig({ APPLICATION_NAME: 'ignored' })

    expect(CONFIG.APPLICATION_NAME).toBe(branding.metadata.applicationName)
  })

  it('canonicalises a supported LANGUAGE_DEFAULT', async () => {
    const { default: CONFIG } = await loadConfig({ LANGUAGE_DEFAULT: 'DE' })

    expect(CONFIG.LANGUAGE_DEFAULT).toBe('de')
  })

  // The app-wide default locale drives email localisation and the request context's
  // languageDefault; an unsupported code would resolve no template at all.
  it('falls back for an unsupported, empty or absent LANGUAGE_DEFAULT', async () => {
    const { default: unsupported } = await loadConfig({ LANGUAGE_DEFAULT: 'xx' })

    expect(unsupported.LANGUAGE_DEFAULT).toBe(SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT)

    const { default: empty } = await loadConfig({ LANGUAGE_DEFAULT: '' })

    expect(empty.LANGUAGE_DEFAULT).toBe(SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT)

    const { default: unset } = await loadConfig({ LANGUAGE_DEFAULT: undefined })

    expect(unset.LANGUAGE_DEFAULT).toBe(SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT)
  })

  it('passes PROXY_S3 through for the upload proxy toggle', async () => {
    const { default: CONFIG } = await loadConfig({ PROXY_S3: 'true' })

    expect(CONFIG.PROXY_S3).toBe('true')
  })
})
