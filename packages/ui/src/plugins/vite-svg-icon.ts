import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { Plugin } from 'vite'

const SUFFIX = '?icon'

/** Escape a string for safe embedding in a single-quoted JS literal */
function escapeJS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

const SUPPORTED_ELEMENTS = ['path', 'circle', 'rect', 'polygon', 'polyline', 'ellipse', 'line']

export default function svgIcon(): Plugin {
  return {
    name: 'svg-icon',
    enforce: 'pre',

    resolveId(source, importer) {
      if (!source.endsWith(SUFFIX)) return null
      const svgPath = source.slice(0, -SUFFIX.length)
      const resolved = importer ? resolve(importer, '..', svgPath) : svgPath
      return `\0svg-icon:${resolved}`
    },

    async load(id) {
      if (!id.startsWith('\0svg-icon:')) return null
      const filePath = id.slice('\0svg-icon:'.length)
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- resolved from Vite import graph
      const svg = await readFile(filePath, 'utf-8')

      const viewBoxRegex = /viewBox="([^"]+)"/
      const viewBoxMatch = viewBoxRegex.exec(svg)
      const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 32 32'

      const unsupported = svg.match(
        /<(?!\/|svg|path|circle|rect|polygon|polyline|ellipse|line|g\s|g>)(\w+)\s/g,
      )
      if (unsupported) {
        this.warn(
          `${filePath}: unsupported SVG elements will be ignored: ${[...new Set(unsupported.map((s) => s.trim()))].join(', ')}`,
        )
      }

      const children: string[] = []
      const elemRegex = new RegExp(
        `<(${SUPPORTED_ELEMENTS.join('|')})\\s([^>]*?)\\/>|<(${SUPPORTED_ELEMENTS.join('|')})\\s([^>]*?)>`,
        'g',
      )
      let match: RegExpExecArray | null
      while ((match = elemRegex.exec(svg)) !== null) {
        const tag = match[1] || match[3]
        const attrString = match[2] || match[4]
        const attrs: Record<string, string> = {}
        const attrRegex = /(\w[\w-]*)="([^"]+)"/g
        let attrMatch: RegExpExecArray | null
        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
          attrs[attrMatch[1]] = attrMatch[2]
        }
        const attrEntries = Object.entries(attrs)
          .map(([k, v]) => `'${escapeJS(k)}': '${escapeJS(v)}'`)
          .join(', ')
        children.push(`_h('${tag}', _v2 ? { attrs: { ${attrEntries} } } : { ${attrEntries} })`)
      }

      const pathElements = children.join(', ')

      const safeViewBox = escapeJS(viewBox)

      // Icon functions accept optional (h, v2) from OsIcon. When OsIcon passes
      // Vue 2's $createElement, we use it directly — avoiding the globally-imported
      // h() which requires currentInstance in Vue 2.7.
      // When used as a standalone Vue 3 component (e.g. in Storybook), h/v2 are not
      // functions/booleans, so we fall back to the imported _hImport / _v2Import.
      return `import { h as _hImport, isVue2 as _v2Import } from 'vue-demi'
const svgAttrs = { xmlns: 'http://www.w3.org/2000/svg', viewBox: '${safeViewBox}', fill: 'currentColor' }
export default (h, v2) => { const _h = typeof h === 'function' ? h : _hImport; const _v2 = typeof v2 === 'boolean' ? v2 : _v2Import; return _h('svg', _v2 ? { attrs: svgAttrs } : svgAttrs, [${pathElements}]) }
`
    },
  }
}
