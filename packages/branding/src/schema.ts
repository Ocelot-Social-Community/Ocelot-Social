// The branding override schema — the typed contract between framework code and a brand.
//
// ALLOW-LIST: only keys here are brand-overridable. Framework-internal constants (editor type
// ids, keycodes, GraphQL-enum mirrors, chat SCSS theme) are deliberately NOT here. Curation
// criterion (see docu/branding-architecture-konzept.md, "Schicht A konkret"): a key belongs
// here only if it is a per-network identity / UX / validation choice a brand operator would
// plausibly change — not runtime admin governance (Policy) and not framework-internal wiring.

/** A single header-menu entry: either an internal `path` or an external `url` (+ target). */
export interface MenuEntry {
  nameIdent?: string
  path?: string
  url?: string
  target?: '_blank' | '_self'
}

/** Optional custom button in the header menu. */
export interface CustomButton {
  iconPath?: string
  iconWidth?: string
  iconAltText?: string
  toolTipIdent?: string
  path?: string
  url?: string
  target?: '_blank' | '_self'
}

/** Click behaviour of the header logo: either an external link or an internal route. */
export interface LogoClick {
  externalLink: { url: string; target: '_blank' | '_self' } | null
  internalPath?: { to: { name: string }; scrollTo?: string }
}

/** The footer / static pages a brand can point at an external URL or re-order. */
export type LinkPageKey =
  | 'organization'
  | 'donate'
  | 'imprint'
  | 'termsAndConditions'
  | 'codeOfConduct'
  | 'dataPrivacy'
  | 'faq'
  | 'support'

/**
 * A brand's sparse override for one static page. Only what differs from the framework page
 * defaults (see webapp InternalPages) — usually just `externalLink`. `null` externalLink means
 * "use the internal page". `internalPage` idents override localized strings when set.
 */
export interface LinkPageOverride {
  externalLink?: { url: string; target: '_blank' | '_self' } | null
  internalPage?: {
    footerIdent?: string | null
    headTitleIdent?: string | null
    headlineIdent?: string | null
    hasContainer?: boolean
    hasBaseCard?: boolean
    hasLoginInHeader?: boolean
  }
}

export interface BrandingConfig {
  group: {
    nameLengthMin: number
    nameLengthMax: number
    descriptionMinLength: number
    descriptionExcerptLength: number
  }
  registration: {
    nonceLength: number
    inviteCodeLength: number
    layout: string
  }
  login: {
    layout: string
  }
  comment: {
    minLength: number
    maxUntruncatedLength: number
    truncateToLength: number
  }
  dateTime: {
    relativeDateTime: boolean
    absoluteDateTimeFormat: string
  }
  metadata: {
    applicationName: string
    applicationShortName: string
    applicationDescription: string
    organizationName: string
    organizationJurisdiction: string
    /** Auth cookie name (webapp apollo + auth store). */
    cookieName: string
    /** Primary theme colour (PWA manifest theme_color; $color-primary). */
    themeColor: string
    /** Open Graph image (link previews). Path is asset-coupled (served from static/). */
    ogImage: string
    ogImageAlt: string
    ogImageWidth: string
    ogImageHeight: string
    ogImageType: string
  }
  logos: {
    headerPath: string
    headerTabletPath?: string
    headerMobilePath: string
    headerWidth: string
    headerTabletWidth?: string
    headerMobileWidth: string
    headerClick: LogoClick
    signupPath: string
    /** Welcome logo, also embedded in e-mails (backend). */
    welcomePath: string
    logoutPath: string
    passwordResetPath: string
  }
  headerMenu: {
    customButton: CustomButton
    menu: MenuEntry[]
  }
  donation: {
    progressBarColorType: 'gradient' | 'uni'
  }
  badges: {
    /** Maximum number of trophy badges a user may select for display. */
    trophyBadgesSelectedMax: number
  }
  category: {
    /** Min / max number of categories required on a post / group. (The category LIST itself is
     * seeded to the DB per brand, not part of this config.) */
    min: number
    max: number
  }
  links: {
    /** Route (or external URL) the landing page redirects to, e.g. '/login'. */
    landingPage: string
    /** Per static-page overrides (raw data; the webapp's ~/constants/links adapter builds the
     * PageParams from these via InternalPages). */
    pages: Record<LinkPageKey, LinkPageOverride>
    /** Static pages shown in the footer, in order. */
    footerOrder: LinkPageKey[]
  }
  termsAndConditions: {
    /** Current T&C version; bumped when the terms change to force re-acceptance. */
    version: string
  }
  /**
   * Per-locale translation overrides, merged OVER the app's base strings at runtime (webapp i18n
   * plugin). Keyed by locale code ('de', 'en', …); each value is a nested translation tree (open
   * shape, so not strongly typed). A brand ships only the strings it changes. Because it rides in
   * the branding config, it is injected + serialised to the client with everything else — no
   * separate locale-file mechanism, no rebuild. See docu/branding-architecture-konzept.md.
   */
  locales: Record<string, Record<string, unknown>>
}

/** A recursive partial — a brand override is sparse, supplying only the keys it changes. */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<U>
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P]
}

export type BrandingOverrides = DeepPartial<BrandingConfig>
