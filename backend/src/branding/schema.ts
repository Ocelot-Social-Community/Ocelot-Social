// The branding override schema — the typed contract between framework code and a brand.
//
// This is an ALLOW-LIST: only keys listed here are brand-overridable. Framework-internal
// constants (editor type ids, keycodes, timeouts) are deliberately NOT here, so a brand can
// never reach into them. Curation criterion (see docu/branding-architecture-konzept.md,
// "Schicht A konkret"): a key belongs here only if it is a per-network identity / UX /
// validation choice a brand operator would plausibly change — not runtime admin governance
// (that is Policy) and not framework-internal wiring.
//
// The schema is grown domain by domain as constants are migrated onto it. It currently models
// the keys the BACKEND consumes; webapp-only keys (layouts, logo dimensions, theme colour, …)
// join when the webapp is migrated onto the shared package.

export interface BrandingConfig {
  group: {
    // Minimum length of a group description with HTML tags stripped.
    descriptionMinLength: number
    // Length a group description is truncated to for its excerpt (HTML stripped).
    descriptionExcerptLength: number
  }
  registration: {
    // Length of the e-mail / password-reset nonce.
    nonceLength: number
    // Length of a generated invite code.
    inviteCodeLength: number
  }
  metadata: {
    // Application name (e-mail "from" name, PWA name, …).
    applicationName: string
    // Legal / organisation name shown in e-mails and imprint.
    organizationName: string
  }
  logos: {
    // Path (relative to CLIENT_URI) of the welcome logo embedded in e-mails.
    welcomePath: string
  }
}

// A recursive partial — a brand override is sparse, supplying only the keys it changes.
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type BrandingOverrides = DeepPartial<BrandingConfig>
