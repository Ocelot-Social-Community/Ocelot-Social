import { mapGetters, mapMutations } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      currentUser: 'auth/user',
    }),
    noneSet() {
      return !this.articleSet && !this.eventSet
    },
    articleSet() {
      return this.filteredPostTypes.includes('Article')
    },
    eventSet() {
      return this.filteredPostTypes.includes('Event')
    },
  },
  methods: {
    ...mapMutations({
      toggleFilterPostType: 'posts/TOGGLE_POST_TYPE',
    }),
  },
}
