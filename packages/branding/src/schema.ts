// The branding override schema — the typed contract between framework code and a brand.
//
// ALLOW-LIST: only keys here are brand-overridable. Framework-internal constants (editor type
// ids, keycodes, GraphQL-enum mirrors, chat SCSS theme) are deliberately NOT here. Curation
// criterion (see docu/branding-architecture-konzept.md, "Schicht A konkret"): a key belongs
// here only if it is a per-network identity / UX / validation choice a brand operator would
// plausibly change — not runtime admin governance (Policy) and not framework-internal wiring.
//
// "NOT SET" CONVENTION: `BrandingConfig` is the RESOLVED config — always complete (brandingDefaults +
// a sparse override). So a settable value that can be absent / fall back is `T | null` (always present,
// `null` = not set), NOT optional `?`. Author-sparseness is expressed solely by `BrandingOverrides`
// (= DeepPartial<BrandingConfig>), never by `?` on the base type. → consumers check one way (`!= null`)
// and never meet `undefined`. Optional `?` is reserved for the nested DATA shapes below, where it means
// an either-or variant (MenuEntry: `path` XOR `url`; CustomButton) or a 3-state page override
// (LinkPageOverride: absent = inherit, `null` = explicitly none) — a different concept from "unset".

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

/**
 * A webapp page-layout name (a file in `webapp/layouts/`), used for the auth pages (login /
 * registration / password-reset). `error` is Nuxt's dedicated error layout, not a page choice, so it
 * is excluded. Keep in sync with the layout files if the set changes.
 */
export type PageLayout = 'basic' | 'blank' | 'default' | 'no-header'

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
 * A brand's sparse override for one static page. Only what differs from the framework page defaults
 * (see webapp InternalPages, applied via `defaultPageParamsPages.X.overwrite(pages.x)`).
 *
 * Its fields are deliberately 3-STATE — `absent | null | value` are three distinct meanings, and the
 * config merge (defineBranding's deep-merge) preserves them, so the webapp adapter can act on each:
 *   • absent    → inherit the framework page default (a sparse override doesn't touch this field);
 *   • `null`    → explicitly clear it (e.g. `externalLink: null` forces the INTERNAL page, overriding a
 *                 default external link);
 *   • a value   → set it (e.g. an `{ url, target }` external link, or an override ident).
 * This is why these use optional `?` AND `| null` — NOT the `T | null` scalar convention of the resolved
 * BrandingConfig (see the file header); an override shape genuinely needs the third "inherit" state.
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
    /**
     * The brand's theme tokens as CONCRETE values, keyed WITHOUT the leading `--`.
     *
     * Derived, never authored: the build reads the `:root` declarations out of the stylesheets the
     * brand lists under `assets.css`, flattens every `var()` reference against the framework palette,
     * and stores the result here. The declarations themselves stay in the stylesheets — this is the
     * escape hatch for the consumers that have no browser to resolve custom properties for them: the
     * PWA manifest (generated per request), the `<meta name="theme-color">` tag, the maintenance page
     * and the e-mail stylesheet.
     *
     * Only what the brand ITSELF declares, not the whole resolved palette. Storing all ~200 tokens
     * would bake the framework's values into every archive, where they would go stale the moment a
     * framework default changed; consumers that need a token the brand did not touch read it from
     * FRAMEWORK_TOKENS, which ships with the package and is always current.
     *
     * Only UNCONDITIONAL declarations: a token that holds just inside
     * `@media (prefers-color-scheme: dark)` would be shipped here as if it always applied, and a
     * manifest has no media queries.
     *
     * It sits in the `theme` bucket rather than in `metadata` on purpose: a partial package that
     * provides identity but no theme would otherwise carry colours it does not define.
     */
    tokens: Record<string, string>
  }
  group: {
    nameLengthMin: number
    nameLengthMax: number
    descriptionMinLength: number
    descriptionExcerptLength: number
    /**
     * Height of the collapsed group description on the group page, in text lines.
     *
     * Deliberately a line count and not a character count like `descriptionExcerptLength`:
     * the collapsed preview is capped by CSS after layout, so headings and lists no longer
     * blow up its height the way an equally long run of characters would.
     */
    descriptionCollapsedLines: number
    /**
     * Height of the description on a group teaser card, in text lines.
     *
     * Separate from `descriptionCollapsedLines` because the two surfaces differ: the
     * group page shows a preview that can be expanded, the teaser is a fixed tile in a
     * grid whose cards should line up. This one is a fixed height, not a cap.
     */
    teaserDescriptionLines: number
  }
  registration: {
    nonceLength: number
    inviteCodeLength: number
    layout: PageLayout
  }
  login: {
    layout: PageLayout
  }
  comment: {
    minLength: number
    maxUntruncatedLength: number
    truncateToLength: number
  }
  dateTime: {
    relativeDateTime: boolean
    /**
     * Absolute timestamp format — a date-fns format-token string (e.g. `P` = localized short date,
     * `PPpp` = long date + time), consumed by the webapp `DateTime` component via date-fns `format`.
     * An OPEN vocabulary (any token string), so deliberately `string` and not a union.
     */
    absoluteDateTimeFormat: string
  }
  metadata: {
    // NOTE: no brand `version` here — the brand's version lives ONLY in the archive manifest
    // (manifest.version, from the brand's package.json), surfaced in the admin Branding tab. Injecting
    // it into metadata would make the identity bucket always look "customised", breaking partial-package
    // detection (see scripts/lib/build-brandings.ts).
    applicationName: string
    applicationShortName: string
    applicationDescription: string
    organizationName: string
    organizationJurisdiction: string
    // NOTE: no `cookieName` — the auth cookie name is INFRA, not branding (see
    // docu/branding-buckets-konzept.md). It was unreachable here in the first place: @nuxtjs/apollo
    // bakes its token name into the generated plugin at BUILD time, so the cookie was always written
    // under the framework default while the auth store checked for the branded name — a login that
    // worked but reported "no cookie". It is the webapp's `COOKIE_NAME` deployment variable now
    // (webapp/utils/authCookie.js), settable per instance without a rebuild but NOT switchable while
    // the app runs — renaming it mid-flight would end every session.
    // NOTE: no `themeColor` — the browser-chrome / PWA theme_color is the `color-primary` theme token
    // (see theme.ts resolveThemeColor). It used to be a metadata field carved into the theme bucket,
    // which broke for partial packages providing identity but not theme.
    /** Open Graph image (link previews). Path is asset-coupled (served from static/). */
    ogImage: string
    ogImageAlt: string
    ogImageWidth: string
    ogImageHeight: string
    ogImageType: string
  }
  logos: {
    headerPath: string
    /** Tablet header logo; `null` → fall back to the desktop `headerPath`. */
    headerTabletPath: string | null
    headerMobilePath: string
    headerWidth: string
    /** Tablet header width; `null` → fall back to `headerWidth`. */
    headerTabletWidth: string | null
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
   * separate runtime locale-file mechanism, no rebuild. See docu/branding-architecture-konzept.md.
   *
   * AUTHORING: a brand may declare these inline here, OR ship conventional JSON files in its brand dir —
   * `locales/<code>.json` (whole locale) and/or `locales/<code>/<feature>.json` (MODULAR: a locale split
   * into per-feature namespace files, all merged so a feature owns its slice). The build reads and
   * deep-merges them (file wins per leaf); see scripts/lib/build-brandings.ts `loadLocaleFiles`. Either
   * way the runtime shape is identical — modularity is authoring-only, not runtime tree-shaking.
   */
  locales: Record<string, Record<string, unknown>>
  /**
   * References into the brand's served file trees (`<brand>/assets/` and `<brand>/html/`, served at
   * `/branding/<brand>/…`). All content links a brand ships are defined here as data. Paths are
   * written relative to the BRAND ROOT — i.e. they include the `assets/` (or `html/`) prefix; the
   * build namespaces them to `/branding/<brand>/…` so multiple brands never collide, and warns when
   * the referenced file does not exist. (Logo & OG-image paths in `logos` / `metadata.ogImage` are
   * asset paths too and are namespaced the same way.)
   *
   * A path that is NOT brand-relative is left exactly as written — an `http(s):`/`data:` URL (a brand
   * hosting an asset itself) and an absolute `/…` path into the framework's own tree both survive the
   * build untouched. The live webapp serves either. The MAINTENANCE page cannot: it is a static site
   * nginx serves while the webapp is down, so an external URL still resolves there but a `/…` webapp
   * path answers nothing — its generator drops those with a warning and keeps the vanilla asset
   * (scripts/build-maintenance-branding.ts `servedUrl`).
   */
  assets: {
    /** Extra stylesheets, injected as <link> at runtime (bespoke component rules, fonts via
     * @font-face pointing at files in the same served folder), e.g. ['assets/css/branding.css'].
     * PLAIN CSS only — nothing in the pipeline compiles SCSS/LESS (the build warns about a source
     * stylesheet under assets/), and the nuxt bundle is brand-agnostic, so this is the ONLY way a
     * brand ships custom rules. Declare anything that has a theme token as a `:root` property: those
     * re-theme the webapp AND packages/ui at once, and rules here can read them back via var(--…). */
    css: string[]
    /** Static-page HTML per page per locale code, e.g. `html.imprint.de = 'html/de/imprint.html'`.
     * Loaded at runtime by the InternalPage view (replaces the build-bundled html i18n). */
    html: Partial<Record<LinkPageKey, Record<string, string>>>
    /** Favicon path, e.g. 'assets/favicon.ico'. The browser-tab icon; `.ico` is what every brand
     * ships and what the vanilla fallback is, but any format a browser accepts works — the consumer
     * derives the `type` attribute from the extension. */
    favicon: string | null
    /** Square raster icon, e.g. 'assets/icon.png'. Used where a favicon will not do: the iOS
     * home-screen icon (`apple-touch-icon`, which ignores .ico) and the PWA manifest's install icon.
     * Must be a raster format and reasonably large (512px square is the useful size — browsers pick
     * an install/splash icon at up to that, and downscale from it).
     *
     * The build CHECKS this (a warning, never fatal — see build-brandings.ts `resolveIconAsset`), by
     * reading the file's own header rather than trusting its extension. It has to: both consumers
     * derive the `type` they announce from the PATH (webapp/utils/iconType.js), so an SVG here is
     * published as `image/svg+xml` and a browser that will not rasterise it drops the install icon
     * altogether — a failure that otherwise first appears on someone's phone.
     *
     * Every brand already ships `assets/icon.png`: the pre-runtime build copied it over the
     * framework's own webapp/static/icon.png at image-build time. Runtime branding cannot do that, so
     * the file sat unread in every brand repo until this slot named it. */
    icon: string | null
    /** BUILD-DERIVED, not authored: `icon`'s true pixel size as a manifest `sizes` value ('225x225'),
     * measured from the file's own header, or null when it cannot be measured (no icon, an externally
     * hosted one, a non-raster file).
     *
     * It exists because the PWA manifest has to DECLARE a size, and the only honest source for one is
     * the file. The manifest used to list every icon twice, as 192×192 and 512×512, whatever the file
     * actually was — and a browser that checks the decoded dimensions against the declaration drops a
     * candidate that contradicts it, which leaves a brand shipping a 225px icon with no install icon
     * at all. Anything a brand sets here is overwritten by the measurement. */
    iconSizes: string | null
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
