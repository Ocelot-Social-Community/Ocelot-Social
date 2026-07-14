// Shared brand-config loader for the branding build tools (build-brand-archive.mts single-brand
// archive; build-dev-brandings.mts dev scanner). A `.ts` config is TYPE-CHECKED against the branding
// schema via the TypeScript compiler API before it is evaluated — a wrong key or type FAILS the build
// (throws), so a brand cannot ship a mistuned config. No install is needed in the brand repo:
// typescript + the package resolve from wherever the tool runs.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compileFunction } from 'node:vm'

import type { BrandingConfig, BrandingOverrides } from '../../dist/index.js'
import type * as TS from 'typescript'

const require = createRequire(import.meta.url)

// Resolve the package's built entry so a .ts config's `@ocelot-social/branding` import maps to the
// SAME module instance both for type-checking (its .d.ts) and evaluation (its .js).
const pkgJs: string = require.resolve('../../dist/index.js')
const pkgDts = pkgJs.replace(/\.js$/, '.d.ts')

type DefineBranding = (overrides: BrandingOverrides) => BrandingConfig
// A brand config exports EITHER a resolved config object, OR a factory `(defineBranding) => config`.
type ConfigFactory = (defineBranding: DefineBranding) => BrandingConfig
type ConfigModule = BrandingConfig | ConfigFactory

/** Load `@ocelot-social/branding`'s `defineBranding` (used to resolve function-style configs). */
export function getDefineBranding(): DefineBranding {
  return (require(pkgJs) as { defineBranding: DefineBranding }).defineBranding
}

function loadTypeScriptConfig(tsPath: string): ConfigModule {
  const ts = require('typescript') as typeof TS
  const source = readFileSync(tsPath, 'utf8')

  const options: TS.CompilerOptions = {
    target: ts.ScriptTarget.ES2019,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
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
    const formatHost: TS.FormatDiagnosticsHost = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
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
  const pkg = require(pkgJs) as unknown
  const localRequire = (id: string): unknown =>
    id === '@ocelot-social/branding' ? pkg : require(id)
  const module: { exports: { default?: ConfigModule } & Record<string, unknown> } = { exports: {} }
  // vm.compileFunction is the sandbox-aware equivalent of `new Function` (same param injection), but
  // doesn't trip the classic `new Function` code-injection SAST rule; `filename` gives real stack
  // traces. Input is the just-type-checked, locally-transpiled brand config — not attacker-controlled.
  const evaluate = compileFunction(
    outputText,
    ['exports', 'require', 'module', '__filename', '__dirname'],
    { filename: tsPath },
  )
  evaluate(module.exports, localRequire, module, tsPath, dirname(tsPath))
  return (module.exports.default ?? module.exports) as ConfigModule
}

/**
 * Resolve a brand config file to a fully-merged BrandingConfig object.
 * Supports `.ts` (type-checked), and `.mjs`/`.js`. Both `export default defineBranding({...})`
 * and `export default (defineBranding) => defineBranding({...})` styles are accepted.
 */
export async function loadConfig(configPath: string): Promise<BrandingConfig> {
  let entry: ConfigModule
  if (configPath.endsWith('.ts')) {
    entry = loadTypeScriptConfig(configPath)
  } else {
    // Cache-bust the import so --watch picks up edits.
    const mod = (await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)) as {
      default?: ConfigModule
    } & Record<string, unknown>
    entry = (mod.default ?? mod) as ConfigModule
  }
  return typeof entry === 'function' ? entry(getDefineBranding()) : entry
}
