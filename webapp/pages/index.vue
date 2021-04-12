<template>
  <div>
    <!-- <ds-space /> -->
    <!-- <ds-flex :width="{ base: '100%' }" gutter="base"> -->
    <ds-flex>
      <!-- <ds-flex-item
        v-if="NEWSFEED_SHOW_INFO_LEFT_LANE"
        :width="{ base: '100%', sm: 2, md: 2, lg: 1 }"
      > -->
      <ds-flex-item v-if="NEWSFEED_SHOW_INFO_LEFT_LANE" :width="{ base: '270px' }">
        <!-- Wolle -->
        <donation-info
          v-if="DONATIONS_SHOW_INFO"
          class="newsfeed-left-side-navigation"
          :title="'Donation progress'"
        />
        <!-- Wolle <div v-if-else>
          <a target="_blank" :href="links.DONATE">
            <base-button filled>{{ $t('donations.donate-now') }}</base-button>
          </a>
        </div> -->
      </ds-flex-item>

      <ds-flex-item :width="{ base: '100%', sm: 3, md: 5, lg: 3 }">
        <masonry-grid>
          <ds-grid-item v-if="hashtag" :row-span="2" column-span="fullWidth">
            <hashtags-filter :hashtag="hashtag" @clearSearch="clearSearch" />
          </ds-grid-item>
          <!-- Wolle <ds-grid-item :row-span="2" column-span="fullWidth" class="top-info-bar"> -->
          <!--<donation-info /> -->
          <!-- Wolle <div>
              <a target="_blank" :href="links.DONATE">
                <base-button filled>{{ $t('donations.donate-now') }}</base-button>
              </a>
            </div> -->
          <!-- Wolle <div class="sorting-dropdown">
              <ds-select
                v-model="selected"
                :options="sortingOptions"
                size="large"
                :icon-right="sortingIcon"
              ></ds-select>
            </div> -->
          <!-- </ds-grid-item> -->
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
      </ds-flex-item>
    </ds-flex>
    <client-only>
      <nuxt-link :to="{ name: 'post-create' }">
        <base-button
          v-tooltip="{
            content: $t('contribution.newPost'),
            placement: 'left',
            delay: { show: 500 },
          }"
          class="post-add-button"
          icon="plus"
          filled
          circle
        />
      </nuxt-link>
    </client-only>
    <client-only>
      <infinite-loading v-if="hasMore" @infinite="showMoreContributions" />
    </client-only>
  </div>
</template>

<script>
import { DONATIONS_SHOW_INFO } from '~/constants/donations'
import { NEWSFEED_SHOW_INFO_LEFT_LANE } from '~/constants/newsfeed'
import postListActions from '~/mixins/postListActions'
import DonationInfo from '~/components/DonationInfo/DonationInfo.vue'
import HashtagsFilter from '~/components/HashtagsFilter/HashtagsFilter.vue'
import HcEmpty from '~/components/Empty/Empty'
import PostTeaser from '~/components/PostTeaser/PostTeaser.vue'
import MasonryGrid from '~/components/MasonryGrid/MasonryGrid.vue'
import MasonryGridItem from '~/components/MasonryGrid/MasonryGridItem.vue'
import { mapGetters } from 'vuex'
import { filterPosts } from '~/graphql/PostQuery.js'
import UpdateQuery from '~/components/utils/UpdateQuery'
import links from '~/constants/links.js'

export default {
  components: {
    DonationInfo,
    HashtagsFilter,
    PostTeaser,
    HcEmpty,
    MasonryGrid,
    MasonryGridItem,
  },
  mixins: [postListActions],
  data() {
    const { hashtag = null } = this.$route.query
    return {
      DONATIONS_SHOW_INFO,
      NEWSFEED_SHOW_INFO_LEFT_LANE,
      links,
      posts: [],
      hasMore: true,
      // Initialize your apollo data
      offset: 0,
      pageSize: 12,
      hashtag,
    }
  },
  computed: {
    ...mapGetters({
      postsFilter: 'posts/filter',
      orderBy: 'posts/orderBy',
    }),
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
  },
  watchQuery: ['hashtag'],
  methods: {
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
.newsfeed-left-side-navigation {
  position: sticky;
  top: 65px;
  z-index: 2;
}

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

.sorting-dropdown {
  width: 250px;
  position: relative;

  @media (max-width: 680px) {
    width: 180px;
  }
}

.top-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

  @media (max-width: 546px) {
    grid-row-end: span 3 !important;
    flex-direction: column;
  }
}
</style>
