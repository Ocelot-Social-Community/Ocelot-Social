import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { Plugin } from 'vite'

const SUFFIX = '?icon'

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
        this.warn(`${filePath}: unsupported SVG elements will be ignored: ${[...new Set(unsupported.map((s) => s.trim()))].join(', ')}`)
      }

      const paths: string[] = []
      const pathRegex = /<path\s[^>]*?\bd="([^"]+)"/g
      let match: RegExpExecArray | null
      while ((match = pathRegex.exec(svg)) !== null) {
        paths.push(match[1])
      }

      const pathElements = paths
        .map((d) => `h('path', isVue2 ? { attrs: { d: '${d}' } } : { d: '${d}' })`)
        .join(', ')

      return `import { h, isVue2 } from 'vue-demi'
const svgAttrs = { xmlns: 'http://www.w3.org/2000/svg', viewBox: '${viewBox}', fill: 'currentColor' }
export default () => h('svg', isVue2 ? { attrs: svgAttrs } : svgAttrs, [${pathElements}])
`
    },
  }
}
