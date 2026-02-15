/* eslint-disable no-console */
/**
 * Generates Vue render-function icon components from IcoMoon SVGs.
 *
 * Usage:
 *   npm run generate:webapp-icons -- angle-down       # Generate one icon
 *   npm run generate:webapp-icons -- --all            # Generate all icons
 */

import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const SVG_DIR = resolve(scriptDir, '../../../webapp/assets/_new/icons/svgs')
const OUT_DIR = resolve(scriptDir, '../src/webapp/icons')

/** Convert kebab-case to PascalCase and prepend "Icon" */
function toPascalName(kebab: string): string {
  const pascal = kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  return `Icon${pascal}`
}

/** Extract all path `d` attributes from an IcoMoon SVG */
function extractPaths(svg: string): string[] {
  const paths: string[] = []
  const regex = /<path\s+d="([^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(svg)) !== null) {
    paths.push(match[1])
  }

  return paths
}

/** Generate TypeScript source for an icon component */
function generateIcon(name: string, paths: string[]): string {
  const exportName = toPascalName(name)
  const pathElements = paths.map((d) => `    h('path', {\n      d: '${d}',\n    })`).join(',\n')

  return `// Auto-generated from webapp SVGs — do not edit
import { h } from 'vue-demi'

import type { VNode } from 'vue-demi'

export const ${exportName} = (): VNode =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 32 32', fill: 'currentColor' }, [
${pathElements},
  ])
`
}

/** Generate barrel export index.ts */
function generateIndex(names: string[]): string {
  const sorted = [...names].sort()
  const exports = sorted.map((n) => `export { ${toPascalName(n)} } from './${n}'`).join('\n')
  return `// Auto-generated — do not edit\n${exports}\n`
}

/** Check if a path exists */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false
    throw error
  }
}

/** List all available icon names from SVG directory */
async function listAvailableIcons(): Promise<string[]> {
  const files = await readdir(SVG_DIR)
  return files
    .filter((f) => f.endsWith('.svg'))
    .map((f) => basename(f, '.svg'))
    .sort()
}

/** Get existing generated icon names from output directory */
async function listExistingIcons(): Promise<string[]> {
  if (!(await exists(OUT_DIR))) return []
  const files = await readdir(OUT_DIR)
  return files
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => basename(f, '.ts'))
    .sort()
}

// --- Main ---

const args = process.argv.slice(2)

if (args.length === 0) {
  const available = await listAvailableIcons()
  console.log('Usage:')
  console.log('  npm run generate:webapp-icons -- <icon-name>    # Generate one icon')
  console.log('  npm run generate:webapp-icons -- --all          # Generate all icons')
  console.log(`\nAvailable icons (${String(available.length)}):`)
  console.log(available.join(', '))
  process.exit(0)
}

const isAll = args.includes('--all')
const iconNames = isAll ? await listAvailableIcons() : args.filter((a) => !a.startsWith('-'))

// Validate
for (const name of iconNames) {
  const svgPath = resolve(SVG_DIR, `${name}.svg`)
  if (!(await exists(svgPath))) {
    console.error(`SVG not found: ${svgPath}`)
    process.exit(1)
  }
}

// Ensure output directory exists
await mkdir(OUT_DIR, { recursive: true })

// Generate icon files
for (const name of iconNames) {
  const svgPath = resolve(SVG_DIR, `${name}.svg`)
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path from CLI args, not user input
  const svg = await readFile(svgPath, 'utf-8')
  const paths = extractPaths(svg)

  if (paths.length === 0) {
    console.warn(`Warning: No <path> elements found in ${name}.svg, skipping`)
    continue
  }

  const source = generateIcon(name, paths)
  const outPath = resolve(OUT_DIR, `${name}.ts`)
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- generated output path, not user input
  await writeFile(outPath, source)
  console.log(`Generated: ${name}.ts (${toPascalName(name)})`)
}

// Update barrel export with all existing + newly generated icons
const allIcons = [...new Set([...(await listExistingIcons()), ...iconNames])].sort()
const indexSource = generateIndex(allIcons)
await writeFile(resolve(OUT_DIR, 'index.ts'), indexSource)
console.log(
  `Updated: index.ts (${String(allIcons.length)} icon${allIcons.length === 1 ? '' : 's'})`,
)
