import { mapGetters, mapMutations } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
      filteredPostTypes: 'posts/filteredPostTypes',
      noneSetInPostTypeFilter: 'posts/noneSetInPostTypeFilter',
      articleSetInPostTypeFilter: 'posts/articleSetInPostTypeFilter',
      eventSetInPostTypeFilter: 'posts/eventSetInPostTypeFilter',
      orderedByCreationDate: 'posts/orderedByCreationDate',
      eventsEnded: 'posts/eventsEnded',
      orderBy: 'posts/orderBy',
    }),
  },
  methods: {
    ...mapMutations({
      toggleFilterPostType: 'posts/TOGGLE_POST_TYPE',
      toggleUnsetAllPostTypeFilters: 'posts/TOGGLE_UNSET_ALL_POST_TYPES_FILTERS',
      toggleSetUnsetPostTypeFilter: 'posts/TOGGLE_SET_UNSET_POST_TYPE_FILTER',
      toggleEventsEnded: 'posts/TOGGLE_EVENTS_ENDED',
      toggleOrder: 'posts/TOGGLE_ORDER',
    }),
    setEventsEnded(newEventsEnded) {
      this.toggleEventsEnded(newEventsEnded)
    },
    setOrder(newOrder) {
      this.toggleOrder(newOrder)
    },
  },
}
