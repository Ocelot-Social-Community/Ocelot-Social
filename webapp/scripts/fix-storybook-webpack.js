#!/usr/bin/env node
/**
 * vue-loader@15's webpack5 plugin requires several internal webpack 5 modules
 * from webpack/lib/rules/ (BasicEffectRulePlugin, BasicMatcherRulePlugin, etc.).
 * Yarn may hoist webpack 4 to the top-level node_modules, leaving the top-level
 * webpack without a lib/rules/ directory, which causes storybook dev to fail with
 * "Cannot find module" before compilation even starts.
 *
 * This script copies the entire lib/rules/ directory from the nested webpack 5
 * installed under @storybook/preset-vue-webpack into the top-level webpack so
 * that vue-loader's module resolution finds the right files regardless of hoisting.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const destDir = path.join(root, 'node_modules', 'webpack', 'lib', 'rules')

const candidateDirs = [
  path.join(
    root,
    'node_modules',
    '@storybook',
    'preset-vue-webpack',
    'node_modules',
    'webpack',
    'lib',
    'rules',
  ),
  path.join(
    root,
    'node_modules',
    '@storybook',
    'builder-webpack5',
    'node_modules',
    'webpack',
    'lib',
    'rules',
  ),
]

const sourceDir = candidateDirs.find((p) => fs.existsSync(p))

if (!sourceDir) {
  // eslint-disable-next-line no-console
  console.warn(
    'fix-storybook-webpack: webpack/lib/rules/ not found in any nested storybook webpack — storybook dev may fail',
  )
} else {
  fs.mkdirSync(destDir, { recursive: true })

  let copied = 0
  for (const file of fs.readdirSync(sourceDir)) {
    const dest = path.join(destDir, file)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(sourceDir, file), dest)
      copied++
    }
  }

  if (copied > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `Copied ${copied} file(s) into top-level webpack/lib/rules/ for vue-loader compatibility`,
    )
  }
}
