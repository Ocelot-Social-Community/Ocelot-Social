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
  /**
   * Metadata ABOUT this branding itself (not the app identity) — shown in the admin Branding
   * detail view so an operator can tell brands apart and knows what they may reuse.
   */
  about: {
    /** Short human description of this branding / theme. */
    description: string
    /**
     * Reuse settings for this branding's assets. NOT a legal document — a quick operator-facing
     * hint answering "may I reuse this brand's logos / colours in a derived brand?". A brand that
     * wants to state conditions puts them in `note`.
     */
    license: {
      /** May this branding's logos be reused elsewhere? */
      logosReusable: boolean
      /** May this branding's colours / theme be reused elsewhere? */
      colorsReusable: boolean
      /** Optional free-text note (attribution, conditions) — still not a legal text. */
      note: string
    }
  }
  /**
   * Runtime theme: CSS custom properties + web fonts injected on :root at runtime, so a brand's
   * colours and fonts apply on a live switch WITHOUT rebuilding the webapp image. Both the webapp
   * (once its brandable SCSS tokens read `var(--…)`) and packages/ui (already reads `var(--color-*)`)
   * pick these up. The framework default is empty (vanilla keeps its built-in theme). See
   * docu/branding-architecture-konzept.md (theme layer).
   */
  theme: {
    /**
     * `--custom-property` overrides applied to :root, keyed WITHOUT the leading `--`
     * (e.g. { 'color-primary': 'rgb(110,139,135)', 'font-family-text': 'Overpass, sans-serif' }).
     * A brand supplies the full palette it wants to change (base + shades); shades it omits keep the
     * framework default value.
     */
    cssVars: Record<string, string>
    /**
     * @font-face declarations to make brand fonts available at runtime. `src` is a path into the
     * brand's served assets folder (namespaced like other asset paths), e.g.
     * 'assets/fonts/Overpass.ttf'.
     */
    fontFaces: Array<{
      family: string
      src: string
      weight?: string
      style?: string
      format?: string
    }>
  }
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
  /**
   * References into the brand's ONE served assets folder (`<brand>/assets/`, served at
   * `/branding/<brand>/…`). All content links a brand ships are defined here as data. Paths are
   * written by the brand relative to its assets folder; the build namespaces them to
   * `/branding/<brand>/…` so multiple brands never collide. (Logo & OG-image paths in `logos` /
   * `metadata.ogImage` are asset paths too and are namespaced the same way.)
   */
  assets: {
    /** Extra stylesheets, injected as <link> at runtime (CSS custom properties, fonts via
     * @font-face pointing at files in the same served folder), e.g. ['css/custom.css']. */
    css: string[]
    /** Static-page HTML per page per locale code, e.g. `html.imprint.de = 'html/de/imprint.html'`.
     * Loaded at runtime by the InternalPage view (replaces the build-bundled html i18n). */
    html: Partial<Record<LinkPageKey, Record<string, string>>>
    /** Favicon path, e.g. 'favicon.ico'. */
    favicon: string | null
  }
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
