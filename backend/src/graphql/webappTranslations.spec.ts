// Reading the webapp's locale files is the point of this test, and it walks them by the keys it
// finds there — neither is an injection sink.
/* eslint-disable n/no-sync */
/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'

import { describe, it, expect } from 'vitest'

import { allGroupPermissionKeys } from '@src/groupPermission'
import { allPermissionKeys } from '@src/permission'

import { Errors } from './errorRegistry'

// What the webapp must be able to say about what the backend sends: a translation for every
// error code, and a label for every right in both permission catalogs. Neither side can see the
// other, so a code or right added here, or a translation removed there, used to show the user the
// raw key — and a translation left behind once its code is gone is dead weight in 11 languages.
//
// en.json is the reference: the webapp's own checks hold every other locale to its keys. Only the
// emptiness check reads all of them, since an empty string is a key present in each and a label
// in none.
//
// The webapp builds these keys at runtime (`backendErrors.${code}`, utils/permissionLabel.js), so
// no check of the webapp's sources alone can tell whether they are all there, or all still needed.

const LOCALES_DIR = path.resolve(import.meta.dirname, '../../../webapp/locales')

interface Messages {
  [key: string]: string | Messages
}

const readLocale = (file: string): Messages =>
  JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8')) as Messages

const english = readLocale('en.json')
const locales = fs
  .readdirSync(LOCALES_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({ file, messages: readLocale(file) }))

const namespace = (messages: Messages, dottedPath: string): Messages => {
  let node: string | Messages | undefined = messages
  for (const segment of dottedPath.split('.')) {
    node = typeof node === 'object' ? node[segment] : undefined
  }
  return typeof node === 'object' ? node : {}
}

const sorted = (keys: Iterable<string>) => [...keys].sort()

describe('the webapp translates every error code', () => {
  // `generic` holds the fallbacks for codes the webapp does not know (yet), not a code.
  const translated = Object.keys(namespace(english, 'backendErrors')).filter(
    (key) => key !== 'generic',
  )

  it('under backendErrors.<CODE>, and no translation outlives its code', () => {
    expect(sorted(translated)).toEqual(sorted(Object.keys(Errors)))
  })
})

// The catalog key with its dots as underscores (see webapp/utils/permissionLabel.js).
const asLabelKey = (permission: string) => permission.replace(/\./g, '_')

describe.each([
  { catalog: 'network', labels: 'admin.roles.perm', keys: allPermissionKeys() },
  { catalog: 'group', labels: 'group.rights.perm', keys: allGroupPermissionKeys() },
])('the webapp labels every right of the $catalog catalog', ({ labels, keys }) => {
  it(`under ${labels}.<key>, and no label outlives its right`, () => {
    expect(sorted(Object.keys(namespace(english, labels)))).toEqual(sorted(keys.map(asLabelKey)))
  })

  // permissionLabel falls back to the catalog's English for an empty label, so the key being
  // present proves nothing.
  it.each(locales)('with no empty label in $file', ({ messages }) => {
    const empty = Object.entries(namespace(messages, labels))
      .filter(([, label]) => typeof label !== 'string' || label.trim() === '')
      .map(([key]) => key)

    expect(empty).toEqual([])
  })
})
