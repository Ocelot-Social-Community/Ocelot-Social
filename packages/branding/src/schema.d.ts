// The branding override schema — the typed contract between framework code and a brand.
//
// ALLOW-LIST: only keys listed here are brand-overridable. Framework-internal constants
// (editor type ids, keycodes, timeouts) are deliberately NOT here. Curation criterion (see
// docu/branding-architecture-konzept.md, "Schicht A konkret"): a key belongs here only if it
// is a per-network identity / UX / validation choice a brand operator would plausibly change —
// not runtime admin governance (that is Policy) and not framework-internal wiring.
//
// Grown domain by domain as constants are migrated onto the shared package. Webapp-only keys
// (layouts, logo dimensions, the header-click nav object, theme colour, …) are added as the
// webapp is migrated.

export interface BrandingConfig {
  group: {
    /** Minimum length of a group name (webapp form validation). */
    nameLengthMin: number
    /** Maximum length of a group name (webapp form validation). */
    nameLengthMax: number
    /** Minimum length of a group description with HTML tags stripped. */
    descriptionMinLength: number
    /** Length a group description is truncated to for its excerpt (HTML stripped). */
    descriptionExcerptLength: number
  }
  registration: {
    /** Length of the e-mail / password-reset nonce. */
    nonceLength: number
    /** Length of a generated invite code. */
    inviteCodeLength: number
    /** Nuxt page layout used for the registration flow (webapp). */
    layout: string
  }
  login: {
    /** Nuxt page layout used for the login / password-reset pages (webapp). */
    layout: string
  }
  comment: {
    /** Minimum length of a comment (HTML stripped). */
    minLength: number
    /** Above this length a comment is truncated in the card view. */
    maxUntruncatedLength: number
    /** Length a long comment is truncated to. */
    truncateToLength: number
  }
  dateTime: {
    /** Whether timestamps are shown relative ("3h ago") rather than absolute. */
    relativeDateTime: boolean
    /** date-fns format token for absolute timestamps. */
    absoluteDateTimeFormat: string
  }
  metadata: {
    /** Application name (e-mail "from" name, PWA name, …). */
    applicationName: string
    /** Legal / organisation name shown in e-mails and imprint. */
    organizationName: string
  }
  logos: {
    /** Path (relative to CLIENT_URI) of the welcome logo embedded in e-mails. */
    welcomePath: string
  }
}

/** A recursive partial — a brand override is sparse, supplying only the keys it changes. */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type BrandingOverrides = DeepPartial<BrandingConfig>
