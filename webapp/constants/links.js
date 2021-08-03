// this file is duplicated in `backend/src/config/links.js` and `webapp/constants/links.js` and replaced on rebranding by https://github.com/Ocelot-Social-Community/Ocelot-Social-Deploy-Rebranding/tree/master/branding/constants/

import { defaultPageParamsPages } from '~/components/utils/InternalPages.js'

const ORGANIZATION = defaultPageParamsPages.ORGANIZATION.assign({
  // Wolle externalLink: 'https://ocelot.social',
  //
  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.made', // localized string identifier
    headTitleIdent: 'site.made', // localized string identifier
    // Wolle headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})
const DONATE = defaultPageParamsPages.DONATE.assign({
  // Wolle externalLink: 'https://ocelot-social.herokuapp.com/donations', // we use 'ocelot-social.herokuapp.com' at the moment, because redirections of 'ocelot.social' subpages are not working correctly
  externalLink: '', // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.donate', // localized string identifier
    headTitleIdent: 'site.donate', // localized string identifier
    headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})
const IMPRINT = defaultPageParamsPages.IMPRINT.assign({
  // Wolle externalLink: 'https://ocelot-social.herokuapp.com/imprint', // we use 'ocelot-social.herokuapp.com' at the moment, because redirections of 'ocelot.social' subpages are not working correctly
  externalLink: '', // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.imprint', // localized string identifier
    headTitleIdent: 'site.imprint', // localized string identifier
    headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})
const TERMS_AND_CONDITIONS = defaultPageParamsPages.TERMS_AND_CONDITIONS.assign({
  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.termsAndConditions', // localized string identifier
    headTitleIdent: 'site.termsAndConditions', // localized string identifier
    headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})
const CODE_OF_CONDUCT = defaultPageParamsPages.CODE_OF_CONDUCT.assign({
  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.code-of-conduct', // localized string identifier
    headTitleIdent: 'site.code-of-conduct', // localized string identifier
    headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})
const DATA_PRIVACY = defaultPageParamsPages.DATA_PRIVACY.assign({
  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.data-privacy', // localized string identifier
    headTitleIdent: 'site.data-privacy', // localized string identifier
    headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})
const FAQ = defaultPageParamsPages.FAQ.assign({
  // Wolle externalLink: 'https://ocelot.social',
  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.faq', // localized string identifier
    headTitleIdent: 'site.faq', // localized string identifier
    // Wolle headlineIdent: '', // on null default is used, on empty string it's hidden
    headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})
const SUPPORT = defaultPageParamsPages.SUPPORT.assign({
  // ATTENTION: has to be defined even for internal page with full URL as example like 'https://staging.ocelot.social/support', because it is used in e-mails as well!
  // Wolle externalLink: 'https://ocelot.social',
  externalLink: 'http://localhost:3000/support', // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  internalPage: {
    footerIdent: 'site.support', // localized string identifier
    headTitleIdent: 'site.support', // localized string identifier
    // Wolle headlineIdent: '', // on null default is used, on empty string it's hidden
    headlineIdent: '', // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
})

export default {
  // Wolle LANDING_PAGE: '/login', // examples: '/login', '/registration', '/organization', or external 'https://ocelot.social'
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
    TERMS_AND_CONDITIONS,
    CODE_OF_CONDUCT,
    DATA_PRIVACY,
    FAQ,
    DONATE,
    IMPRINT,
    // SUPPORT,
  ],
}
