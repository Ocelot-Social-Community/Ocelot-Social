// Framework ("vanilla") branding defaults — Schicht A. Every instance runs out of the box on
// these; a brand overrides a sparse subset. Values previously lived in the per-domain constants
// files of backend and webapp (which had already drifted apart — the point of one shared source).

import type { BrandingConfig } from './schema'

export const brandingDefaults: BrandingConfig = {
  about: {
    description: 'The default ocelot.social branding.',
    license: {
      logosReusable: false,
      colorsReusable: false,
      note: '',
    },
  },
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
    ogImage: '/img/custom/logo-squared.png',
    ogImageAlt: 'ocelot.social Logo',
    ogImageWidth: '1200',
    ogImageHeight: '1140',
    ogImageType: 'image/png',
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
  links: {
    landingPage: '/login',
    // Only externalLink differs from the InternalPages base for vanilla ocelot; the internal
    // pages (terms/conduct/privacy/faq) keep their framework defaults (empty override).
    pages: {
      organization: { externalLink: { url: 'https://ocelot.social', target: '_blank' } },
      donate: { externalLink: { url: 'https://ocelot.social/en/donate/', target: '_blank' } },
      imprint: { externalLink: { url: 'https://ocelot.social/en/imprint/', target: '_blank' } },
      termsAndConditions: {},
      codeOfConduct: {},
      dataPrivacy: {},
      faq: {},
      support: { externalLink: { url: 'https://ocelot.social', target: '_blank' } },
    },
    footerOrder: [
      'organization',
      'termsAndConditions',
      'codeOfConduct',
      'dataPrivacy',
      'faq',
      'donate',
      'support',
      'imprint',
    ],
  },
  termsAndConditions: {
    version: '0.0.4',
  },
  // No locale overrides by default; a brand adds only the strings it changes.
  locales: {},
  // No extra assets by default; a brand references its served content here.
  assets: {
    css: [],
    html: {},
    favicon: null,
  },
}
