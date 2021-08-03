export function isInternalPage(pageParams) {
  return noStringDefined(pageParams.externalLink)
}

export function noStringDefined(string) {
  return !string || string === 0
}

export function pageLink(pageParams) {
  return isInternalPage(pageParams) ? pageParams.internalLink : pageParams.externalLink
}

export const defaultInternalPagesSettings = {
  ORGANIZATION: {
    name: 'organization',

    externalLink: null, // if string is defined and not empty it's dominating

    // in case internal page content is here 'webapp/locales/html/'
    internalLink: '/organization', // static, don't change! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.made', // localized string identifier
      headTitleIdent: 'site.made', // localized string identifier
      headlineIdent: 'site.made', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.made',
      htmlIdent: 'html.organization',
    },

    get link() {
      return pageLink(this)
    },
  },
  DONATE: {
    name: 'donate',

    externalLink: null, // if string is defined and not empty it's dominating

    // in case internal page content is here 'webapp/locales/html/'
    internalLink: '/donate', // static, don't change! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.donate', // localized string identifier
      headTitleIdent: 'site.donate', // localized string identifier
      headlineIdent: 'site.donate', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.donate',
      htmlIdent: 'html.donate',
    },

    get link() {
      return pageLink(this)
    },
  },
  IMPRINT: {
    name: 'imprint',

    externalLink: null, // if string is defined and not empty it's dominating

    // in case internal page content is here 'webapp/locales/html/'
    internalLink: '/imprint', // static, don't change! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.imprint', // localized string identifier
      headTitleIdent: 'site.imprint', // localized string identifier
      headlineIdent: 'site.imprint', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.imprint',
      htmlIdent: 'html.imprint',
    },

    get link() {
      return pageLink(this)
    },
  },
  TERMS_AND_CONDITIONS: {
    name: 'terms-and-conditions',

    externalLink: null, // if string is defined and not empty it's dominating

    // in case internal page content is here 'webapp/locales/html/'
    internalLink: '/terms-and-conditions', // static, don't change! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.termsAndConditions', // localized string identifier
      headTitleIdent: 'site.termsAndConditions', // localized string identifier
      headlineIdent: 'site.termsAndConditions', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.termsAndConditions',
      htmlIdent: 'html.termsAndConditions',
    },

    get link() {
      return pageLink(this)
    },
  },
  CODE_OF_CONDUCT: {
    name: 'code-of-conduct',

    externalLink: null, // if string is defined and not empty it's dominating

    // in case internal page content is here 'webapp/locales/html/'
    internalLink: '/code-of-conduct', // static, don't change! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.code-of-conduct', // localized string identifier
      headTitleIdent: 'site.code-of-conduct', // localized string identifier
      headlineIdent: 'site.code-of-conduct', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.code-of-conduct',
      htmlIdent: 'html.codeOfConduct',
    },

    get link() {
      return pageLink(this)
    },
  },
  DATA_PRIVACY: {
    name: 'data-privacy',

    externalLink: null, // if string is defined and not empty it's dominating

    // in case internal page content is here 'webapp/locales/html/'
    internalLink: '/data-privacy', // static, don't change! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.data-privacy', // localized string identifier
      headTitleIdent: 'site.data-privacy', // localized string identifier
      headlineIdent: 'site.data-privacy', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.data-privacy',
      htmlIdent: 'html.dataPrivacy',
    },

    get link() {
      return pageLink(this)
    },
  },
  FAQ: {
    name: 'faq',

    // Wolle externalLink: 'https://ocelot.social',
    externalLink: null, // if string is defined and not empty it's dominating

    // in case internal page content is here 'webapp/locales/html/'
    internalLink: '/faq', // static, don't change! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.faq', // localized string identifier
      headTitleIdent: 'site.faq', // localized string identifier
      headlineIdent: 'site.faq', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.faq',
      htmlIdent: 'html.faq',
    },

    get link() {
      return pageLink(this)
    },
  },
}
