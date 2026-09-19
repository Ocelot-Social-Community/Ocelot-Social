// Warns before an in-app navigation away from a page whose form has
// unsaved changes. Only covers Vue Router navigation (clicking another
// link/menu item) — closing the tab, reloading, or typing a new address
// doesn't go through the router at all, and is instead covered separately
// by each form's own native "beforeunload" listener (browsers always show
// their own fixed dialog there, not this one).
//
// beforeRouteLeave is a route-component guard: it only fires on the
// component Vue Router actually matched to the route (a page, for Nuxt),
// never on a plain child component nested inside it — so this mixin belongs
// on the *page*, which must implement its own `hasUnsavedChanges()` method
// (typically delegating to a form ref, e.g. `this.$refs.groupForm &&
// this.$refs.groupForm.hasUnsavedChanges`) and render a
// `<confirm-modal v-if="showLeaveConfirmModal" :modalData="leaveConfirmModalData"
// @close="showLeaveConfirmModal = false" />` somewhere in its template.
export default {
  data() {
    return {
      showLeaveConfirmModal: false,
      pendingNavigation: null,
    }
  },
  computed: {
    leaveConfirmModalData() {
      return {
        titleIdent: 'actions.unsavedChanges.title',
        messageIdent: 'actions.unsavedChanges.message',
        buttons: {
          confirm: {
            danger: true,
            textIdent: 'actions.unsavedChanges.discard',
            callback: () => this.resolvePendingNavigation(true),
          },
          cancel: {
            textIdent: 'actions.unsavedChanges.stay',
            callback: () => this.resolvePendingNavigation(false),
          },
        },
      }
    },
  },
  methods: {
    resolvePendingNavigation(leave) {
      const next = this.pendingNavigation
      this.pendingNavigation = null
      this.showLeaveConfirmModal = false
      next?.(leave ? undefined : false)
    },
  },
  beforeRouteLeave(_to, _from, next) {
    if (typeof this.hasUnsavedChanges !== 'function' || !this.hasUnsavedChanges()) {
      next()
      return
    }
    this.pendingNavigation = next
    this.showLeaveConfirmModal = true
  },
}
