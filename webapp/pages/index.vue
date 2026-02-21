<template>
  <div>
    <!-- feed top row: filter (left) + create post (right) -->
    <div class="feed-top-row">
      <div v-if="SHOW_CONTENT_FILTER_MASONRY_GRID" class="filterButtonMenu">
        <os-button
          class="my-filter-button"
          v-if="
            !postsFilter['postType_in'] &&
            !postsFilter['categories_some'] &&
            !postsFilter['author'] &&
            !postsFilter['postsInMyGroups']
          "
          variant="primary"
          appearance="filled"
          @click="showFilter = !showFilter"
        >
          <template #suffix>
            <os-icon :icon="filterButtonIcon" />
          </template>
          {{ $t('contribution.filterMasonryGrid.noFilter') }}
        </os-button>

        <header-button
          v-if="filteredPostTypes.includes('Article')"
          :title="$t('contribution.filterMasonryGrid.onlyArticles')"
          :clickButton="openFilterMenu"
          :titleRemove="$t('filter-menu.deleteFilter')"
          :clickRemove="resetPostType"
        />

        <header-button
          v-if="filteredPostTypes.includes('Event')"
          :title="$t('contribution.filterMasonryGrid.onlyEvents')"
          :clickButton="openFilterMenu"
          :titleRemove="$t('filter-menu.deleteFilter')"
          :clickRemove="resetPostType"
        />

        <header-button
          v-if="postsFilter['categories_some']"
          :title="$t('contribution.filterMasonryGrid.myTopics')"
          :clickButton="openFilterMenu"
          :titleRemove="$t('filter-menu.deleteFilter')"
          :clickRemove="resetCategories"
        />

        <header-button
          v-if="postsFilter['author']"
          :title="$t('contribution.filterMasonryGrid.myFriends')"
          :clickButton="openFilterMenu"
          :titleRemove="$t('filter-menu.deleteFilter')"
          :clickRemove="resetByFollowed"
        />

        <header-button
          v-if="postsFilter['postsInMyGroups']"
          :title="$t('contribution.filterMasonryGrid.myGroups')"
          :clickButton="openFilterMenu"
          :titleRemove="$t('filter-menu.deleteFilter')"
          :clickRemove="resetByGroups"
        />
        <div id="my-filter" v-if="showFilter">
          <div @mouseleave="mouseLeaveFilterMenu">
            <filter-menu-component @showFilterMenu="showFilterMenu" />
          </div>
        </div>
      </div>
      <client-only>
        <os-button
          as="nuxt-link"
          :to="{ name: 'post-create-type' }"
          v-tooltip="{
            content: $t('contribution.newPost'),
            placement: 'left',
          }"
          class="post-add-button"
          :class="{ 'hide-filter': hideByScroll }"
          variant="primary"
          appearance="filled"
          circle
          size="xl"
        >
          <template #icon>
            <os-icon :icon="icons.plus" />
          </template>
        </os-button>
      </client-only>
    </div>

    <div
      v-if="hashtag || showDonations"
      class="newsfeed-controls"
      :class="{ 'newsfeed-controls--no-filter': !SHOW_CONTENT_FILTER_MASONRY_GRID }"
    >
      <div v-if="hashtag">
        <hashtags-filter :hashtag="hashtag" @clearSearch="clearSearch" />
      </div>
      <div v-if="showDonations" class="top-info-bar">
        <donation-info :goal="goal" :progress="progress" />
      </div>
    </div>
    <!-- content grid -->
    <masonry-grid
      :class="[
        !hashtag && !showDonations ? 'grid-margin-top' : '',
        !isMobile && posts.length <= 2 ? 'grid-column-helper' : '',
      ]"
    >
      <!-- news feed -->
      <template v-if="hasResults">
        <masonry-grid-item
          v-for="post in posts"
          :key="post.id"
          :imageAspectRatio="post.image && post.image.aspectRatio"
        >
          <post-teaser
            :post="post"
            :postsFilter="postsFilter['categories_some']"
            @removePostFromList="posts = removePostFromList(post, posts)"
            @pinPost="pinPost(post, refetchPostList)"
            @unpinPost="unpinPost(post, refetchPostList)"
            @pinGroupPost="pinGroupPost(post, refetchPostList)"
            @unpinGroupPost="unpinGroupPost(post, refetchPostList)"
            @pushPost="pushPost(post, refetchPostList)"
            @unpushPost="unpushPost(post, refetchPostList)"
            @toggleObservePost="
              (postId, value) => toggleObservePost(postId, value, refetchPostList)
            "
          />
        </masonry-grid-item>
      </template>
      <template v-else>
        <div style="grid-row-end: span 2; grid-column: 1 / -1">
          <hc-empty icon="docs" />
          <p class="ds-text ds-text-center">{{ $t('index.no-results') }}</p>
          <p class="ds-text ds-text-center">{{ $t('index.change-filter-settings') }}</p>
        </div>
      </template>
    </masonry-grid>

    <!-- infinite loading -->
    <client-only>
      <infinite-loading v-if="hasMore" @infinite="showMoreContributions">
        <os-spinner slot="spinner" size="lg" />
      </infinite-loading>
    </client-only>
  </div>
</template>

<script>
import { OsButton, OsIcon, OsSpinner } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import postListActions from '~/mixins/postListActions'
import mobile from '~/mixins/mobile'
import DonationInfo from '~/components/DonationInfo/DonationInfo.vue'
import HashtagsFilter from '~/components/HashtagsFilter/HashtagsFilter.vue'
import HcEmpty from '~/components/Empty/Empty'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid.vue'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem.vue'
import HeaderButton from '~/components/FilterMenu/HeaderButton'
import { mapGetters, mapMutations } from 'vuex'
import { DonationsQuery } from '~/graphql/Donations'
import { filterPosts } from '~/graphql/PostQuery.js'
import UpdateQuery from '~/components/utils/UpdateQuery'
import FilterMenuComponent from '~/components/FilterMenu/FilterMenuComponent'
import { SHOW_CONTENT_FILTER_MASONRY_GRID } from '~/constants/filter.js'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  components: {
    DonationInfo,
    HashtagsFilter,
    OsButton,
    OsIcon,
    OsSpinner,
    PostTeaser,
    HcEmpty,
    MasonryGrid,
    MasonryGridItem,
    FilterMenuComponent,
    HeaderButton,
  },
  mixins: [postListActions, mobile(), GetCategories],
  data() {
    const { hashtag = null } = this.$route.query
    return {
      hideByScroll: false,
      revScrollpos: 0,
      showFilter: false,
      developerNoAutoClosingFilterMenu: false, // stops automatic closing of filter menu for developer purposes: default is 'false'
      showDonations: false,
      goal: 15000,
      progress: 7000,
      posts: [],
      hasMore: true,
      // initialize your apollo data
      offset: 0,
      pageSize: 12,
      hashtag,
      SHOW_CONTENT_FILTER_MASONRY_GRID,
    }
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      postsFilter: 'posts/filter',
      orderBy: 'posts/orderBy',
    }),
    filterButtonIcon() {
      return this.showFilter ? this.icons.angleUp : this.icons.angleDown
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
  watch: {
    postsFilter() {
      this.resetPostList()
    },
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    if (this.categoryId) {
      this.resetCategories()
      this.toggleCategory(this.categoryId)
    }
    document.addEventListener('click', this.showFilterMenu)
    window.addEventListener('scroll', this.handleScroll)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.showFilterMenu)
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    ...mapMutations({
      resetPostType: 'posts/RESET_POST_TYPE',
      resetByFollowed: 'posts/TOGGLE_FILTER_BY_FOLLOWED',
      resetByGroups: 'posts/TOGGLE_FILTER_BY_MY_GROUPS',
      resetCategories: 'posts/RESET_CATEGORIES',
      toggleCategory: 'posts/TOGGLE_CATEGORY',
    }),
    openFilterMenu() {
      this.showFilter = !this.showFilter
    },
    mouseLeaveFilterMenu() {
      if (this.developerNoAutoClosingFilterMenu) return
      this.showFilter = false
    },
    showFilterMenu(e) {
      if (!e || (!e.target.closest('#my-filter') && !e.target.closest('.my-filter-button'))) {
        if (!this.showFilter) return
        this.showFilter = false
      }
    },
    handleScroll() {
      const currentScrollPos = window.pageYOffset
      if (this.prevScrollpos > 50) {
        if (this.prevScrollpos > currentScrollPos) {
          this.hideByScroll = false
        } else {
          if (!this.showFilter) {
            this.hideByScroll = true
          }
        }
      }
      this.prevScrollpos = currentScrollPos
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
.hide-filter {
  display: none;
}

.feed-top-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-top: 0px;
}

.filterButtonMenu {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.post-add-button {
  height: 54px !important;
  width: 54px !important;
  min-height: 54px !important;
  min-width: 54px !important;
  font-size: 26px !important;
  box-shadow: $box-shadow-x-large !important;
  z-index: $z-index-sticky-float !important;
  position: fixed !important;
  right: max(20px, calc((100vw - $container-max-width-x-large) / 2 + 48px)) !important;
  top: 81px !important;
  transition: top 0.3s ease !important;
}

.main-navigation:has(.hide-navbar) ~ .ds-container .post-add-button {
  top: 20px !important;
}

.top-info-bar {
  display: flex;
  align-items: center;
}
.newsfeed-controls {
  margin-top: 8px;

  &.newsfeed-controls--no-filter {
    margin-top: -16px;
    margin-bottom: 16px;

    .top-info-bar {
      padding-right: 70px;
    }
  }
}
.main-container .grid-column-helper {
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 357px)) !important;
}

#my-filter {
  max-width: 1028px;
  background-color: white;
  box-shadow: rgb(189 189 189) 1px 9px 15px 1px;
  max-height: 950px;
  overflow: auto;
  padding-bottom: 0px;
  z-index: $z-index-page-submenu;
}
.grid-margin-top {
  margin-top: 8px;
}
@media screen and (min-height: 401px) {
  #my-filter {
    max-height: 330px;
  }
}
@media screen and (min-height: 501px) {
  #my-filter {
    max-height: 440px;
  }
}
@media screen and (min-height: 601px) {
  #my-filter {
    max-height: 550px;
  }
}
@media screen and (min-height: 701px) {
  #my-filter {
    max-height: 640px;
  }
}
@media screen and (min-height: 801px) {
  #my-filter {
    max-height: 750px;
  }
}
@media screen and (min-height: 950px) {
  #my-filter {
    max-height: 830px;
  }
}
@media screen and (min-height: 1025px) {
  #my-filter {
    max-height: 870px;
  }
}
@media screen and (min-width: 800px) and (min-height: 500px) {
  #my-filter {
    padding-bottom: 80px;
  }
}
@media screen and (max-width: 650px) {
  .newsfeed-controls {
    margin-top: 8px;
  }
}
</style>
