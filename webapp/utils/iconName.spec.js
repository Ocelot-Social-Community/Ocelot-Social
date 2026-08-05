import { readdirSync } from 'fs'
import { join } from 'path'

import { iconKeyFromFile, toCamelCase } from './iconName.js'

const SVG_DIR = join(__dirname, '..', 'assets', 'icons', 'svgs')

describe('toCamelCase', () => {
  it('joins kebab segments', () => {
    expect(toCamelCase('file-text')).toBe('fileText')
    expect(toCamelCase('sort-alpha-asc')).toBe('sortAlphaAsc')
  })

  it('leaves a single segment alone', () => {
    expect(toCamelCase('archive')).toBe('archive')
  })

  it('drops empty segments instead of producing an undefined character', () => {
    expect(toCamelCase('foo--bar')).toBe('fooBar')
    expect(toCamelCase('-lead')).toBe('lead')
  })

  it('is safe on empty input', () => {
    expect(toCamelCase('')).toBe('')
  })
})

describe('iconKeyFromFile', () => {
  it('strips the context prefix and the extension', () => {
    expect(iconKeyFromFile('./file-text.svg')).toBe('fileText')
  })

  // The reason the replacements are anchored. An unanchored `replace('.svg', '')` removes the FIRST
  // occurrence, so this file would be registered under a key nobody looks up — the icon exists but
  // cannot be resolved.
  it('strips only the extension, not an earlier .svg inside the name', () => {
    expect(iconKeyFromFile('./my.svg.icon.svg')).toBe('my.svg.icon')
  })

  it('does not treat a non-svg name as if it ended in .svg', () => {
    expect(iconKeyFromFile('./icon.svg.js')).toBe('icon.svg.js')
  })
})

// Guards the inventory itself, not just the function: these are the icons the app actually ships,
// and a brand adds its own SVGs to this very directory.
describe('the icons in assets/icons/svgs', () => {
  const files = readdirSync(SVG_DIR).filter((f) => f.endsWith('.svg'))

  it('are present at all — an empty directory would make every icon silently disappear', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('each yield a non-empty registry key', () => {
    const keyless = files.filter((f) => !iconKeyFromFile(`./${f}`))
    expect(keyless).toEqual([])
  })

  it('each yield a UNIQUE key, so none of them hides another', () => {
    const byKey = new Map()
    const collisions = []
    for (const file of files) {
      const key = iconKeyFromFile(`./${file}`)
      if (byKey.has(key)) collisions.push(`${byKey.get(key)} and ${file} both map to "${key}"`)
      else byKey.set(key, file)
    }
    expect(collisions).toEqual([])
  })

  it('live in a flat directory, which is what the registry’s non-recursive context assumes', () => {
    const entries = readdirSync(SVG_DIR, { withFileTypes: true })
    expect(entries.filter((e) => e.isDirectory()).map((e) => e.name)).toEqual([])
  })
})
