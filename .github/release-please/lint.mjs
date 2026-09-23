// Consistency checks for the release-please config/manifest pairs in this directory. Run by
// .github/workflows/release-please-lint.yml; see README.md for what the invariants are FOR.
//
// Every check here exists because breaking it fails silently: a config that no workflow reads, a
// manifest that names a path the config does not release, a `changelog-sections` list that drifted
// out of sync — none of those make a release workflow red. They just quietly release the wrong
// thing, or stop releasing, or drop half the changelog.
//
// ajv and the release-please schema are not dependencies of this repository; the workflow installs
// them into a throwaway prefix and passes it in, because pulling release-please into the root
// package.json for a lint would put a release tool into the application's dependency tree.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const WORKFLOWS = path.join(HERE, '..', 'workflows')

const modulesPrefix = process.env.RP_LINT_MODULES
if (!modulesPrefix) {
  console.error('RP_LINT_MODULES is not set — it must point at the prefix holding node_modules')
  process.exit(2)
}
const require = createRequire(path.join(modulesPrefix, '/'))
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const schema = require('release-please/schemas/config.json')

const problems = []
const fail = (file, message) => problems.push({ file, message })

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(HERE, file), 'utf8'))
const entries = fs.readdirSync(HERE)
const configs = entries.filter((f) => f.endsWith('-config.json')).sort()
const manifests = entries.filter((f) => f.endsWith('-manifest.json')).sort()

if (configs.length === 0) fail('.', 'no *-config.json found — the lint would pass vacuously')

// 1. Schema. Catches options that moved or were dropped between release-please versions, and
//    options placed at the wrong level — `component-no-space` is valid per package and rejected at
//    the top level, which no amount of runtime testing reveals because the runtime accepts both.
const ajv = new Ajv({ strict: false, allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)

// 2. Pairing. `<name>-config.json` and `<name>-manifest.json` belong together, and the manifest's
//    keys have to be exactly the paths the config releases — a manifest key the config does not
//    list is a version nobody bumps, and a config path the manifest does not list makes
//    release-please treat the package as never released and start its history from the first commit.
const namesFromConfigs = configs.map((f) => f.replace('-config.json', ''))
const namesFromManifests = manifests.map((f) => f.replace('-manifest.json', ''))
for (const name of namesFromConfigs) {
  if (!namesFromManifests.includes(name)) fail(`${name}-config.json`, `has no ${name}-manifest.json`)
}
for (const name of namesFromManifests) {
  if (!namesFromConfigs.includes(name)) fail(`${name}-manifest.json`, `has no ${name}-config.json`)
}

const sectionLists = new Map()

for (const file of configs) {
  const config = readJson(file)
  const name = file.replace('-config.json', '')

  if (!validate(config)) {
    for (const error of validate.errors) {
      fail(file, `schema: ${error.instancePath || '/'} ${error.message}`)
    }
  }

  const configPaths = Object.keys(config.packages ?? {}).sort()
  if (configPaths.length === 0) fail(file, 'releases no package at all (`packages` is empty)')

  if (namesFromManifests.includes(name)) {
    const manifestPaths = Object.keys(readJson(`${name}-manifest.json`)).sort()
    if (JSON.stringify(configPaths) !== JSON.stringify(manifestPaths)) {
      fail(file, `releases ${JSON.stringify(configPaths)} but ${name}-manifest.json versions ${JSON.stringify(manifestPaths)}`)
    }
  }

  // 3. Changelog sections. Duplicated across every config because release-please has no include
  //    mechanism, so nothing but this check keeps them identical. Drift is invisible: the package
  //    whose list was not updated simply stops listing a category.
  if (!config['changelog-sections']) {
    fail(file, 'has no `changelog-sections` — it would fall back to the defaults, which hide refactor, build, chore, ci, test and style')
  } else {
    sectionLists.set(file, JSON.stringify(config['changelog-sections']))
  }

  // 4. Exactly one workflow per config. Two workflows reading one config is what lost the
  //    @ocelot-social/ui@0.0.2 publish — both ran on the same commit and raced for the same tag.
  //    Zero workflows reading it is the quieter failure: the package simply never releases.
  const readers = fs
    .readdirSync(WORKFLOWS)
    .filter((w) => w.endsWith('.yml'))
    .filter((w) => fs.readFileSync(path.join(WORKFLOWS, w), 'utf8').includes(file))
  if (readers.length !== 1) {
    fail(file, `is referenced by ${readers.length} workflow(s) [${readers.join(', ')}] — expected exactly 1`)
  }
}

const distinct = new Set(sectionLists.values())
if (distinct.size > 1) {
  const grouped = [...sectionLists.entries()].map(([f, s]) => `${f}: ${JSON.parse(s).map((x) => x.type).join(',')}`)
  fail('.', `changelog-sections differ between configs — they must be identical:\n    ${grouped.join('\n    ')}`)
}

if (problems.length > 0) {
  console.error(`release-please config lint: ${problems.length} problem(s)\n`)
  for (const { file, message } of problems) console.error(`  ${file}: ${message}`)
  process.exit(1)
}

console.log(`release-please config lint: ${configs.length} config(s) OK — ${configs.join(', ')}`)
