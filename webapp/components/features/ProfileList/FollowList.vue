<template>
  <infinite-scroll-list
    :title="listTitle"
    :count="totalCount"
    :nobody-message="nobodyMessage"
    :empty="!hasConnections"
    :loading="loadingConnections || loadingMore"
    :has-more="!allLoaded"
    :show-filter="showFilter"
    :filter-placeholder="$t('common.filter')"
    @load-more="loadMore"
    @scrolling-change="onScrollingChange"
    @filter-change="onFilterChange"
  >
    <ul class="connections">
      <li v-for="connection in connections" :key="connection.id" class="connections__item">
        <user-teaser :user="connection" :show-popover="popoverEnabled" :hover-delay="800" />
      </li>
    </ul>
  </infinite-scroll-list>
</template>

<script>
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import InfiniteScrollList from './InfiniteScrollList.vue'
import { followConnectionsQuery } from '~/graphql/User'

const PAGE_SIZE = 25

export default {
  name: 'FollowList',
  components: {
    UserTeaser,
    InfiniteScrollList,
  },
  props: {
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    type: {
      type: String,
      default: 'following',
      validator: (v) => ['following', 'followedBy'].includes(v),
    },
  },
  data() {
    return {
      connections: [],
      totalCount: null,
      loadingConnections: true,
      loadingMore: false,
      allLoaded: false,
      isScrolling: false,
      loadingCooldown: false,
      activeFilter: '',
      showFilter: false,
    }
  },
  computed: {
    hasConnections() {
      return this.connections.length > 0
    },
    isLoading() {
      return this.loadingConnections || this.loadingMore
    },
    popoverEnabled() {
      return !this.isScrolling && !this.isLoading && !this.loadingCooldown
    },
    listTitle() {
      const name = this.$filters.truncate(this.userName, 15)
      return `${name} ${this.$t(`profile.network.${this.type}`)}`
    },
    nobodyMessage() {
      if (this.activeFilter.length >= 3) return this.$t('profile.network.followNoFilterResults')
      const name = this.$filters.truncate(this.userName, 15)
      return `${name} ${this.$t(`profile.network.${this.type}Nobody`)}`
    },
  },
  watch: {
    isLoading(newVal, oldVal) {
      if (oldVal && !newVal) {
        clearTimeout(this._loadingCooldownTimer)
        this.loadingCooldown = true
        this._loadingCooldownTimer = setTimeout(() => {
          this.loadingCooldown = false
        }, 600)
      }
    },
  },
  async mounted() {
    await this.loadConnections(0)
  },
  beforeDestroy() {
    clearTimeout(this._loadingCooldownTimer)
  },
  methods: {
    async loadConnections(offset) {
      if (offset === 0) {
        this.loadingConnections = true
        this.allLoaded = false
        this.totalCount = null
      } else {
        this.loadingMore = true
      }
      try {
        const { data } = await this.$apollo.query({
          query: followConnectionsQuery(this.type, this.$i18n),
          variables: {
            id: this.userId,
            first: PAGE_SIZE,
            offset,
            nameFilter: this.activeFilter.length >= 3 ? this.activeFilter : '',
          },
          fetchPolicy: 'network-only',
        })
        const userData = data?.User?.[0]
        if (userData) {
          this.totalCount = userData[`${this.type}Count`] ?? null
          const newItems = userData[this.type] || []
          if (offset === 0) {
            this.connections = newItems
          } else {
            const merged = [...this.connections, ...newItems]
            const seen = new Set()
            this.connections = merged.filter((u) => {
              if (!u || !u.id || seen.has(u.id)) return false
              seen.add(u.id)
              return true
            })
          }
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
      if (this.connections.length >= PAGE_SIZE) this.showFilter = true
      await this.loadConnections(this.connections.length)
    },
    onScrollingChange(isScrolling) {
      this.isScrolling = isScrolling
    },
    onFilterChange(val) {
      this.activeFilter = val
      this.loadConnections(0)
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
