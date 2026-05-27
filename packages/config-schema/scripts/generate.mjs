#!/usr/bin/env node
// Codegen: Liest policy.schema.json und generiert TS-Typen.
// Output: generated/policy.types.ts

import { compile } from 'json-schema-to-typescript'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const schema = JSON.parse(readFileSync(resolve(ROOT, 'policy.schema.json'), 'utf8'))

const ts = await compile(schema, 'NetworkPolicy', {
  bannerComment: `/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand.
 * Source: packages/config-schema/policy.schema.json
 * Regenerate via: yarn workspace @ocelot-social/config-schema build
 */
`,
  style: { semi: false, singleQuote: true, printWidth: 100 },
  additionalProperties: false,
})

mkdirSync(resolve(ROOT, 'generated'), { recursive: true })
writeFileSync(resolve(ROOT, 'generated', 'policy.types.ts'), ts)

console.log('✓ generated/policy.types.ts')
