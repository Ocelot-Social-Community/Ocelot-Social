<template>
  <div>
    <!-- create post -->
    <div :class="POST_ADD_BUTTON_POSITION_TOP ? 'box-add-button-top' : ''">
      <client-only>
        <nuxt-link :to="{ name: 'post-create' }" :class="{ 'hide-filter': hideByScroll }">
          <base-button
            v-tooltip="{
              content: $t('contribution.newPost'),
              placement: 'left',
            }"
            class="post-add-button"
            :class="POST_ADD_BUTTON_POSITION_TOP ? 'post-add-button-top' : 'post-add-button-bottom'"
            icon="plus"
            filled
            circle
          />
        </nuxt-link>
      </client-only>
    </div>
    <div>
      <div v-if="SHOW_CONTENT_FILTER_MASONRY_GRID" class="top-filter-menu">
        <div class="filterButtonBox">
          <div class="filterButtonMenu" :class="{ 'hide-filter': hideByScroll }">
            <base-button
              class="my-filter-button"
              v-if="
                !postsFilter['postType_in'] &&
                !postsFilter['categories_some'] &&
                !postsFilter['author'] &&
                !postsFilter['postsInMyGroups']
              "
              right
              @click="showFilter = !showFilter"
              filled
            >
              {{ $t('contribution.filterMasonryGrid.noFilter') }}
              &nbsp;
              <base-icon class="my-filter-button" :name="filterButtonIcon"></base-icon>
            </base-button>

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
        </div>
      </div>
    </div>

    <div v-if="hashtag || showDonations" class="newsfeed-controls">
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
            @pushPost="pushPost(post, refetchPostList)"
            @unpushPost="unpushPost(post, refetchPostList)"
            @toggleObservePost="
              (postId, value) => toggleObservePost(postId, value, refetchPostList)
            "
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

    <!-- infinite loading -->
    <client-only>
      <infinite-loading v-if="hasMore" @infinite="showMoreContributions" />
    </client-only>
  </div>
</template>

<script>
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
import { POST_ADD_BUTTON_POSITION_TOP } from '~/constants/posts.js'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  components: {
    DonationInfo,
    HashtagsFilter,
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
      POST_ADD_BUTTON_POSITION_TOP,
    }
  },
  computed: {
    ...mapGetters({
      filteredPostTypes: 'posts/filteredPostTypes',
      postsFilter: 'posts/filter',
      orderBy: 'posts/orderBy',
    }),
    filterButtonIcon() {
      return this.showFilter ? 'angle-up' : 'angle-down'
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
  mounted() {
    if (this.categoryId) {
      this.resetCategories()
      this.toggleCategory(this.categoryId)
    }
    document.addEventListener('click', this.showFilterMenu)
    window.addEventListener('scroll', this.handleScroll)
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
    beforeDestroy() {
      document.removeEventListener('click', this.showFilterMenu)
      window.removeEventListener('scroll', this.handleScroll)
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

.box-add-button-top {
  float: right;
}

.base-button.--circle.post-add-button-bottom {
  height: 54px;
  width: 54px;
  font-size: 26px;
  z-index: $z-index-sticky-float;
  position: fixed;
  bottom: -5px;
  left: 98vw;
  transform: translate(-120%, -120%);
  box-shadow: $box-shadow-x-large;
}

.base-button.--circle.post-add-button-top {
  height: 54px;
  width: 54px;
  font-size: 26px;
  z-index: $z-index-sticky-float;
  position: fixed;
  top: 80px;
  box-shadow: $box-shadow-x-large;
}

.top-filter-menu {
  margin-top: 16px;
}

.top-info-bar,
.top-filter-menu {
  display: flex;
  align-items: center;
}
.filterButtonMenu {
  width: 95%;
  position: fixed;
  z-index: $z-index-sticky;
  margin-top: -45px;
  padding: 30px 0px 20px 0px;
  background-color: #f5f4f6;
}
.newsfeed-controls {
  margin-top: 46px;
}
.main-container .grid-column-helper {
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 357px)) !important;
}

@media screen and (max-width: 656px) {
  .filterButtonMenu {
    margin-top: -50px;
  }
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
  margin-top: 26px;
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
@media screen and (max-width: 1200px) {
  .box-add-button-top {
    padding-right: 40px;
  }
  .base-button.--circle.post-add-button-top {
    height: 44px;
    width: 44px;
    font-size: 23px;
  }
}
@media screen and (max-width: 650px) {
  //    .top-filter-menu{
  //     margin-top: 24px;
  //   }

  .newsfeed-controls {
    margin-top: 32px;
  }
}
</style>
