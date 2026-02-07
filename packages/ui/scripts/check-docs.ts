#!/usr/bin/env npx tsx
/**
 * Documentation completeness checker for @ocelot-social/ui
 *
 * Checks:
 * 1. Every component has a story file
 * 2. All variant values are demonstrated in stories
 *
 * Note: JSDoc comments on props are checked via ESLint (jsdoc/require-jsdoc)
 */

import { readFileSync, existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import { glob } from 'glob'

interface CheckResult {
  component: string
  errors: string[]
  warnings: string[]
}

const results: CheckResult[] = []
let hasErrors = false

// Find all Vue components (excluding index files)
const components = glob.sync('src/components/**/Os*.vue')

for (const componentPath of components) {
  const componentName = basename(componentPath, '.vue')
  const componentDir = dirname(componentPath)
  const storyPath = join(componentDir, `${componentName}.stories.ts`)
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
  if (!existsSync(storyPath)) {
    result.errors.push(`Missing story file: ${storyPath}`)
  }

  // Check 2: Variant values are demonstrated in stories
  if (existsSync(storyPath) && existsSync(variantsPath)) {
    const variantsContent = readFileSync(variantsPath, 'utf-8')
    const storyContent = readFileSync(storyPath, 'utf-8')

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
  console.log('✓ All documentation checks passed!')
} else {
  console.log('Documentation check results:\n')

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
    console.log('Documentation check failed with errors.')
    process.exit(1)
  } else {
    console.log('Documentation check passed with warnings.')
  }
}
