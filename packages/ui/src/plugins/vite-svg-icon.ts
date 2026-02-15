import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { Plugin } from 'vite'

const SUFFIX = '?icon'

/** Escape a string for safe embedding in a single-quoted JS literal */
function escapeJS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

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

      const unsupported = svg.match(/<(?:circle|rect|polygon|polyline|ellipse|line)\s/g)
      if (unsupported) {
        this.warn(
          `${filePath}: unsupported SVG elements will be ignored: ${[...new Set(unsupported.map((s) => s.trim()))].join(', ')}`,
        )
      }

      const paths: string[] = []
      const pathRegex = /<path\s[^>]*?\bd="([^"]+)"/g
      let match: RegExpExecArray | null
      while ((match = pathRegex.exec(svg)) !== null) {
        paths.push(match[1])
      }

      const pathElements = paths
        .map((d) => {
          const escaped = escapeJS(d)
          return `_h('path', _v2 ? { attrs: { d: '${escaped}' } } : { d: '${escaped}' })`
        })
        .join(', ')

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
