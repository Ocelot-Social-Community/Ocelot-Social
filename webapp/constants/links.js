// Adapter (LAZY): builds the footer / static-page PageParams from the shared branding link DATA
// (branding.links) via the framework page defaults (InternalPages). A Proxy resolves at ACCESS
// time and memoises the built PageParams per branding-config identity — so values reflect a
// runtime-injected brand config (see plugins/branding.js) without a rebuild, and PageParams are
// only rebuilt when the effective config changes. The Proxy exposes plain, configurable+writable
// descriptors so consumers can still spread / clone `links` (e.g. PageFooter.spec). A brand defines
// links purely as data; this file (webapp-only, because PageParams is webapp code) turns it into
// PageParams. Consumers keep importing `~/constants/links` and get the same shape as before.
import { branding, getBranding } from '@ocelot-social/branding'

import { defaultPageParamsPages } from '~/components/utils/InternalPages.js'

const KEYS = [
  'LANDING_PAGE',
  'ORGANIZATION',
  'DONATE',
  'IMPRINT',
  'TERMS_AND_CONDITIONS',
  'CODE_OF_CONDUCT',
  'DATA_PRIVACY',
  'FAQ',
  'SUPPORT',
  'FOOTER_LINK_LIST',
]

let cache = null
let cacheKey = null

function resolve() {
  const key = getBranding() // config object reference; changes when a brand config is injected
  if (cache !== null && cacheKey === key) return cache

  const { landingPage, pages, footerOrder } = branding.links
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

  // Bind each internal page to its brand-shipped, runtime-loaded HTML (branding.assets.html — a
  // per-locale map, namespaced to /branding/<id>/…). InternalPage fetches it at render and falls
  // back to the build-bundled i18n html when a page ships none. A fresh internalPage object avoids
  // mutating the shared page defaults across brand configs.
  const assetsHtml = (branding.assets && branding.assets.html) || {}
  for (const [pageKey, pageParams] of Object.entries(byKey)) {
    pageParams.internalPage = { ...pageParams.internalPage, htmlSrc: assetsHtml[pageKey] || null }
  }

  cache = {
    LANDING_PAGE: landingPage,
    ...built,
    // filter(Boolean): a footerOrder key that isn't a known page (typo / stale or admin-edited brand
    // config) resolves to undefined — drop it so PageFooter doesn't read footerIdent off undefined and
    // crash the whole footer. Brand configs are runtime-editable now, so this is a real input.
    FOOTER_LINK_LIST: footerOrder.map((k) => byKey[k]).filter(Boolean),
  }
  cacheKey = key
  return cache
}

export default new Proxy(
  {},
  {
    get: (_target, prop) => resolve()[prop],
    has: (_target, prop) => typeof prop === 'string' && KEYS.includes(prop),
    ownKeys: () => KEYS,
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop !== 'string' || !KEYS.includes(prop)) return undefined
      return { value: resolve()[prop], enumerable: true, configurable: true, writable: true }
    },
  },
)
