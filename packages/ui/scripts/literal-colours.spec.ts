import { describe, expect, it } from 'vitest'

import { findLiteralColours } from './literal-colours'

const literals = (source: string, fileName = 'Os.variants.ts') =>
  findLiteralColours(source, fileName).map(({ literal }) => literal)

describe(findLiteralColours, () => {
  describe('reports colours that stay the same in light and dark', () => {
    it('finds the white panel OsDrawer had (#11092)', () => {
      expect(
        findLiteralColours("const panel = ['bg-white shadow-xl']", 'drawer.variants.ts'),
      ).toStrictEqual([{ literal: 'bg-white', line: 1 }])
    })

    it.each([
      'text-black',
      'bg-gray-100',
      'border-slate-300',
      'border-t-red-500',
      'ring-offset-blue-600',
      'hover:bg-black/70',
    ])('finds the Tailwind colour %s', (cls) => {
      expect(literals(`'flex ${cls} p-2'`)).toStrictEqual([cls.replace('hover:', '')])
    })

    it.each([
      ['a hex colour', "'bg-[#fafafa]'", '#fafafa'],
      ['rgb()', "'bg-[rgb(1,2,3)]'", 'rgb(1,2,3)'],
      ['oklch()', 'color: oklch(0.5 0.1 200);', 'oklch(0.5 0.1 200)'],
      ['a hex prop default', "default: '#3FB1CE'", '#3FB1CE'],
    ])('finds %s', (_, source, literal) => {
      expect(literals(source)).toStrictEqual([literal])
    })

    it('finds named colours in a .vue <style> block and in a .css file', () => {
      const vue = '<template><p>black</p></template>\n<style>\n.a { color: black; }\n</style>'

      expect(findLiteralColours(vue, 'Os.vue')).toStrictEqual([{ literal: 'black', line: 3 }])
      expect(literals('.a { background: white; }', 'a.css')).toStrictEqual(['white'])
    })

    it('finds a literal used as the first argument of var(), where it is no fallback', () => {
      expect(
        literals('.a { color: color-mix(in srgb, white 10%, var(--x)); }', 'a.css'),
      ).toStrictEqual(['white'])
      expect(literals("'bg-[rgb(0,0,0)] text-[var(--x)]'")).toStrictEqual(['rgb(0,0,0)'])
    })

    it('counts lines in multi-line sources', () => {
      expect(findLiteralColours("[\n  'p-2',\n  'bg-white',\n]", 'a.ts')).toStrictEqual([
        { literal: 'bg-white', line: 3 },
      ])
    })
  })

  it('reports several literals in source order, whatever kind they are', () => {
    expect(
      findLiteralColours("const a = '#fff'\nconst b = 'bg-white text-gray-500'", 'a.ts'),
    ).toStrictEqual([
      { literal: '#fff', line: 1 },
      { literal: 'bg-white', line: 2 },
      { literal: 'text-gray-500', line: 2 },
    ])
  })

  describe('accepts what follows the theme', () => {
    it.each([
      ["'bg-[var(--background-color-base,white)]'", 'a.variants.ts'],
      ["'from-[var(--background-color-base,white)]'", 'a.variants.ts'],
      ["'bg-[var(--background-color-softer,#f5f5f5)]'", 'a.variants.ts'],
      ["'shadow-[0_-20px_15px_-10px_var(--background-color-base,rgba(255,255,255,0.9))]'", 'a.ts'],
      ['.a { color: var(--a, var(--b, rgb(230, 121, 25))); }', 'a.css'],
      ['.a { color: var(--a, color-mix(in srgb, var(--b, rgb(1, 2, 3)), black 20%)); }', 'a.css'],
      [
        '.a {\n  border-color: var(\n    --a,\n    color-mix(in srgb, var(--b), black 20%)\n  );\n}',
        'a.css',
      ],
      ['<style>\n.a { background: var(--a, white); }\n</style>', 'Os.vue'],
    ])('a literal that is only the fallback of a var(): %s', (source, fileName) => {
      expect(literals(source, fileName)).toStrictEqual([])
    })

    it('names that merely contain a colour word', () => {
      expect(literals("'whitespace-nowrap text-primary bg-black-ish'", 'a.ts')).toStrictEqual([])
      expect(literals('<style>.a { white-space: nowrap; }</style>', 'Os.vue')).toStrictEqual([])
    })

    it('issue references and colours in comments', () => {
      const source = "// was bg-white (#11092)\n/* color: #fff */\n<!-- text-black -->\n'p-2'"

      expect(literals(source, 'Os.vue')).toStrictEqual([])
    })

    it('uRLs, whose // is no comment', () => {
      expect(literals("const url = 'https://example.org'; const c = '#fff'")).toStrictEqual([
        '#fff',
      ])
    })

    it('named colours outside CSS (template text, script strings)', () => {
      expect(
        literals("<template><p>white</p></template>\n<script>const a = 'black'</script>", 'Os.vue'),
      ).toStrictEqual([])
    })
  })
})
