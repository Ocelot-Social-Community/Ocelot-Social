export function isInternalPage(pageParams) {
  return noStringDefined(pageParams.externalLink)
}

function noStringDefined(string) {
  return !string || string === 0
}

function pageLink(pageParams) {
  return isInternalPage(pageParams) ? pageParams.internalLink : pageParams.externalLink
}

class PageParams {
  constructor(pageParams) {
    this.name = pageParams.name
    this.externalLink = pageParams.externalLink
    this.internalLink = pageParams.internalLink
    this.internalPage = pageParams.internalPage
  }

  assign(assignPageParams) {
    let pageParams = this
    pageParams = {
      ...pageParams,
      ...assignPageParams,
      internalPage: { ...pageParams.internalPage, ...assignPageParams.internalPage },
    }
    return pageParams
  }

  get link() {
    return pageLink(this)
  }
}

export const defaultPageParamsPages = {
  ORGANIZATION: new PageParams({
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
  }),
  DONATE: new PageParams({
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
  }),
  IMPRINT: new PageParams({
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
  }),
  TERMS_AND_CONDITIONS: new PageParams({
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
  }),
  CODE_OF_CONDUCT: new PageParams({
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
  }),
  DATA_PRIVACY: new PageParams({
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
  }),
  FAQ: new PageParams({
    name: 'faq',

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
  }),
  SUPPORT: new PageParams({
    name: 'support',

    // ATTENTION: has to be defined even for internal page with full URL as example like 'https://staging.ocelot.social/support', because it is used in e-mails as well!
    externalLink: 'https://ocelot.social',

    // in case internal page content is here 'webapp/locales/html/'
    // ATTENTION: example for internal support page: 'https://staging.ocelot.social/support'. set a full URL please, because it is used in e-mails as well!
    internalLink: '/support', // static, don't change '*/support'! internal page in case no external is defined
    internalPage: {
      footerIdent: 'site.support', // localized string identifier
      headTitleIdent: 'site.support', // localized string identifier
      headlineIdent: 'site.support', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,

      defaultHeadlineIdent: 'site.support',
      htmlIdent: 'html.support',
    },
  }),
}
