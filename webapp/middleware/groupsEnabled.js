// Route guard for the groups feature. When the groupsEnabled network policy is off, the
// group pages are unreachable — redirect home rather than render a dead page whose queries
// the backend now rejects. The feature is disabled network-wide (a policy toggle), not
// forbidden for this specific user, so a redirect is friendlier than a 403 (mirrors how
// the header groups button simply disappears). The policy snapshot is loaded in
// nuxtServerInit before route middleware runs, and hydrated on the client, so the effective
// value is reliable here; getEffective folds any policy→policy dependency (there is none
// for groupsEnabled today, but this stays correct if one is added).
export default ({ store, redirect }) => {
  if (store.getters['policy/getEffective']('groupsEnabled') !== true) {
    return redirect('/')
  }
}
