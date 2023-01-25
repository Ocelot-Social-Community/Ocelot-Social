<template>
  <div>
    <masonry-grid>
      <ds-grid-item v-if="hashtag" :row-span="2" column-span="fullWidth">
        <hashtags-filter :hashtag="hashtag" @clearSearch="clearSearch" />
      </ds-grid-item>
      <!--Filter Button-->

      <ds-grid-item
        v-if="categoriesActive"
        :row-span="1"
        column-span="fullWidth"
        style="z-index: 1"
      >
        <ds-button
          class="my-filter-button"
          v-if="!postsFilter['categories_some'] && !postsFilter['author']"
          :icon="filterButtonIcon"
          right
          @click="showFilter = !showFilter"
        >
          {{ $t('contribution.filterMasonryGrid.noFilter') }}
        </ds-button>

        <ds-button
          class="my-filter-button"
          v-if="postsFilter['categories_some']"
          :icon="filterButtonIcon"
          right
          @click="showFilter = !showFilter"
        >
          {{ $t('contribution.filterMasonryGrid.myTheme') }}
        </ds-button>

        <ds-button
          class="my-filter-button"
          v-if="postsFilter['author']"
          :icon="filterButtonIcon"
          right
          @click="showFilter = !showFilter"
        >
          {{ $t('contribution.filterMasonryGrid.myFriends') }}
        </ds-button>

        <div
          id="my-filter"
          style="background-color: white; box-shadow: rgb(189 189 189) 1px 9px 15px 1px"
          v-if="showFilter"
        >
          <filter-menu-component :showMobileMenu="showMobileMenu" />
        </div>
      </ds-grid-item>
      <ds-space :margin-bottom="{ base: 'small', md: 'base', lg: 'large' }" />

      <!-- donation info -->
      <ds-grid-item v-if="showDonations" class="top-info-bar" :row-span="1" column-span="fullWidth">
        <donation-info :goal="goal" :progress="progress" />
      </ds-grid-item>
      <!-- news feed -->
      <template v-if="hasResults">
        <masonry-grid-item
          v-for="post in posts"
          :key="post.id"
          :imageAspectRatio="post.image && post.image.aspectRatio"
        >
          <post-teaser
            :post="post"
            @removePostFromList="posts = removePostFromList(post, posts)"
            @pinPost="pinPost(post, refetchPostList)"
            @unpinPost="unpinPost(post, refetchPostList)"
          />
        </masonry-grid-item>
      </template>
      <template v-else>
        <ds-grid-item :row-span="2" column-span="fullWidth">
          <hc-empty icon="docs" />
          <ds-text align="center">{{ $t('index.no-results') }}</ds-text>
          <ds-text align="center">{{ $t('index.change-filter-settings') }}</ds-text>
        </ds-grid-item>
      </template>
    </masonry-grid>
    <!-- create post -->
    <client-only>
      <nuxt-link :to="{ name: 'post-create' }">
        <base-button
          v-tooltip="{
            content: $t('contribution.newPost'),
            placement: 'left',
          }"
          class="post-add-button"
          icon="plus"
          filled
          circle
        />
      </nuxt-link>
    </client-only>
    <!-- infinite loading -->
    <client-only>
      <infinite-loading v-if="hasMore" @infinite="showMoreContributions" />
    </client-only>
  </div>
</template>

<script>
import postListActions from '~/mixins/postListActions'
import DonationInfo from '~/components/DonationInfo/DonationInfo.vue'
import HashtagsFilter from '~/components/HashtagsFilter/HashtagsFilter.vue'
import HcEmpty from '~/components/Empty/Empty'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid.vue'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem.vue'
import { mapGetters, mapMutations } from 'vuex'
import { DonationsQuery } from '~/graphql/Donations'
import { filterPosts } from '~/graphql/PostQuery.js'
import UpdateQuery from '~/components/utils/UpdateQuery'
import FilterMenuComponent from '~/components/FilterMenu/FilterMenuComponent'
export default {
  components: {
    DonationInfo,
    HashtagsFilter,
    PostTeaser,
    HcEmpty,
    MasonryGrid,
    MasonryGridItem,
    FilterMenuComponent,
  },
  mixins: [postListActions],
  props: {
    showMobileMenu: { type: Boolean, default: false },
  },
  data() {
    const { hashtag = null } = this.$route.query
    return {
      showFilter: false,
      showDonations: true,
      goal: 15000,
      progress: 7000,
      posts: [],
      hasMore: true,
      // Initialize your apollo data
      offset: 0,
      pageSize: 12,
      hashtag,
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
    }
  },
  computed: {
    ...mapGetters({
      postsFilter: 'posts/filter',
      orderBy: 'posts/orderBy',
    }),
    filterButtonIcon() {
      if (Object.keys(this.postsFilter).length === 0) {
        return this.showFilter ? 'angle-down' : 'angle-up'
      }
      return 'filter'
    },
    finalFilters() {
      let filter = this.postsFilter
      if (this.hashtag) {
        filter = {
          ...filter,
          tags_some: { id: this.hashtag },
        }
      }
      return filter
    },
    hasResults() {
      return this.$apollo.loading || (this.posts && this.posts.length > 0)
    },
    categoryId() {
      return this.$route.query && this.$route.query.categoryId ? this.$route.query.categoryId : null
    },
  },
  watchQuery: ['hashtag'],
  mounted() {
    if (this.categoryId) {
      this.resetCategories()
      this.toggleCategory(this.categoryId)
    }
    document.addEventListener('click', this.removeFilter)
  },
  methods: {
    ...mapMutations({
      resetCategories: 'posts/RESET_CATEGORIES',
      toggleCategory: 'posts/TOGGLE_CATEGORY',
    }),
    removeFilter(e) {
      if (!e.target.closest('#my-filter') && !e.target.closest('.my-filter-button')) {
        if (!this.showFilter) return
        this.showFilter = false
      }
    },
    beforeDestroy() {
      document.removeEventListener('click', this.removeFilter)
    },
    clearSearch() {
      this.$router.push({ path: '/' })
      this.hashtag = null
    },
    href(post) {
      return this.$router.resolve({
        name: 'post-id-slug',
        params: { id: post.id, slug: post.slug },
      }).href
    },
    showMoreContributions($state) {
      const { Post: PostQuery } = this.$apollo.queries
      if (!PostQuery) return // seems this can be undefined on subpages

      this.offset += this.pageSize
      PostQuery.fetchMore({
        variables: {
          offset: this.offset,
          filter: this.finalFilters,
          first: this.pageSize,
          orderBy: ['pinned_asc', this.orderBy],
        },
        updateQuery: UpdateQuery(this, { $state, pageKey: 'Post' }),
      })
    },
    resetPostList() {
      this.offset = 0
      this.posts = []
      this.hasMore = true
    },
    refetchPostList() {
      this.resetPostList()
      this.$apollo.queries.Post.refetch()
    },
  },
  apollo: {
    Donations: {
      query() {
        return DonationsQuery()
      },
      update({ Donations }) {
        if (!Donations) return
        const { showDonations, goal, progress } = Donations
        this.showDonations = showDonations
        this.goal = goal
        this.progress = progress < goal ? progress : goal
      },
    },
    Post: {
      query() {
        return filterPosts(this.$i18n)
      },
      variables() {
        return {
          filter: this.finalFilters,
          first: this.pageSize,
          orderBy: ['pinned_asc', this.orderBy],
          offset: 0,
        }
      },
      update({ Post }) {
        this.posts = Post
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style lang="scss">
.masonry-grid {
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-rows: 20px;
}

.grid-item {
  grid-row-end: span 2;

  &--full-width {
    grid-column: 1 / -1;
  }
}

.base-button.--circle.post-add-button {
  height: 54px;
  width: 54px;
  font-size: 26px;
  z-index: 100;
  position: fixed;
  bottom: -5px;
  left: 98vw;
  transform: translate(-120%, -120%);
  box-shadow: $box-shadow-x-large;
}

.top-info-bar {
  display: flex;
  align-items: center;
}
</style>
