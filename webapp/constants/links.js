// this file is replaced on rebranding by https://github.com/Ocelot-Social-Community/Ocelot-Social-Deploy-Rebranding/tree/master/branding/constants/

import { defaultPageParamsPages } from '~/components/utils/InternalPages.js'

const ORGANIZATION = defaultPageParamsPages.ORGANIZATION.overwrite({
  // if defined it's dominating
  // externalLink: {
  //   url: 'https://ocelot.social',
  //   target: '_blank',
  // },

  internalPage: {
    footerIdent: 'reformer-network.footer.about-us', // localized string identifier, if undefined default is used
    headTitleIdent: 'reformer-network.footer.about-us', // localized string identifier, if undefined default is used
    headlineIdent: 'reformer-network.footer.about-us', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const DONATE = defaultPageParamsPages.DONATE.overwrite({
  // if defined it's dominating
  // externalLink: {
  //   url: 'https://ocelot.social/en/donate/',
  //   target: '_blank',
  // },

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
  // externalLink: {
  //   url: 'http://ocelot.social/en/imprint/',
  //   target: '_blank',
  // },

  internalPage: {
    // footerIdent: 'site.imprint', // localized string identifier, if undefined default is used
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
    footerIdent: 'reformer-network.footer.terms-and-conditions-short', // localized string identifier, if undefined default is used
    headTitleIdent: 'reformer-network.footer.terms-and-conditions', // localized string identifier, if undefined default is used
    headlineIdent: 'reformer-network.footer.terms-and-conditions', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const CODE_OF_CONDUCT = defaultPageParamsPages.CODE_OF_CONDUCT.overwrite({
  // externalLink: null, // if defined it's dominating

  internalPage: {
    footerIdent: 'reformer-network.footer.code-of-conduct', // localized string identifier, if undefined default is used
    headTitleIdent: 'reformer-network.footer.code-of-conduct', // localized string identifier, if undefined default is used
    headlineIdent: 'reformer-network.footer.code-of-conduct', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const DATA_PRIVACY = defaultPageParamsPages.DATA_PRIVACY.overwrite({
  // externalLink: null, // if defined it's dominating

  internalPage: {
    // footerIdent: 'site.data-privacy', // localized string identifier, if undefined default is used
    // headTitleIdent: 'site.data-privacy', // localized string identifier, if undefined default is used
    // headlineIdent: 'site.data-privacy', // localized string identifier, on null it's hidden, if undefined default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
    // in case internal page content is here 'branding/locales/html/'
  },
})
const FAQ = defaultPageParamsPages.FAQ.overwrite({
  // externalLink: null, // if defined it's dominating

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
  // externalLink: {
  //   url: 'https://ocelot.social/en/contact/',
  //   target: '_blank',
  // },

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
  LANDING_PAGE: '/organization', // examples: '/login', '/registration', '/organization', or external 'https://ocelot.social'

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
    ORGANIZATION,
    CODE_OF_CONDUCT,
    DATA_PRIVACY,
    TERMS_AND_CONDITIONS,
    FAQ,
    SUPPORT,
    IMPRINT,
  ],
}
