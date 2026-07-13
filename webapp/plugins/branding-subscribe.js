// Live branding switch (client). The active branding is the `activeBranding` policy value; the
// policy subscription (policy-subscribe.js) already keeps the store's snapshot live. When it
// diverges from the branding that this page was server-rendered with (window.__NUXT__.brandingId),
// the simplest correct way to fully apply another brand — its config, assets, static-page HTML and
// (build-time) theme — is a reload, which re-runs the SSR branding loader for the new id. Branding
// switches are rare admin actions, so a reload is acceptable and avoids brittle in-place swapping
// of the module-level branding accessor.
//
// Loop guard: the SSR loader resolves an EMPTY policy ('' = vanilla) through a fallback chain
// (policy → $OCELOT_ACTIVE_BRANDING pin → baked DEFAULT marker → ''). On an image with a baked
// default (or an ops pin), switching the policy to '' therefore still renders the baked brand, so
// `brandingId` stays non-empty and never equals the requested ''. Without a guard the watcher would
// reload forever (each reload re-resolves to the same baked id) — which also tears down the page
// mid-mount and surfaces as unrelated crashes (e.g. vue-infinite-loading's getScrollParent reading
// a detached node). We therefore reload at most ONCE per requested target: if we already reloaded
// for this exact target and the render still didn't honour it, the server cannot reach it — stop.
const RELOAD_TARGET_KEY = 'ocelot-branding-reload-target'

function readAttemptedTarget() {
  try {
    return window.sessionStorage.getItem(RELOAD_TARGET_KEY)
  } catch (error) {
    return null // sessionStorage unavailable (e.g. privacy mode) — degrade to no memory
  }
}

function writeAttemptedTarget(target) {
  try {
    window.sessionStorage.setItem(RELOAD_TARGET_KEY, target)
  } catch (error) {
    // ignore — worst case we lose loop protection, still better than crashing
  }
}

function clearAttemptedTarget() {
  try {
    window.sessionStorage.removeItem(RELOAD_TARGET_KEY)
  } catch (error) {
    // ignore
  }
}

export default ({ store }) => {
  if (typeof window === 'undefined') return
  const loaded = (window.__NUXT__ && window.__NUXT__.brandingId) || ''

  store.watch(
    (state, getters) => getters['policy/snapshot'].activeBranding,
    (active) => {
      // undefined = the policy snapshot has not loaded yet (every real value, incl. '' for
      // vanilla, is defined once loaded) — do nothing until we actually know the active id.
      if (active === undefined) return
      const target = active || ''

      // The effective brand already matches what this page was rendered with → nothing to do, and
      // clear any pending reload attempt (a switch has fully taken effect).
      if (target === loaded) {
        clearAttemptedTarget()
        return
      }

      // Target differs from the rendered brand. Reload to apply it — but only once: if we already
      // reloaded for this exact target and the server still rendered something else (an unreachable
      // vanilla '' on a baked-default image, or an ops pin overriding the policy), reloading again
      // would loop forever. Break instead.
      if (readAttemptedTarget() === target) return
      writeAttemptedTarget(target)
      window.location.reload()
    },
  )
}
