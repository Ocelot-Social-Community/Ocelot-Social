<template>
  <infinite-scroll-list
    :title="listTitle"
    :nobody-message="nobodyMessage"
    :empty="!hasConnections && !loadingConnections"
    :loading="loadingConnections || loadingMore"
    :has-more="!allLoaded"
    @load-more="loadMore"
  >
    <ul class="connections">
      <li v-for="connection in connections" :key="connection.id" class="connections__item">
        <user-teaser :user="connection" />
      </li>
    </ul>
  </infinite-scroll-list>
</template>

<script>
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import InfiniteScrollList from './InfiniteScrollList.vue'
import { followConnectionsQuery } from '~/graphql/User'

const PAGE_SIZE = 10

export default {
  name: 'FollowList',
  components: {
    UserTeaser,
    InfiniteScrollList,
  },
  props: {
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    type: { type: String, default: 'following' },
  },
  data() {
    return {
      connections: [],
      totalCount: 0,
      loadingConnections: false,
      loadingMore: false,
      allLoaded: false,
    }
  },
  computed: {
    hasConnections() {
      return this.connections.length > 0
    },
    listTitle() {
      const name = this.$filters.truncate(this.userName, 15)
      return `${name} ${this.$t(`profile.network.${this.type}`)}`
    },
    nobodyMessage() {
      const name = this.$filters.truncate(this.userName, 15)
      return `${name} ${this.$t(`profile.network.${this.type}Nobody`)}`
    },
  },
  async mounted() {
    await this.loadConnections(0)
  },
  methods: {
    async loadConnections(offset) {
      if (offset === 0) {
        this.loadingConnections = true
        this.connections = []
        this.allLoaded = false
        this.totalCount = 0
      } else {
        this.loadingMore = true
      }
      try {
        const { data } = await this.$apollo.query({
          query: followConnectionsQuery(this.type, this.$i18n),
          variables: { id: this.userId, first: PAGE_SIZE, offset },
          fetchPolicy: 'network-only',
        })
        const userData = data?.User?.[0]
        if (userData) {
          this.totalCount = userData[`${this.type}Count`] || 0
          const newItems = userData[this.type] || []
          const merged = [...this.connections, ...newItems]
          const seen = new Set()
          this.connections = merged.filter((u) => {
            if (!u || !u.id || seen.has(u.id)) return false
            seen.add(u.id)
            return true
          })
          if (newItems.length < PAGE_SIZE) this.allLoaded = true
        }
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.loadingConnections = false
        this.loadingMore = false
      }
    },
    async loadMore() {
      if (this.allLoaded || this.loadingMore || this.loadingConnections) return
      await this.loadConnections(this.connections.length)
    },
  },
}
</script>

<style lang="scss" scoped>
.connections {
  list-style: none;
  padding: 0;
  margin: 0;

  &__item {
    padding: $space-xx-small;

    &:hover {
      background-color: $background-color-primary-inverse;
    }
  }
}
</style>
