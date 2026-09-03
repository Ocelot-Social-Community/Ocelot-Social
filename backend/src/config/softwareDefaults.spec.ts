// Keys iterated below come from the fixed SOFTWARE_DEFAULTS / config module, never user
// input — the object-injection lint is a false positive here.
/* eslint-disable security/detect-object-injection */

import { describe, it, expect } from 'vitest'

import { ENV_SPEC_BY_NAME } from './envRegistry'
import { SOFTWARE_DEFAULTS } from './softwareDefaults'

import type { Config } from './index'

// The subset of config/index.ts the runtime guard reads back (the flags whose default
// lives in comparison logic there rather than in the map).
interface LoadedConfig {
  default: Config
  nodemailerTransportOptions: {
    ignoreTLS?: boolean
    secure?: boolean
    tls?: { rejectUnauthorized: boolean }
  }
}

// (a) Structural guard: the admin "software default" column (envRegistry) must surface
// exactly the canonical value, so nobody can re-inline a diverging literal. Every key in
// the map is an env var present in the registry; its display string is String(value).
describe('sOFTWARE_DEFAULTS ↔ envRegistry display', () => {
  it('surfaces each canonical default as the registry display string', () => {
    for (const [name, value] of Object.entries(SOFTWARE_DEFAULTS)) {
      const spec = ENV_SPEC_BY_NAME[name]

      expect(spec).toBeDefined()

      // Lists are surfaced as a JSON array ([] / ["a","b"]); scalars via String().
      const expected = Array.isArray(value) ? JSON.stringify(value) : String(value)

      expect(spec.softwareDefault).toBe(expected)
    }
  })
})

// (b) Runtime guard for the logic-gated defaults. Unlike the ?? / || cases (which read
// SOFTWARE_DEFAULTS directly in config/index.ts and therefore cannot drift), these encode
// their default in comparison / NODE_ENV logic (`!== 'false'`, `=== 'true'`, or a
// NODE_ENV branch), separate from the map — so a flipped comparison would silently disagree
// with what the admin sees. This asserts config's actual unset-default matches the map.
describe('sOFTWARE_DEFAULTS ↔ config runtime default (logic-gated defaults)', () => {
  // config/index.ts refuses to load unless the hard-required vars are present, so supply
  // dummies. The flags under test are deliberately ABSENT, so config yields their defaults.
  const REQUIRED: Record<string, string> = {
    NODE_ENV: 'test',
    EMAIL_DEFAULT_SENDER: 'x',
    AWS_ACCESS_KEY_ID: 'x',
    AWS_SECRET_ACCESS_KEY: 'x',
    AWS_ENDPOINT: 'x',
    AWS_REGION: 'x',
    AWS_BUCKET: 'x',
    IMAGOR_PUBLIC_URL: 'x',
    IMAGOR_SECRET: 'x',
    MAPBOX_TOKEN: 'x',
    JWT_SECRET: 'x',
  }

  // config reads Cypress.env() when a global `Cypress` is present (see config/index.ts).
  // Injecting it bypasses process.env / the repo .env entirely — otherwise .env (which sets
  // SMTP_* etc.) would mask the true software defaults we mean to assert.
  // async because ESM has no synchronous module load: `await import()` replaces require().
  const loadConfigWithFlagsUnset = async (): Promise<LoadedConfig> => {
    vi.resetModules()
    const g = global as unknown as { Cypress?: { env: () => Record<string, string> } }
    g.Cypress = { env: () => ({ ...REQUIRED }) }
    try {
      return (await import('./index')) as unknown as LoadedConfig
    } finally {
      delete g.Cypress
    }
  }

  it('defaults SMTP ignoreTLS / secure / rejectUnauthorized to the map values', async () => {
    const { nodemailerTransportOptions } = await loadConfigWithFlagsUnset()
    const tls = nodemailerTransportOptions.tls as { rejectUnauthorized: boolean }

    expect(nodemailerTransportOptions.ignoreTLS).toBe(SOFTWARE_DEFAULTS.SMTP_IGNORE_TLS)
    expect(nodemailerTransportOptions.secure).toBe(SOFTWARE_DEFAULTS.SMTP_SECURE)
    expect(tls.rejectUnauthorized).toBe(SOFTWARE_DEFAULTS.SMTP_REJECT_UNAUTHORIZED)
  })

  it('defaults PRODUCTION_DB_CLEAN_ALLOW to the map value', async () => {
    const { default: CONFIG } = await loadConfigWithFlagsUnset()

    expect(CONFIG.PRODUCTION_DB_CLEAN_ALLOW).toBe(SOFTWARE_DEFAULTS.PRODUCTION_DB_CLEAN_ALLOW)
  })

  it('defaults DEBUG to falsy (off)', async () => {
    // DEBUG's unset value is NODE_ENV-gated (undefined in non-production, false in
    // production), so it is guarded as falsy rather than strictly `false`; the map records
    // its off baseline (false) as the single display source.
    const { default: CONFIG } = await loadConfigWithFlagsUnset()

    expect(CONFIG.DEBUG).toBeFalsy()
    expect(SOFTWARE_DEFAULTS.DEBUG).toBe(false)
  })

  it('defaults DISABLED_MIDDLEWARES to the empty list', async () => {
    const { default: CONFIG } = await loadConfigWithFlagsUnset()

    expect(CONFIG.DISABLED_MIDDLEWARES).toEqual(SOFTWARE_DEFAULTS.DISABLED_MIDDLEWARES)
  })
})
