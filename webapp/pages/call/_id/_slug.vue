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
        // If a user opens the call URL directly (refresh, bookmark) without an
        // active session, send them to the group page where they can join.
        if (!active && process.client) {
          const { id, slug } = this.$route.params
          if (id && slug) {
            this.$router.replace({ name: 'groups-id-slug', params: { id, slug } })
          }
        } else if (active) {
          // We're back on the call route — make sure the call is shown maximized.
          this.setMinimized(false)
        }
      },
    },
  },
  methods: {
    ...mapMutations({
      setMinimized: 'videoCall/SET_MINIMIZED',
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
