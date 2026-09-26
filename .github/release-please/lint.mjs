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

import { triggers } from './path-filter.mjs'
import { flattenRule, resolveFilterGate } from './workflow-gate.mjs'

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
const YAML = require('yaml')
// The matcher dorny/paths-filter itself uses, at the version it bundles — see the install step in
// release-please-lint.yml. Its filter patterns are picomatch's, not GitHub's, so `path-filter.mjs`
// is the wrong tool for them and vice versa; both are needed, for different lists.
const picomatch = require('picomatch')
const schema = require('release-please/schemas/config.json')

const REPO = path.join(HERE, '..', '..')
const problems = []
const fail = (file, message) => problems.push({ file, message })

// The lockstep check reads files from all over the repository, so a partial checkout makes every
// one of them look deleted. Said once here, instead of fourteen misleading "does not exist" lines.
if (!fs.existsSync(path.join(REPO, 'package.json'))) {
  console.error(`${path.join(REPO, 'package.json')} is missing — lint.mjs needs a full checkout, not a sparse one`)
  process.exit(2)
}

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(HERE, file), 'utf8'))

// Repository-root relative, which is how the workflows spell these paths.
const rel = (file) => `.github/release-please/${file}`

// Every workflow reduced to the two things the checks below care about: which release-please steps
// it runs with which config/manifest, and which paths trigger it. Parsed, never grepped — see the
// comment on check 4.
const workflows = fs
  .readdirSync(WORKFLOWS)
  .filter((w) => w.endsWith('.yml') || w.endsWith('.yaml'))
  .map((name) => {
    let doc
    try {
      doc = YAML.parse(fs.readFileSync(path.join(WORKFLOWS, name), 'utf8'))
    } catch (error) {
      fail(name, `is not parseable YAML: ${error.message}`)
      return { name, doc: null, releasePlease: [], paths: [], lintJobId: null }
    }
    // `on` is a YAML 1.1 boolean; the parser here is YAML 1.2, where it stays a string. Both are
    // read so a parser change cannot quietly turn every workflow into "no triggers, no steps".
    const on = doc?.on ?? doc?.[true] ?? {}
    const paths = Object.values(on)
      .filter((event) => event && typeof event === 'object' && event.paths)
      .flatMap((event) => event.paths)

    const jobs = Object.entries(doc?.jobs ?? {})
    const steps = jobs.flatMap(([, job]) => job?.steps ?? [])
    const releasePlease = steps
      .filter((step) => typeof step?.uses === 'string' && step.uses.startsWith('googleapis/release-please-action@'))
      .map((step) => ({ configFile: step.with?.['config-file'], manifestFile: step.with?.['manifest-file'] }))
    // Which workflow — and which JOB in it — runs this script is discovered, not hard-coded, so
    // renaming the file or moving the step cannot leave the check below silently pointing at
    // nothing. The job id matters because check 6 reads that job's `if:` to find its path filter.
    const runsThisLint = (step) => typeof step?.run === 'string' && step.run.includes('release-please/lint.mjs')
    const lintJobId = jobs.find(([, job]) => (job?.steps ?? []).some(runsThisLint))?.[0] ?? null

    return { name, doc, releasePlease, paths, lintJobId }
  })

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

  // 4. Exactly one workflow per config, and that workflow's trigger matches what it releases.
  //
  //    Read out of the parsed workflow, not by searching its text: a config file name also appears
  //    in comments and in error messages (publish.yml quotes root-config.json in the hint it prints
  //    when the version guard trips), and a substring match counts those as if a release step used
  //    the config. It would equally miss the opposite — a workflow that still mentions a config in
  //    a comment but lost its `config-file:` input releases nothing at all, and nothing says so.
  const readers = workflows.filter((w) => w.releasePlease.some((r) => r.configFile === rel(file)))
  if (readers.length !== 1) {
    fail(
      file,
      `is the \`config-file\` of ${readers.length} workflow(s) [${readers.map((w) => w.name).join(', ') || 'none'}] — expected exactly 1. ` +
        'Two is the @ocelot-social/ui@0.0.2 race; zero means the package silently stops releasing.',
    )
  }

  for (const reader of readers) {
    const step = reader.releasePlease.find((r) => r.configFile === rel(file))
    const expectedManifest = rel(`${name}-manifest.json`)
    if (step.manifestFile !== expectedManifest) {
      fail(file, `${reader.name} pairs it with \`manifest-file: ${step.manifestFile}\`, expected ${expectedManifest}`)
    }
    // Only meaningful when the workflow filters by path at all: publish.yml runs on every master
    // push and therefore cannot miss a change to its own config.
    //
    // Matched, not searched for as a literal string. The invariant is "a change to this file starts
    // a run", and a pattern satisfies that just as well as the spelled-out path — but only the
    // matcher can say so. It matters more in the mirror check below, where the literal comparison
    // was a false negative: a workflow listing `.github/release-please/**` IS woken by every
    // package's config, which is the cross-trigger this pair of checks exists to catch, and
    // `.includes()` saw nothing.
    if (reader.paths.length > 0) {
      for (const needed of [rel(file), expectedManifest]) {
        if (!triggers(reader.paths, needed)) {
          fail(file, `${reader.name} releases it but is not triggered by ${needed} — a change to it would not start a run`)
        }
      }
    }
  }

  // The mirror image: no workflow may be triggered by a config it does not release. That is the
  // shape the ui@0.0.2 race actually had — branding-release.yml woke up on ui's files.
  for (const workflow of workflows) {
    if (triggers(workflow.paths, rel(file)) && !workflow.releasePlease.some((r) => r.configFile === rel(file))) {
      fail(file, `${workflow.name} is triggered by it but does not release it — that is exactly the cross-trigger that lost @ocelot-social/ui@0.0.2`)
    }
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

// Every file the checks below open, collected for the trigger check that follows them.
const bumpTargets = new Set()

// `extra-files` are relative to the package path, except for the root component and for paths
// written with a leading slash, which are relative to the repository root.
const resolveExtra = (pkgPath, filePath) => {
  const resolved = filePath.startsWith('/') || pkgPath === '.' ? filePath.replace(/^\//, '') : path.posix.join(pkgPath, filePath)
  bumpTargets.add(resolved)
  return resolved
}

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

      // The node release-type bumps the lockfile alongside package.json, in both of the places npm
      // records the package's own version — so both are checked. It is NOT an `extra-files` entry
      // and therefore easy to forget: the application's backend, webapp and maintenance lockfiles
      // are listed explicitly and were checked from the start, while the root's and the two
      // packages' own lockfiles were bumped by the release-type and checked by nothing.
      //
      // Conditional on existence, because a package without a lockfile is legitimate — the updater
      // is registered with `createIfMissing: false`, so release-please skips it rather than failing.
      const lockfile = pkgPath === '.' ? 'package-lock.json' : path.posix.join(pkgPath, 'package-lock.json')
      if (fs.existsSync(path.join(REPO, lockfile))) {
        bumpTargets.add(lockfile)
        checkJsonPath(file, lockfile, '$.version', version)
        checkJsonPath(file, lockfile, "$.packages[''].version", version)
      }
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

// 6. The lint's own gate. Every check above only helps if it runs when one of the files it reads
//    changes, and the list deciding that is a hand-written copy of what the configs bump. Nothing
//    keeps the copy honest except this check: a bump target missing from it means a hand-edited
//    version or a deleted marker sits unnoticed until the next release pull request happens to
//    change the manifest, landing on whoever merges the release rather than on whoever caused it.
//
//    The list lives in `.github/file-filters.yml`, not in the workflow's `on: paths`, because the
//    lint job is a required status check and Actions reports nothing at all for a workflow a path
//    filter turns away — see the header of release-please-lint.yml and of workflow-gate.mjs. So the
//    gate is resolved through the job's `if:` rather than read off the trigger.
//
//    Verified against everything the lint OPENS, derived rather than listed: the bump targets
//    collected by check 5, this directory (the configs, the manifests and these scripts), every
//    workflow — check 4 parses all of them, so a workflow edit alone can break an invariant — and
//    the filter file itself.
const linter = workflows.find((w) => w.lintJobId)
if (!linter) {
  fail('lint.mjs', 'no workflow runs this script — every check in it is dead weight')
} else {
  const gate = resolveFilterGate(linter.doc, linter.lintJobId)
  if (gate.status === 'error') {
    fail(linter.name, `${gate.reason} — so this check cannot verify that the lint runs when a file it reads changes`)
  } else if (gate.status === 'gated') {
    const lintInputs = new Set([
      ...bumpTargets,
      ...entries.map((f) => rel(f)),
      ...workflows.map((w) => `.github/workflows/${w.name}`),
      gate.filtersFile,
    ])

    const filtersPath = path.join(REPO, gate.filtersFile)
    if (!fs.existsSync(filtersPath)) {
      fail(linter.name, `gates its lint job on ${gate.filtersFile}, which does not exist`)
    } else {
      const rules = YAML.parse(fs.readFileSync(filtersPath, 'utf8')) ?? {}
      if (!(gate.filterKey in rules)) {
        fail(gate.filtersFile, `has no \`${gate.filterKey}\` rule, but ${linter.name} gates its lint job on it — the job would never run, and would keep reporting success as a skipped check`)
      } else {
        const { patterns, unsupported } = flattenRule(rules[gate.filterKey])
        for (const item of unsupported) {
          fail(gate.filtersFile, `\`${gate.filterKey}\` contains ${JSON.stringify(item)}; this check only reads plain pattern strings`)
        }
        // dorny/paths-filter's default quantifier is `some` — the gate opens when ANY pattern
        // matches. resolveFilterGate has already rejected the other two.
        for (const target of [...lintInputs].sort()) {
          if (!patterns.some((pattern) => picomatch.isMatch(target, pattern, { dot: true }))) {
            fail(gate.filtersFile, `\`${gate.filterKey}\` does not match ${target}, which the lint reads — add it, or a change to that file will not start a run`)
          }
        }
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
