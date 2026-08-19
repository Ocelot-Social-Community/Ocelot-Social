/* eslint-disable n/no-sync */ // synchronous by design: runs at module-load bootstrap, before the e-mail singleton / express.static read these dirs
/* eslint-disable security/detect-non-literal-fs-filename */ // every destination is guarded by safeJoin() (rejects traversal / absolute paths)
/* eslint-disable security/detect-object-injection */ // deepMerge iterates Object.keys() of parsed JSON
/* eslint-disable no-catch-all/no-catch-all */ // a malformed brand locale is skipped, never fatal
// Overlay a brand's RAW e-mail files (shipped in its runtime archive) onto the backend's on-disk
// defaults at startup — so templates (pug) and locales follow the deployed brand from the archive
// instead of being baked in at Docker build time (the old ONBUILD overlay). Called from bootstrap.ts
// BEFORE the e-mail singleton reads these dirs.
//
// E-MAILS ONLY, on purpose. `email-templates` reads its templates from the filesystem, so they have to
// exist as files; every OTHER brand file (logos, fonts, css, html, badge SVGs) is served straight from
// the archive by the webapp's branding-assets middleware at /branding/<id>/… and is never written to
// disk. The archive's `public/` bucket — which this used to copy into the backend's public/ — is gone
// with it; it only ever carried badge icons, which now live in `assets/badges/`.
//
// Archive entry layout (see packages/branding build): `emails/templates/…`,
// `emails/locales/<lang>.json`. Locales are DEEP-MERGED over the defaults (brand wins) — the runtime
// equivalent of the old tools/merge-email-locales.sh; templates replace the default outright.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

export interface RuntimeOverlayDirs {
  /** …/emails (contains templates/ and locales/) */
  emailsDir: string
}

type Json = Record<string, unknown>

const isPlainObject = (v: unknown): v is Json =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

/** Deep-merge `patch` over `base` (nested objects merge, everything else replaces). */
function deepMerge(base: Json, patch: Json): Json {
  const out: Json = { ...base }
  for (const key of Object.keys(patch)) {
    const b = out[key]
    const p = patch[key]
    out[key] = isPlainObject(b) && isPlainObject(p) ? deepMerge(b, p) : p
  }
  return out
}

/** A safe destination inside `root`, or null for a traversal attempt (`..`) / absolute path. */
function safeJoin(root: string, rel: string): string | null {
  const target = normalize(join(root, rel))
  const base = normalize(root + '/')
  return target.startsWith(base) ? target : null
}

function writeFileEnsured(target: string, data: Buffer): void {
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, data)
}

/**
 * Apply a brand archive's e-mail overlays. `files` is the decompressed archive (path → bytes); dirs
 * are the live backend locations. Entries outside `emails/` are ignored — they are served from the
 * archive, not written to disk. Traversal/absolute paths are skipped.
 */
export function overlayBrandRuntimeFiles(
  files: Map<string, Buffer>,
  dirs: RuntimeOverlayDirs,
): void {
  for (const [entry, data] of files) {
    if (entry.startsWith('emails/locales/') && entry.endsWith('.json')) {
      // strip the `emails/` prefix → `locales/<file>` relative to emailsDir (safeJoin guards traversal).
      const target = safeJoin(dirs.emailsDir, entry.slice('emails/'.length))
      if (!target) {
        continue
      }
      let brand: Json
      try {
        brand = JSON.parse(data.toString('utf8')) as Json
      } catch {
        continue // skip an unreadable brand locale rather than clobber the default
      }
      const current: Json = existsSync(target)
        ? (JSON.parse(readFileSync(target, 'utf8')) as Json)
        : {}
      writeFileEnsured(
        target,
        Buffer.from(`${JSON.stringify(deepMerge(current, brand), null, 2)}\n`),
      )
    } else if (entry.startsWith('emails/templates/')) {
      // strip the `emails/` prefix → `templates/<…>` relative to emailsDir.
      const target = safeJoin(dirs.emailsDir, entry.slice('emails/'.length))
      if (target) {
        writeFileEnsured(target, data)
      }
    }
  }
}
