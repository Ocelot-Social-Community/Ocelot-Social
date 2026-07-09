// Adapter: builds the footer / static-page PageParams from the shared branding link DATA
// (branding.links, typed in @ocelot-social/branding) via the framework page defaults
// (InternalPages). A brand defines links purely as data in its branding override — this file
// (webapp-only, because PageParams is webapp code) turns that data into PageParams objects.
// Consumers keep importing `~/constants/links` and get the same shape as before
// (LANDING_PAGE, ORGANIZATION, …, FOOTER_LINK_LIST).

import branding from '@ocelot-social/branding'

import { defaultPageParamsPages } from '~/components/utils/InternalPages.js'

const { landingPage, pages, footerOrder } = branding.links

// Build each static page from its framework default overlaid with the brand's sparse override.
const built = {
  ORGANIZATION: defaultPageParamsPages.ORGANIZATION.overwrite(pages.organization),
  DONATE: defaultPageParamsPages.DONATE.overwrite(pages.donate),
  IMPRINT: defaultPageParamsPages.IMPRINT.overwrite(pages.imprint),
  TERMS_AND_CONDITIONS: defaultPageParamsPages.TERMS_AND_CONDITIONS.overwrite(
    pages.termsAndConditions,
  ),
  CODE_OF_CONDUCT: defaultPageParamsPages.CODE_OF_CONDUCT.overwrite(pages.codeOfConduct),
  DATA_PRIVACY: defaultPageParamsPages.DATA_PRIVACY.overwrite(pages.dataPrivacy),
  FAQ: defaultPageParamsPages.FAQ.overwrite(pages.faq),
  SUPPORT: defaultPageParamsPages.SUPPORT.overwrite(pages.support),
}

// Map the footer order (data keys) back to the built PageParams.
const byKey = {
  organization: built.ORGANIZATION,
  donate: built.DONATE,
  imprint: built.IMPRINT,
  termsAndConditions: built.TERMS_AND_CONDITIONS,
  codeOfConduct: built.CODE_OF_CONDUCT,
  dataPrivacy: built.DATA_PRIVACY,
  faq: built.FAQ,
  support: built.SUPPORT,
}

export default {
  LANDING_PAGE: landingPage,
  ...built,
  FOOTER_LINK_LIST: footerOrder.map((key) => byKey[key]),
}
