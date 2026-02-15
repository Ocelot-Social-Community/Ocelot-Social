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

      const paths: string[] = []
      const pathRegex = /<path\s+d="([^"]+)"/g
      let match: RegExpExecArray | null
      while ((match = pathRegex.exec(svg)) !== null) {
        paths.push(match[1])
      }

      const pathElements = paths.map((d) => `h('path', { d: '${d}' })`).join(', ')

      return `import { h } from 'vue-demi'
export default () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '${viewBox}', fill: 'currentColor' }, [${pathElements}])
`
    },
  }
}
