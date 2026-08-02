// The runtime resolver (index.ts): `branding` is a live proxy over getBranding(), which returns the
// process-global injected config or the framework defaults. This is what lets a brand be grafted onto
// a pre-built image without a rebuild — so getBranding/setBranding and the proxy's live-ness are the
// contract. State lives on globalThis, so each test resets it first.
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

import { brandingDefaults } from '../dist/defaults.js'
import { branding, getBranding, setBranding } from '../dist/index.js'
import { defineBranding } from '../dist/merge.js'

beforeEach(() => setBranding(undefined))

test('getBranding returns the framework defaults when nothing is injected', () => {
  assert.deepEqual(getBranding(), brandingDefaults)
})

test('setBranding injects a config that getBranding then returns (same reference)', () => {
  const brand = defineBranding({ group: { nameLengthMax: 99 } })
  setBranding(brand)
  assert.equal(getBranding(), brand)
  assert.equal(getBranding().group.nameLengthMax, 99)
})

test('setBranding(undefined) resets to the framework defaults', () => {
  setBranding(defineBranding({ group: { nameLengthMax: 99 } }))
  setBranding(undefined)
  assert.deepEqual(getBranding(), brandingDefaults)
})

test('the `branding` proxy reflects the CURRENT injected config on each access (live)', () => {
  // Default first…
  assert.equal(branding.group.nameLengthMax, brandingDefaults.group.nameLengthMax)
  // …then a switch is visible through the SAME proxy object, without re-importing.
  setBranding(defineBranding({ group: { nameLengthMax: 7 } }))
  assert.equal(branding.group.nameLengthMax, 7)
  setBranding(undefined)
  assert.equal(branding.group.nameLengthMax, brandingDefaults.group.nameLengthMax)
})

test('the proxy exposes every config domain as an enumerable key', () => {
  const domains = Object.keys(branding)
  for (const key of Object.keys(brandingDefaults)) {
    assert.ok(domains.includes(key), `proxy is missing domain ${key}`)
  }
})
