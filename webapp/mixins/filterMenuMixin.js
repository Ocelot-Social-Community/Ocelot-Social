import { mapGetters, mapMutations } from 'vuex'

export default {
  data() {
    return {
      filterPostTypes: ['Article', 'Event'],
      orderByTypes: {
        creationDate: ['createdAt_asc', 'createdAt_desc'],
        startDate: ['eventStart_asc', 'eventStart_desc'],
      },
    }
  },
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
      toggleEventsEnded: 'posts/TOGGLE_EVENTS_ENDED',
      toggleOrder: 'posts/TOGGLE_ORDER',
    }),
    unsetAllPostTypeFilters() {
      const beforeEventSetInPostTypeFilter = this.eventSetInPostTypeFilter
      this.filterPostTypes.forEach((postType) => {
        if (this.filteredPostTypes.includes(postType)) this.toggleFilterPostType(postType)
      })
      this.adjustEventsEnded(beforeEventSetInPostTypeFilter)
      this.adjustOrder()
    },
    setUnsetPostTypeFilter(setPostType) {
      const beforeEventSetInPostTypeFilter = this.eventSetInPostTypeFilter
      if (this.noneSetInPostTypeFilter) {
        if (setPostType !== 'All') this.toggleFilterPostType(setPostType)
      } else {
        if (setPostType !== 'All') {
          if (this.filteredPostTypes.includes(setPostType)) {
            this.unsetAllPostTypeFilters()
          } else {
            // if 'setPostType' is not set then set it and unset all others
            this.toggleFilterPostType(setPostType)
            this.filterPostTypes.forEach((postType) => {
              if (postType !== setPostType && this.filteredPostTypes.includes(postType))
                this.toggleFilterPostType(postType)
            })
          }
        } else {
          this.unsetAllPostTypeFilters()
        }
      }
      this.adjustEventsEnded(beforeEventSetInPostTypeFilter)
      this.adjustOrder()
    },
    setEventsEnded(newEventsEnded) {
      this.toggleEventsEnded(newEventsEnded)
    },
    setOrder(newOrder) {
      this.toggleOrder(newOrder)
    },
    adjustEventsEnded(beforeEventSetInPostTypeFilter) {
      if (this.eventSetInPostTypeFilter !== beforeEventSetInPostTypeFilter) {
        if (this.eventSetInPostTypeFilter) {
          this.setEventsEnded('eventStart_gte')
        } else {
          this.setEventsEnded('')
        }
      }
    },
    adjustOrder() {
      if (this.orderedByCreationDate) {
        if (!this.orderByTypes.creationDate.includes(this.orderBy)) {
          this.setOrder('createdAt_desc')
        }
      } else {
        if (!this.orderByTypes.startDate.includes(this.orderBy)) {
          this.setOrder('eventStart_asc')
        }
      }
    },
  },
}
