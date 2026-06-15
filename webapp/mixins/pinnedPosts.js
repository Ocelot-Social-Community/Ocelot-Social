import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      currentlyPinnedPosts: 'pinnedPosts/currentlyPinnedPosts',
      pinnedPostsLoaded: 'pinnedPosts/loaded',
    }),
    // The pin limit is a network-policy key (single source of truth, live via the
    // policy subscription) — no longer carried by the PostsPinnedCounts query.
    maxPinnedPosts() {
      return this.$policy.get('maxPinnedPosts')
    },
  },
  methods: {
    ...mapActions({
      fetchPinnedPostsCount: 'pinnedPosts/fetch',
    }),
    // The live network-wide count is only consulted when more than one pin is
    // allowed (max === 1 / 0 never need it), and only users who may pin (post.pin)
    // need it — so in the common single-pin deployment the PostsPinnedCounts
    // round-trip is skipped entirely. Fetched at most once (guarded by `loaded`).
    maybeFetchPinnedPostsCount() {
      if (this.$can('post.pin') && this.maxPinnedPosts > 1 && !this.pinnedPostsLoaded) {
        this.fetchPinnedPostsCount()
      }
    },
  },
  created() {
    this.maybeFetchPinnedPostsCount()
  },
  watch: {
    // A live policy change to >1 (admin raises the limit without a reload) still
    // arms the count.
    maxPinnedPosts() {
      this.maybeFetchPinnedPostsCount()
    },
  },
}
