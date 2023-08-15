import { PageParams } from '~/components/utils/PageParams.js'

export const defaultPageParamsPages = {
  ORGANIZATION: new PageParams({
    name: 'organization',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/organization', // static, don't change! internal page in case no external is defined
      footerIdent: 'site.made', // localized string identifier
      headTitleIdent: 'site.made', // localized string identifier
      headlineIdent: 'site.made', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.organization',
    },
  }),
  DONATE: new PageParams({
    name: 'donate',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/donate', // static, don't change! internal page in case no external is defined
      footerIdent: 'site.donate', // localized string identifier
      headTitleIdent: 'site.donate', // localized string identifier
      headlineIdent: 'site.donate', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.donate',
    },
  }),
  IMPRINT: new PageParams({
    name: 'imprint',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/imprint', // static, don't change! internal page in case no external is defined
      footerIdent: 'site.imprint', // localized string identifier
      headTitleIdent: 'site.imprint', // localized string identifier
      headlineIdent: 'site.imprint', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.imprint',
    },
  }),
  TERMS_AND_CONDITIONS: new PageParams({
    name: 'terms-and-conditions',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/terms-and-conditions', // static, don't change! internal page in case no external is defined
      footerIdent: 'site.termsAndConditions', // localized string identifier
      headTitleIdent: 'site.termsAndConditions', // localized string identifier
      headlineIdent: 'site.termsAndConditions', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.termsAndConditions',
    },
  }),
  CODE_OF_CONDUCT: new PageParams({
    name: 'code-of-conduct',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/code-of-conduct', // static, don't change! internal page in case no external is defined
      footerIdent: 'site.code-of-conduct', // localized string identifier
      headTitleIdent: 'site.code-of-conduct', // localized string identifier
      headlineIdent: 'site.code-of-conduct', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.codeOfConduct',
    },
  }),
  DATA_PRIVACY: new PageParams({
    name: 'data-privacy',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/data-privacy', // static, don't change! internal page in case no external is defined
      footerIdent: 'site.data-privacy', // localized string identifier
      headTitleIdent: 'site.data-privacy', // localized string identifier
      headlineIdent: 'site.data-privacy', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.dataPrivacy',
    },
  }),
  FAQ: new PageParams({
    name: 'faq',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/faq', // static, don't change! internal page in case no external is defined
      footerIdent: 'site.faq', // localized string identifier
      headTitleIdent: 'site.faq', // localized string identifier
      headlineIdent: 'site.faq', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.faq',
    },
  }),
  SUPPORT: new PageParams({
    name: 'support',

    // externalLink: {
    //   url: 'https://ocelot.social',
    //   target: '_blank',
    // },
    externalLink: null, // if defined it's dominating

    internalPage: {
      pageRoute: '/support', // static, don't change '*/support'! internal page in case no external is defined
      footerIdent: 'site.support', // localized string identifier
      headTitleIdent: 'site.support', // localized string identifier
      headlineIdent: 'site.support', // localized string identifier. on null it's hidden, on empty string default is used
      hasContainer: true,
      hasBaseCard: true,
      hasLoginInHeader: true,
      // in case internal page content is here 'webapp/locales/html/'
      htmlIdent: 'html.support',
    },
  }),
}
