// Framework ("vanilla") branding defaults — Schicht A. Every instance runs out of the box on
// these; a brand overrides a sparse subset via ./overrides. Values here previously lived in the
// per-domain constants files (constants/groups.ts, constants/registrationBranded.ts,
// config/metadata.ts, config/logosBranded.ts) and their `*Branded` twins.

import type { BrandingConfig } from './schema'

export const brandingDefaults: BrandingConfig = {
  group: {
    descriptionMinLength: 3,
    descriptionExcerptLength: 250,
  },
  registration: {
    nonceLength: 5,
    inviteCodeLength: 6,
  },
  metadata: {
    applicationName: 'ocelot.social',
    organizationName: 'ocelot.social Community',
  },
  logos: {
    welcomePath: '/img/custom/logo-squared.svg',
  },
}
