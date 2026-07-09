// Framework ("vanilla") branding defaults — Schicht A. Every instance runs out of the box on
// these; a brand overrides a sparse subset via ./overrides. Values previously lived in the
// per-domain constants files of backend and webapp (groups, registrationBranded, metadata,
// logosBranded), which had already drifted apart — the point of sharing one source here.

/** @type {import('./schema').BrandingConfig} */
const brandingDefaults = {
  group: {
    nameLengthMin: 3,
    nameLengthMax: 50,
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

module.exports = { brandingDefaults }
