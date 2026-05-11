<template>
  <!--
    Empty host page. The VideoCall component lives in layouts/default.vue and
    renders itself maximally when this route is active. This page only exists
    so the in-call view has its own URL (bookmarkable, shareable, browser-back
    aware).
  -->
  <div class="call-page" />
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'

export default {
  name: 'CallPage',
  head() {
    return {
      title: this.callTitle,
    }
  },
  computed: {
    ...mapGetters({
      showVideoCall: 'videoCall/showVideoCall',
      activeGroupId: 'videoCall/groupId',
      groupName: 'videoCall/groupName',
    }),
    callTitle() {
      return this.groupName
        ? this.$t('videoCall.gotoGroup', { name: this.groupName })
        : this.$t('videoCall.title')
    },
  },
  watch: {
    showVideoCall: {
      immediate: true,
      handler(active) {
        if (!process.client) return
        if (active) {
          // We're back on the call route — make sure the call is shown maximized.
          this.setMinimized(false)
          return
        }
        // Direct visit (refresh, bookmark, shared link): pop up the device
        // setup so the user can join from here. If the user cancels, leave()
        // in VideoCall.vue navigates back to the group page.
        const { id, slug } = this.$route.params
        if (id && slug) {
          this.openVideoCall({ groupId: id, groupSlug: slug, groupName: null })
        }
      },
    },
    $route(to, from) {
      // Handle navigating from one call URL to another (different group) while
      // already on the call page — Vue Router reuses the component, so the
      // immediate-watcher above does not refire.
      if (to.name !== 'call-id-slug') return
      if (from && from.name === 'call-id-slug' && to.params.id === from.params.id) return
      const { id, slug } = to.params
      if (!id || !slug) return
      if (this.showVideoCall && this.activeGroupId === id) {
        this.setMinimized(false)
      } else if (!this.showVideoCall) {
        this.openVideoCall({ groupId: id, groupSlug: slug, groupName: null })
      }
    },
  },
  methods: {
    ...mapMutations({
      setMinimized: 'videoCall/SET_MINIMIZED',
      openVideoCall: 'videoCall/OPEN',
    }),
  },
}
</script>

<style lang="scss" scoped>
.call-page {
  // The video overlay covers this page entirely — the host page is just
  // here so the call has its own URL.
  position: absolute;
  inset: 0;
}
</style>
