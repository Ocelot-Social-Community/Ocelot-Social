// Shared brand-config loader for the branding build tools (build-brand-archive.mjs single-brand
// archive; build-dev-brandings.mjs dev scanner). A `.ts` config is TYPE-CHECKED against the branding
// schema via the TypeScript compiler API before it is evaluated — a wrong key or type FAILS the build
// (throws), so a brand cannot ship a mistuned config. No install is needed in the brand repo:
// typescript + the package resolve from wherever the tool runs.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

// Resolve the package's built entry so a .ts config's `@ocelot-social/branding` import maps to the
// SAME module instance both for type-checking (its .d.ts) and evaluation (its .js).
const pkgJs = require.resolve('../../dist/index.js')
const pkgDts = pkgJs.replace(/\.js$/, '.d.ts')

/** Load `@ocelot-social/branding`'s `defineBranding` (used to resolve function-style configs). */
export function getDefineBranding() {
  return require(pkgJs).defineBranding
}

function loadTypeScriptConfig(tsPath) {
  const ts = require('typescript')
  const source = readFileSync(tsPath, 'utf8')

  const options = {
    target: ts.ScriptTarget.ES2019,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10 ?? ts.ModuleResolutionKind.NodeJs,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmit: true,
    baseUrl: dirname(tsPath),
    paths: { '@ocelot-social/branding': [pkgDts] },
  }

  // Full program → real type-checking of the overrides against BrandingOverrides (transpileModule
  // would only strip types and miss schema errors).
  const program = ts.createProgram([tsPath], options)
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (diagnostics.length) {
    const formatHost = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    }
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost))
    throw new Error(`branding config failed type-check: ${tsPath}`)
  }

  // Type-check passed → transpile just this file to CJS and evaluate it with a require that hands
  // the already-loaded package to the config's import (the brand repo has no node_modules in dev).
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: tsPath,
  })
  const pkg = require(pkgJs)
  const localRequire = (id) => (id === '@ocelot-social/branding' ? pkg : require(id))
  const module = { exports: {} }
  const evaluate = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    outputText,
  )
  evaluate(module.exports, localRequire, module, tsPath, dirname(tsPath))
  return module.exports.default ?? module.exports
}

/**
 * Resolve a brand config file to a fully-merged BrandingConfig object.
 * Supports `.ts` (type-checked), and `.mjs`/`.js`. Both `export default defineBranding({...})`
 * and `export default (defineBranding) => defineBranding({...})` styles are accepted.
 */
export async function loadConfig(configPath) {
  let entry
  if (configPath.endsWith('.ts')) {
    entry = loadTypeScriptConfig(configPath)
  } else {
    // Cache-bust the import so --watch picks up edits.
    const mod = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)
    entry = mod.default ?? mod
  }
  return typeof entry === 'function' ? entry(getDefineBranding()) : entry
}
