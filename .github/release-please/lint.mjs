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
const { JSONPath } = require('jsonpath-plus')
const schema = require('release-please/schemas/config.json')

const REPO = path.join(HERE, '..', '..')
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

// 5. Lockstep versions. Everything a config claims to bump has to actually carry the version the
//    manifest records. This is the check that fires on the release pull request itself — that pull
//    request edits `<name>-manifest.json`, so it triggers this workflow, and any file the bump
//    missed still shows the previous version while the manifest already shows the new one.
//
//    It exists because the failure is invisible otherwise. `extra-files` entries are strings or
//    objects, and release-please picks a DIFFERENT updater per form and per file extension: the
//    bare string `"…/Chart.yaml"` is routed to `GenericYaml('$.version')`, which reparses and
//    reserialises the YAML — stripping every comment, including the `x-release-please-version`
//    markers — and never touches `appVersion`. Nothing fails; the chart is simply wrong, and the
//    branded deployments resolve an appVersion that no longer matches the release.
const MARKER = 'x-release-please-version'
const BLOCK_MARKER = 'x-release-please-start-'
const TRAP_EXTENSIONS = /\.(json|ya?ml|toml|xml)$/

// `extra-files` are relative to the package path, except for the root component and for paths
// written with a leading slash, which are relative to the repository root.
const resolveExtra = (pkgPath, filePath) =>
  filePath.startsWith('/') || pkgPath === '.' ? filePath.replace(/^\//, '') : path.posix.join(pkgPath, filePath)

function checkGeneric(configFile, relPath, version) {
  const abs = path.join(REPO, relPath)
  if (!fs.existsSync(abs)) return fail(configFile, `bumps ${relPath}, which does not exist`)
  const lines = fs.readFileSync(abs, 'utf8').split('\n')
  const marked = lines.filter((l) => l.includes(MARKER) && !l.includes(BLOCK_MARKER))
  if (marked.length === 0 && !lines.some((l) => l.includes('x-release-please-'))) {
    return fail(configFile, `bumps ${relPath} with the generic updater, but that file carries no \`${MARKER}\` marker — the bump would be a silent no-op`)
  }
  for (const line of marked) {
    if (!line.includes(version)) {
      fail(configFile, `${relPath} is marked for bumping but reads \`${line.trim()}\` while the manifest says ${version}`)
    }
  }
}

function checkJsonPath(configFile, relPath, jsonpath, version) {
  const abs = path.join(REPO, relPath)
  if (!fs.existsSync(abs)) return fail(configFile, `bumps ${relPath}, which does not exist`)
  let found
  try {
    found = JSONPath({ path: jsonpath, json: JSON.parse(fs.readFileSync(abs, 'utf8')) })
  } catch (error) {
    return fail(configFile, `cannot evaluate \`${jsonpath}\` against ${relPath}: ${error.message}`)
  }
  if (found.length === 0) return fail(configFile, `\`${jsonpath}\` matches nothing in ${relPath} — the bump would be a silent no-op`)
  for (const value of found) {
    if (value !== version) fail(configFile, `${relPath} \`${jsonpath}\` is ${JSON.stringify(value)}, manifest says ${version}`)
  }
}

for (const file of configs) {
  const name = file.replace('-config.json', '')
  if (!namesFromManifests.includes(name)) continue
  const config = readJson(file)
  const manifest = readJson(`${name}-manifest.json`)

  for (const [pkgPath, pkgConfig] of Object.entries(config.packages ?? {})) {
    const version = manifest[pkgPath]
    if (!version) continue // already reported by the pairing check above

    // The package's own manifest file, written by the release-type rather than by `extra-files`.
    const releaseType = pkgConfig['release-type'] ?? config['release-type']
    if (releaseType === 'node') {
      checkJsonPath(file, resolveExtra(pkgPath, 'package.json'), '$.version', version)
    }

    for (const extra of pkgConfig['extra-files'] ?? []) {
      if (typeof extra === 'string') {
        if (TRAP_EXTENSIONS.test(extra)) {
          fail(file, `extra-files entry "${extra}" is a bare string: release-please then routes it through a parse-and-reserialise updater that only touches \`$.version\` and destroys comments. Use {"type": "generic", "path": "${extra}"} for marker-based bumping, or {"type": "json"/"yaml", "path": …, "jsonpath": …} to address a field.`)
          continue
        }
        checkGeneric(file, resolveExtra(pkgPath, extra), version)
      } else if (extra.type === 'generic') {
        checkGeneric(file, resolveExtra(pkgPath, extra.path), version)
      } else if (extra.type === 'json') {
        checkJsonPath(file, resolveExtra(pkgPath, extra.path), extra.jsonpath, version)
      } else {
        // Anything else would pass unchecked, which is worse than a noisy failure.
        fail(file, `extra-files type "${extra.type}" (${extra.path}) is not covered by this lint — teach lint.mjs how to read a version out of it before using it`)
      }
    }
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
