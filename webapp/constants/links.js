// this file is replaced on rebranding by https://github.com/Ocelot-Social-Community/Ocelot-Social-Deploy-Rebranding/tree/master/branding/constants/

import { defaultPageParamsPages } from '~/components/utils/InternalPages.js'

const ORGANIZATION = defaultPageParamsPages.ORGANIZATION.overwrite({
  // if defined it's dominating
  externalLink: {
    url: 'https://yunite.org',
    target: '',
  },

  internalPage: {
    // footerIdent: 'site.made', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.made', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.made', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'webapp/locales/html/'
  },
})
const DONATE = defaultPageParamsPages.DONATE.overwrite({
  // if defined it's dominating
  externalLink: {
    url: 'https://yunite.org/spenden/',
    target: '',
  },

  internalPage: {
    // footerIdent: 'site.donate', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.donate', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.donate', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const IMPRINT = defaultPageParamsPages.IMPRINT.overwrite({
  // if defined it's dominating
  externalLink: {
    url: 'https://yunite.org/impressum/',
    target: '',
  },

  internalPage: {
    footerIdent: 'yuniteRebranding.footer.imprint', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.imprint', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.imprint', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const TERMS_AND_CONDITIONS = defaultPageParamsPages.TERMS_AND_CONDITIONS.overwrite({
  // externalLink: null, // if defined it's dominating

  internalPage: {
    // footerIdent: 'site.termsAndConditions', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.termsAndConditions', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.termsAndConditions', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const CODE_OF_CONDUCT = defaultPageParamsPages.CODE_OF_CONDUCT.overwrite({
  // if defined it's dominating
  externalLink: {
    url: 'https://yunite.org/ueber-yunite/unsere-werte/',
    target: '',
  },

  internalPage: {
    // footerIdent: 'site.code-of-conduct', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.code-of-conduct', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.code-of-conduct', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const DATA_PRIVACY = defaultPageParamsPages.DATA_PRIVACY.overwrite({
  // if defined it's dominating
  externalLink: {
    url: 'https://yunite.org/datenschutz/',
    target: '',
  },

  internalPage: {
    footerIdent: 'yuniteRebranding.footer.dataPrivacy', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.data-privacy', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.data-privacy', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const FAQ = defaultPageParamsPages.FAQ.overwrite({
  // if defined it's dominating
  externalLink: {
    url: 'https://yunite.org/ueber-yunite/faq-hilfe/',
    target: '',
  },

  internalPage: {
    // footerIdent: 'site.faq', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.faq', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.faq', // on null default is used, on empty string it's hidden
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const SUPPORT = defaultPageParamsPages.SUPPORT.overwrite({
  // if defined it's dominating
  externalLink: {
    url: 'https://yunite.org/ueber-yunite/faq-hilfe/',
    target: '',
  },

  internalPage: {
    // footerIdent: 'site.support', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.support', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.support', // on null default is used, on empty string it's hidden
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})

export default {
  LANDING_PAGE: '/login', // examples: '/login', '/registration', '/organization', or external 'https://ocelot.social'

  // you can find and store templates for 👇🏼 at https://github.com/Ocelot-Social-Community/Ocelot-Social-Deploy-Rebranding/tree/master/branding/templates/

  ORGANIZATION,
  DONATE,
  IMPRINT,
  TERMS_AND_CONDITIONS,
  CODE_OF_CONDUCT,
  DATA_PRIVACY,
  FAQ,
  SUPPORT,

  FOOTER_LINK_LIST: [
    // ORGANIZATION,
    // TERMS_AND_CONDITIONS,
    // CODE_OF_CONDUCT,
    DATA_PRIVACY,
    // FAQ,
    // DONATE,
    // SUPPORT,
    IMPRINT,
  ],
}