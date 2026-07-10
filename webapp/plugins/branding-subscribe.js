// Live branding switch (client). The active branding is the `activeBranding` policy value; the
// policy subscription (policy-subscribe.js) already keeps the store's snapshot live. When it
// diverges from the branding that this page was server-rendered with (window.__NUXT__.brandingId),
// the simplest correct way to fully apply another brand — its config, assets, static-page HTML and
// (build-time) theme — is a reload, which re-runs the SSR branding loader for the new id. Branding
// switches are rare admin actions, so a reload is acceptable and avoids brittle in-place swapping
// of the module-level branding accessor.
export default ({ store }) => {
  if (typeof window === 'undefined') return
  const loaded = (window.__NUXT__ && window.__NUXT__.brandingId) || ''

  store.watch(
    (state, getters) => getters['policy/snapshot'].activeBranding,
    (active) => {
      // undefined = the policy snapshot has not loaded yet (every real value, incl. '' for
      // vanilla, is defined once loaded) — do nothing until we actually know the active id.
      if (active === undefined) return
      if ((active || '') !== loaded) window.location.reload()
    },
  )
}
