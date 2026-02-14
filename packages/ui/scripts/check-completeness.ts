/**
 * Completeness checker for @ocelot-social/ui components
 *
 * Checks:
 * 1. Every component has a story file (documentation)
 * 2. Every component has a visual regression test file (quality)
 * 3. Visual tests include accessibility checks via checkA11y() (quality)
 * 4. Every component has keyboard accessibility tests (quality)
 * 5. All variant values are demonstrated in stories (coverage)
 * 6. All stories have visual regression tests (coverage)
 *
 * Note: JSDoc comments on props are checked via ESLint (jsdoc/require-jsdoc)
 */

import { access, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import { glob } from 'glob'

/**
 * Convert PascalCase to kebab-case (e.g., "AllVariants" -> "all-variants")
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

interface CheckResult {
  component: string
  errors: string[]
  warnings: string[]
}

const results: CheckResult[] = []
let hasErrors = false

// Find all Vue components (excluding index files)
const components = await glob('src/components/**/Os*.vue')

for (const componentPath of components) {
  const componentName = basename(componentPath, '.vue')
  const componentDir = dirname(componentPath)
  const storyPath = join(componentDir, `${componentName}.stories.ts`)
  const visualTestPath = join(componentDir, `${componentName}.visual.spec.ts`)
  const unitTestPath = join(componentDir, `${componentName}.spec.ts`)
  const variantsPath = join(
    componentDir,
    `${componentName.toLowerCase().replace('os', '')}.variants.ts`,
  )

  const result: CheckResult = {
    component: componentName,
    errors: [],
    warnings: [],
  }

  // Check 1: Story file exists
  if (!(await fileExists(storyPath))) {
    result.errors.push(`Missing story file: ${storyPath}`)
  }

  // Check 2: Visual regression test file exists
  if (!(await fileExists(visualTestPath))) {
    result.errors.push(`Missing visual test file: ${visualTestPath}`)
  }

  // Check 3: Visual tests include accessibility checks
  if (await fileExists(visualTestPath)) {
    const visualTestContent = await readFile(visualTestPath, 'utf-8')
    if (!visualTestContent.includes('checkA11y(')) {
      result.errors.push(`Missing checkA11y() calls in visual tests: ${visualTestPath}`)
    }
  }

  // Check 4: Keyboard accessibility tests exist
  if (await fileExists(unitTestPath)) {
    const unitTestContent = await readFile(unitTestPath, 'utf-8')
    if (!unitTestContent.includes("describe('keyboard accessibility'")) {
      result.errors.push(`Missing keyboard accessibility tests in: ${unitTestPath}`)
    }
  } else {
    result.errors.push(`Missing unit test file: ${unitTestPath}`)
  }

  // Check 5 & 6: Story and visual test coverage
  if ((await fileExists(storyPath)) && (await fileExists(visualTestPath))) {
    const storyContent = await readFile(storyPath, 'utf-8')
    const visualTestContent = await readFile(visualTestPath, 'utf-8')

    // Extract exported story names (e.g., "export const Primary: Story")
    const storyExports = storyContent.matchAll(/export\s+const\s+(\w+):\s*Story/g)

    for (const match of storyExports) {
      const storyName = match[1]
      const kebabName = toKebabCase(storyName)

      // Check if this story is tested in visual tests (URL pattern: --story-name)
      if (!visualTestContent.includes(`--${kebabName}`)) {
        result.warnings.push(`Story "${storyName}" missing visual test (--${kebabName})`)
      }
    }
  }

  // Check 5: Variant values are demonstrated in stories
  if ((await fileExists(storyPath)) && (await fileExists(variantsPath))) {
    const variantsContent = await readFile(variantsPath, 'utf-8')
    const storyContent = await readFile(storyPath, 'utf-8')

    // Extract variants block
    const variantsBlockMatch = /variants:\s*\{([\s\S]*?)\n\s{4}\},/m.exec(variantsContent)

    if (variantsBlockMatch) {
      const variantsBlock = variantsBlockMatch[1]

      // Extract each variant type (variant, size, etc.)
      const variantTypeMatches = variantsBlock.matchAll(/^\s{6}(\w+):\s*\{([\s\S]*?)\n\s{6}\}/gm)

      for (const match of variantTypeMatches) {
        const variantName = match[1]
        const variantValues = match[2]

        // Extract individual values
        const valueMatches = variantValues.matchAll(/^\s+(\w+):\s*\[/gm)

        for (const valueMatch of valueMatches) {
          const value = valueMatch[1]
          // Check if this value appears in stories (multiple patterns)
          const patterns = [
            `${variantName}="${value}"`,
            `${variantName}='${value}'`,
            `${variantName}: '${value}'`,
            `${variantName}: "${value}"`,
          ]

          const found = patterns.some((p) => storyContent.includes(p))
          if (!found) {
            result.warnings.push(`Variant "${variantName}=${value}" not demonstrated in story`)
          }
        }
      }
    }
  }

  if (result.errors.length > 0 || result.warnings.length > 0) {
    results.push(result)
  }

  if (result.errors.length > 0) {
    hasErrors = true
  }
}

// Output results
if (results.length === 0) {
  console.log('✓ All completeness checks passed!')
} else {
  console.log('Completeness check results:\n')

  for (const result of results) {
    console.log(`${result.component}:`)

    for (const error of result.errors) {
      console.log(`  ✗ ${error}`)
    }

    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`)
    }

    console.log('')
  }

  if (hasErrors) {
    console.log('Completeness check failed with errors.')
    process.exit(1)
  } else {
    console.log('Completeness check passed with warnings.')
  }
}
