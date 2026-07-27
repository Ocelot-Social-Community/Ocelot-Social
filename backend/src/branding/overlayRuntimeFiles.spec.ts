/* eslint-disable n/no-sync */ // test drives the sync overlay against a real temp dir
/* eslint-disable security/detect-non-literal-fs-filename */ // temp-dir paths built in-test
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { overlayBrandRuntimeFiles } from './overlayRuntimeFiles'

describe('overlayBrandRuntimeFiles', () => {
  let root: string
  let emailsDir: string
  let publicDir: string

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'ocelot-overlay-'))
    emailsDir = path.join(root, 'emails')
    publicDir = path.join(root, 'public')
    mkdirSync(path.join(emailsDir, 'locales'), { recursive: true })
    mkdirSync(path.join(emailsDir, 'templates'), { recursive: true })
    mkdirSync(publicDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const run = (entries: [string, string][]) => {
    overlayBrandRuntimeFiles(new Map(entries.map(([k, v]) => [k, Buffer.from(v)])), {
      emailsDir,
      publicDir,
    })
  }

  it('overlays e-mail templates (replacing the default)', () => {
    run([['emails/templates/registration/html.pug', 'p brand registration']])
    expect(readFileSync(path.join(emailsDir, 'templates/registration/html.pug'), 'utf8')).toBe(
      'p brand registration',
    )
  })

  it('deep-merges e-mail locales over the default (brand wins, base kept)', () => {
    writeFileSync(
      path.join(emailsDir, 'locales/en.json'),
      JSON.stringify({ greeting: { hello: 'Hi', bye: 'Bye' }, keep: 'z' }),
    )
    run([
      ['emails/locales/en.json', JSON.stringify({ greeting: { hello: 'Welcome' }, extra: 'x' })],
    ])
    const merged = JSON.parse(
      readFileSync(path.join(emailsDir, 'locales/en.json'), 'utf8'),
    ) as unknown
    expect(merged).toEqual({ greeting: { hello: 'Welcome', bye: 'Bye' }, keep: 'z', extra: 'x' })
  })

  it('overlays public assets (e.g. brand badge SVGs)', () => {
    run([['public/img/badges/default_trophy.svg', '<svg>brand</svg>']])
    expect(readFileSync(path.join(publicDir, 'img/badges/default_trophy.svg'), 'utf8')).toBe(
      '<svg>brand</svg>',
    )
  })

  it('skips path-traversal entries (no write outside the target dirs)', () => {
    run([
      ['public/../evil.txt', 'x'],
      ['emails/templates/../../evil.pug', 'x'],
    ])
    expect(existsSync(path.join(root, 'evil.txt'))).toBe(false)
    expect(existsSync(path.join(root, 'emails/evil.pug'))).toBe(false)
  })

  it('ignores entries outside the known prefixes (assets/html/manifest)', () => {
    run([
      ['assets/logo.svg', 'x'],
      ['html/en/imprint.html', 'x'],
      ['manifest.json', '{}'],
    ])
    expect(existsSync(path.join(emailsDir, 'assets'))).toBe(false)
    expect(existsSync(path.join(publicDir, 'logo.svg'))).toBe(false)
  })
})
