import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      maxPinnedPosts: 'pinnedPosts/maxPinnedPosts',
      currentlyPinnedPosts: 'pinnedPosts/currentlyPinnedPosts',
      isAdmin: 'auth/isAdmin',
    }),
  },
  methods: {
    ...mapActions({
      fetchPinnedPostsCount: 'pinnedPosts/fetch',
    })
  },
  async created() {
    if (this.isAdmin && this.maxPinnedPosts === 0) await this.fetchPinnedPostsCount()
  },
}
