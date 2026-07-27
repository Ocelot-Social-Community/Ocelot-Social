// Example brand config for developer mode. A brand imports @ocelot-social/branding and authors its
// overrides with defineBranding — type errors here fail compilation (and, in a brand repo, CI).
// The default export is the fully resolved BrandingConfig.
//
//   node packages/branding/scripts/build-brand-archive.ts \
//     packages/branding/example .branding-dev/branding/example.tar.gz --watch
//   OCELOT_BRANDING_ASSETS_DIR=$PWD/.branding-dev/branding  OCELOT_ACTIVE_BRANDING=example
//     (in webapp/.env and backend/.env)
//   yarn dev   → edit this file → refresh the browser (F5). No Docker, no rebuild.
// In a real BRAND repo this is `import { defineBranding } from '@ocelot-social/branding'` (the
// installed dependency). Here inside the package the example imports the built dist directly so it
// is self-contained.
import { defineBranding } from '../dist/index.js'

export default defineBranding({
  metadata: {
    applicationName: 'Dev Brand',
    organizationName: 'Dev Org e.V.',
  },
  group: {
    nameLengthMax: 80,
  },
  donation: {
    progressBarColorType: 'uni',
  },
  // Locale string overrides ride along in the config (merged over the base strings at runtime).
  locales: {
    de: {
      site: { made: 'Ein Angebot von Dev Org' },
    },
  },
})
