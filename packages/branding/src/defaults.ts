// Framework ("vanilla") branding defaults — Schicht A. Every instance runs out of the box on
// these; a brand overrides a sparse subset. Values previously lived in the per-domain constants
// files of backend and webapp (which had already drifted apart — the point of one shared source).

import type { BrandingConfig } from './schema'

export const brandingDefaults: BrandingConfig = {
  group: {
    nameLengthMin: 3,
    nameLengthMax: 50,
    descriptionMinLength: 3,
    descriptionExcerptLength: 250,
  },
  registration: {
    nonceLength: 5,
    inviteCodeLength: 6,
    layout: 'no-header',
  },
  login: {
    layout: 'no-header',
  },
  comment: {
    minLength: 1,
    maxUntruncatedLength: 1200,
    truncateToLength: 180,
  },
  dateTime: {
    relativeDateTime: true,
    absoluteDateTimeFormat: 'P',
  },
  metadata: {
    applicationName: 'ocelot.social',
    applicationShortName: 'ocelot.social',
    applicationDescription: 'ocelot.social Community Network',
    organizationName: 'ocelot.social Community',
    organizationJurisdiction: 'City of Angels',
    cookieName: 'ocelot-social-token',
    themeColor: 'rgb(23, 181, 63)',
  },
  logos: {
    headerPath: '/img/custom/logo-horizontal.svg',
    headerMobilePath: '/img/custom/logo-horizontal.svg',
    headerWidth: '130px',
    headerMobileWidth: '100px',
    headerClick: {
      externalLink: null,
      internalPath: { to: { name: 'index' }, scrollTo: '.main-navigation' },
    },
    signupPath: '/img/custom/logo-squared.svg',
    welcomePath: '/img/custom/logo-squared.svg',
    logoutPath: '/img/custom/logo-squared.svg',
    passwordResetPath: '/img/custom/logo-squared.svg',
  },
  headerMenu: {
    customButton: {},
    menu: [],
  },
  donation: {
    progressBarColorType: 'gradient',
  },
  badges: {
    trophyBadgesSelectedMax: 9,
  },
  category: {
    min: 1,
    max: 3,
  },
}
