#!/usr/bin/env node
// Validiert, dass policy.schema.json ein wohlgeformtes JSON-Schema ist.
// Verwendet Ajv (transitiv im Stack).

import Ajv from 'ajv/dist/2020.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const schema = JSON.parse(readFileSync(resolve(ROOT, 'policy.schema.json'), 'utf8'))

const ajv = new Ajv({ strict: false, allErrors: true })
try {
  ajv.compile(schema)
  console.log('✓ policy.schema.json is a valid JSON-Schema')
} catch (err) {
  console.error('✗ Schema-Validation failed:')
  console.error(err.message)
  process.exit(1)
}
