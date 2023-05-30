import { mapGetters, mapMutations } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      currentUser: 'auth/user',
    }),
    noneSetInPostTypeFilter() {
      return !this.articleSetInPostTypeFilter && !this.eventSetInPostTypeFilter
    },
    articleSetInPostTypeFilter() {
      return this.filteredPostTypes.includes('Article')
    },
    eventSetInPostTypeFilter() {
      return this.filteredPostTypes.includes('Event')
    },
  },
  methods: {
    ...mapMutations({
      toggleFilterPostType: 'posts/TOGGLE_POST_TYPE',
    }),
  },
}
