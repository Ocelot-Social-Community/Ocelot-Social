// The other half of confirmLeaveIfUnsavedChanges: that one catches in-app navigation, this one
// closing the tab, reloading or typing a new address — none of which goes through the router.
// Browsers show their own fixed dialog here. The host implements `hasUnsavedChanges()`, the same
// method confirmLeaveIfUnsavedChanges asks.
export default {
  mounted() {
    window.addEventListener('beforeunload', this.warnBeforeUnload)
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this.warnBeforeUnload)
  },
  methods: {
    warnBeforeUnload(event) {
      if (typeof this.hasUnsavedChanges !== 'function' || !this.hasUnsavedChanges()) return
      // Setting returnValue (the legacy opt-in) is what triggers the dialog; the string itself
      // is ignored by every modern browser.
      event.preventDefault()
      event.returnValue = ''
    },
  },
}
