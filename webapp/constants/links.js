// this file is duplicated in `backend/src/config/links.js` and `webapp/constants/links.js` and replaced on rebranding by https://github.com/Ocelot-Social-Community/Ocelot-Social-Deploy-Rebranding/tree/master/branding/constants/

import { defaultInternalPagesSettings } from '~/components/utils/InternalPages.js'

const ORGANIZATION = {
  ...defaultInternalPagesSettings.ORGANIZATION,
  // Wolle name: 'organization',

  // Wolle 
  externalLink: 'https://ocelot.social',
  // externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  // Wolle internalLink: '/organization', // static, don't change! internal page in case no external is defined
  internalPage: {
    ...defaultInternalPagesSettings.ORGANIZATION.internalPage,

    footerIdent: 'site.made', // localized string identifier
    headTitleIdent: 'site.made', // localized string identifier
    // Wolle headlineIdent: 'site.made', // localized string identifier. on null it's hidden, on empty string default is used
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasContainer: true,
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
}
const DONATE = {
  ...defaultInternalPagesSettings.DONATE,
  // Wolle name: 'donate',

  // Wolle externalLink: 'https://ocelot-social.herokuapp.com/donations', // we use 'ocelot-social.herokuapp.com' at the moment, because redirections of 'ocelot.social' subpages are not working correctly
  externalLink: '', // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  // Wolle internalLink: '/donate', // static, don't change! internal page in case no external is defined
  internalPage: {
    footerIdent: 'site.donate', // localized string identifier
    headTitleIdent: 'site.donate', // localized string identifier
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
}
const IMPRINT = {
  ...defaultInternalPagesSettings.IMPRINT,
  // Wolle name: 'imprint',

  // Wolle externalLink: 'https://ocelot-social.herokuapp.com/imprint', // we use 'ocelot-social.herokuapp.com' at the moment, because redirections of 'ocelot.social' subpages are not working correctly
  externalLink: '', // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  // Wolle internalLink: '/imprint', // static, don't change! internal page in case no external is defined
  internalPage: {
    footerIdent: 'site.imprint', // localized string identifier
    headTitleIdent: 'site.imprint', // localized string identifier
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
}
const TERMS_AND_CONDITIONS = {
  ...defaultInternalPagesSettings.TERMS_AND_CONDITIONS,
  // Wolle name: 'terms-and-conditions',

  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  // Wolle internalLink: '/terms-and-conditions', // static, don't change! internal page in case no external is defined
  internalPage: {
    footerIdent: 'site.termsAndConditions', // localized string identifier
    headTitleIdent: 'site.termsAndConditions', // localized string identifier
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
}
const CODE_OF_CONDUCT = {
  ...defaultInternalPagesSettings.CODE_OF_CONDUCT,
  // Wolle name: 'code-of-conduct',

  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  // Wolle internalLink: '/code-of-conduct', // static, don't change! internal page in case no external is defined
  internalPage: {
    footerIdent: 'site.code-of-conduct', // localized string identifier
    headTitleIdent: 'site.code-of-conduct', // localized string identifier
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
}
const DATA_PRIVACY = {
  ...defaultInternalPagesSettings.DATA_PRIVACY,
  // Wolle name: 'data-privacy',

  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  // Wolle internalLink: '/data-privacy', // static, don't change! internal page in case no external is defined
  internalPage: {
    footerIdent: 'site.data-privacy', // localized string identifier
    headTitleIdent: 'site.data-privacy', // localized string identifier
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
}
const FAQ = {
  ...defaultInternalPagesSettings.FAQ,
  // Wolle name: 'faq',

  // Wolle externalLink: 'https://ocelot.social',
  externalLink: null, // if string is defined and not empty it's dominating

  // in case internal page content is here 'webapp/locales/html/'
  // Wolle internalLink: '/faq', // static, don't change! internal page in case no external is defined
  internalPage: {
    footerIdent: 'site.faq', // localized string identifier
    headTitleIdent: 'site.faq', // localized string identifier
    // Wolle headlineIdent: null, // on null default is used, on empty string it's hidden
    headlineIdent: null, // localized string identifier. on null it's hidden, on empty string default is used
    hasBaseCard: true,
    hasLoginInHeader: true,
  },
}

export default {
  // Wolle LANDING_PAGE: '/login', // examples: '/login', '/registration', '/organization', or external 'https://ocelot.social'
  LANDING_PAGE: '/organization', // examples: '/login', '/registration', '/organization', or external 'https://ocelot.social'

  // you can find and store templates for 👇🏼 at https://github.com/Ocelot-Social-Community/Ocelot-Social-Deploy-Rebranding/tree/master/branding/templates/

  SUPPORT: 'https://ocelot.social', // example for internal support page: 'https://staging.ocelot.social/support'. set a full URL please, because it is used in e-mails as well!

  ORGANIZATION,
  DONATE,
  IMPRINT,
  TERMS_AND_CONDITIONS,
  CODE_OF_CONDUCT,
  DATA_PRIVACY,
  FAQ,

  FOOTER_LINK_LIST: [
    ORGANIZATION,
    TERMS_AND_CONDITIONS,
    CODE_OF_CONDUCT,
    DATA_PRIVACY,
    FAQ,
    // DONATE,
    // Wolle
    DONATE,
    IMPRINT,
  ],
}
