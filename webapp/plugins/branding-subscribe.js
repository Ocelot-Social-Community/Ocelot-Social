// Live branding switch (client). The live branding is defined by TWO public policy values kept in the
// store snapshot: `activeBranding` (the base brand) and `brandingComposition` (per-slot overrides,
// a JSON string). When either diverges from what this page was server-rendered with (stamped as
// window.__NUXT__.brandingId + .brandingComposition), the simplest correct way to fully apply the new
// (re)composition — its config, assets, static-page HTML and theme — is a reload, which re-runs the
// SSR branding loader. Branding switches are rare admin actions, so a reload is acceptable and avoids
// brittle in-place swapping of the module-level branding accessor. We compare a combined SIGNATURE of
// both values.
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

// The reload signature = base brand + per-slot composition, so a change to EITHER triggers a reload.
function signature(active, composition) {
  return `${active || ''}\n${composition || ''}`
}

export default ({ store }) => {
  if (typeof window === 'undefined') return
  const nuxt = window.__NUXT__ || {}
  // What the page was rendered with: brandingId = the RESOLVED base (may differ from the raw policy
  // on a baked-default image — the loop guard below handles that), brandingComposition = raw json.
  const loaded = signature(nuxt.brandingId, nuxt.brandingComposition)

  store.watch(
    (state, getters) => {
      const snapshot = getters['policy/snapshot']
      // undefined = the policy snapshot has not loaded yet (every real value, incl. '' for vanilla,
      // is defined once loaded) — return undefined so the watcher does nothing until it is known.
      if (snapshot.activeBranding === undefined) return undefined
      return signature(snapshot.activeBranding, snapshot.brandingComposition)
    },
    (target) => {
      if (target === undefined) return

      // The effective (re)composition already matches what this page was rendered with → nothing to
      // do, and clear any pending reload attempt (a switch has fully taken effect).
      if (target === loaded) {
        clearAttemptedTarget()
        return
      }

      // Target differs. Reload to apply it — but only once per target: if we already reloaded for
      // this exact signature and the server still rendered something else (an unreachable vanilla ''
      // on a baked-default image, or an ops pin overriding the policy), reloading again would loop
      // forever. Break instead.
      if (readAttemptedTarget() === target) return
      writeAttemptedTarget(target)
      window.location.reload()
    },
  )
}
