/* eslint-disable no-console */
/**
 * Copies webapp SVGs and generates barrel exports for the UI library.
 *
 * Usage:
 *   npm run generate:webapp-icons -- angle-down       # Copy one icon
 *   npm run generate:webapp-icons -- --all            # Copy all icons
 */

import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const SVG_DIR = resolve(scriptDir, '../../../webapp/assets/_new/icons/svgs')
const OUT_DIR = resolve(scriptDir, '../src/webapp/icons')
const OUT_SVG_DIR = resolve(OUT_DIR, 'svgs')

/** Convert kebab-case to PascalCase and prepend "Icon" */
function toPascalName(kebab: string): string {
  const pascal = kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  return `Icon${pascal}`
}

/** Generate barrel export index.ts */
function generateIndex(names: string[]): string {
  const sorted = [...names].sort()
  const imports = sorted
    .map((n) => `import _${toPascalName(n)} from './svgs/${n}.svg?icon'`)
    .join('\n')
  const exports = sorted
    .map((n) => `export const ${toPascalName(n)} = _${toPascalName(n)}`)
    .join('\n')
  return `// Auto-generated — do not edit\n${imports}\n\n${exports}\n`
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

/** Get existing icon names from output SVG directory */
async function listExistingIcons(): Promise<string[]> {
  if (!(await exists(OUT_SVG_DIR))) return []
  const files = await readdir(OUT_SVG_DIR)
  return files
    .filter((f) => f.endsWith('.svg'))
    .map((f) => basename(f, '.svg'))
    .sort()
}

/** Validate SVG has at least one path element */
async function validateSvg(svgPath: string, name: string): Promise<boolean> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path from CLI args, not user input
  const svg = await readFile(svgPath, 'utf-8')
  if (!/<path\s+d="[^"]+"/g.test(svg)) {
    console.warn(`Warning: No <path> elements found in ${name}.svg, skipping`)
    return false
  }
  return true
}

// --- Main ---

const args = process.argv.slice(2)

if (args.length === 0) {
  const available = await listAvailableIcons()
  console.log('Usage:')
  console.log('  npm run generate:webapp-icons -- <icon-name>    # Copy one icon')
  console.log('  npm run generate:webapp-icons -- --all          # Copy all icons')
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

// Ensure output directories exist
await mkdir(OUT_SVG_DIR, { recursive: true })

// Copy SVG files
for (const name of iconNames) {
  const srcPath = resolve(SVG_DIR, `${name}.svg`)

  if (!(await validateSvg(srcPath, name))) continue

  const destPath = resolve(OUT_SVG_DIR, `${name}.svg`)
  await copyFile(srcPath, destPath)
  console.log(`Copied: ${name}.svg`)
}

// Update barrel export with all existing + newly copied icons
const allIcons = [...new Set([...(await listExistingIcons()), ...iconNames])].sort()
const indexSource = generateIndex(allIcons)
await writeFile(resolve(OUT_DIR, 'index.ts'), indexSource)
console.log(
  `Updated: index.ts (${String(allIcons.length)} icon${allIcons.length === 1 ? '' : 's'})`,
)
