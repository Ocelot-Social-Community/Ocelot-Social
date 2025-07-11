<template>
  <nuxt-link
    class="post-teaser"
    :to="{ name: 'post-id-slug', params: { id: post.id, slug: post.slug } }"
  >
    <base-card
      :lang="post.language"
      :class="{
        'disabled-content': post.disabled,
        '--blur-image': post.image && post.image.sensitive,
      }"
      :highlight="isPinned"
    >
      <template v-if="post.image" #heroImage>
        <img :src="post.image | proxyApiUrl" class="image" />
      </template>
      <client-only>
        <div class="post-user-row">
          <user-teaser :user="post.author" :group="post.group" />
          <hc-ribbon
            :class="[isPinned ? '--pinned' : '', post.image ? 'post-ribbon-w-img' : 'post-ribbon']"
            :text="ribbonText"
            :typ="post.postType[0]"
          />
        </div>
      </client-only>
      <h2 class="title hyphenate-text">{{ post.title }}</h2>
      <client-only>
        <ds-space
          v-if="post && post.postType[0] === 'Event'"
          margin-bottom="small"
          style="padding: 5px"
        >
          <location-teaser
            class="event-info"
            size="base"
            :venue="post.eventVenue"
            :locationName="post.eventLocationName"
            :isOnline="post.eventIsOnline"
          />
          <date-time-range
            class="event-info"
            size="base"
            :startDate="post.eventStart"
            :endDate="post.eventEnd"
          />
        </ds-space>
      </client-only>
      <!-- TODO: replace editor content with tiptap render view -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="content hyphenate-text" v-html="excerpt" />
      <footer
        class="footer"
        v-observe-visibility="(isVisible, entry) => visibilityChanged(isVisible, entry, post.id)"
      >
        <div
          class="categories"
          v-if="categoriesActive && post.categories && post.categories.length > 0"
        >
          <category
            v-for="category in post.categories"
            :key="category.id"
            v-tooltip="{
              content: `
                ${$t(`contribution.category.name.${category.slug}`)}:
                ${$t(`contribution.category.description.${category.slug}`)}
              `,
              placement: 'bottom-start',
            }"
            :icon="category.icon"
            :filterActive="postsFilter ? postsFilter.id_in.includes(category.id) : false"
          />
        </div>
        <div v-else class="categories-placeholder"></div>
        <counter-icon
          icon="heart-o"
          :count="post.shoutedCount"
          v-tooltip="{
            content: $t('contribution.amount-shouts', { amount: post.shoutedCount }),
            placement: 'bottom-start',
          }"
        />
        <counter-icon
          icon="comments"
          :count="post.commentsCount"
          v-tooltip="{
            content: $t('contribution.amount-comments', { amount: post.commentsCount }),
            placement: 'bottom-start',
          }"
        />
        <counter-icon
          icon="hand-pointer"
          :count="post.clickedCount"
          v-tooltip="{
            content: $t('contribution.amount-clicks', { amount: post.clickedCount }),
            placement: 'bottom-start',
          }"
        />
        <counter-icon
          icon="eye"
          :count="post.viewedTeaserCount"
          v-tooltip="{
            content: $t('contribution.amount-views', { amount: post.viewedTeaserCount }),
            placement: 'bottom-start',
          }"
        />
        <client-only>
          <content-menu
            resource-type="contribution"
            :resource="post"
            :modalsData="menuModalsData"
            :is-owner="isAuthor"
            @pinPost="pinPost"
            @unpinPost="unpinPost"
            @pushPost="pushPost"
            @unpushPost="unpushPost"
            @toggleObservePost="toggleObservePost"
          />
        </client-only>
      </footer>
      <client-only>
        <div class="date-row" v-if="post.createdAt">
          <span class="text">
            <date-time :date-time="post.createdAt" />
            <slot name="dateTime"></slot>
          </span>
        </div>
      </client-only>
    </base-card>
  </nuxt-link>
</template>

<script>
import Category from '~/components/Category'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import HcRibbon from '~/components/Ribbon'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import DateTime from '~/components/DateTime'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import { mapGetters } from 'vuex'
import PostMutations from '~/graphql/PostMutations'
import { postMenuModalsData, deletePostMutation } from '~/components/utils/PostHelpers'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  name: 'PostTeaser',
  mixins: [GetCategories],
  components: {
    Category,
    ContentMenu,
    CounterIcon,
    DateTimeRange,
    HcRibbon,
    LocationTeaser,
    DateTime,
    UserTeaser,
  },
  props: {
    post: {
      type: Object,
      required: true,
    },
    width: {
      type: Object,
      default: () => {},
    },
    postsFilter: {
      type: Object,
      default: () => {},
    },
  },
  mounted() {
    const { image } = this.post
    if (!image) return
    const width = this.$el.offsetWidth
    const height = Math.min(width / image.aspectRatio, 2000)
    const imageElement = this.$el.querySelector('.hero-image')
    if (imageElement) {
      imageElement.style.height = `${height}px`
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    excerpt() {
      return this.$filters.removeLinks(this.post.contentExcerpt)
    },
    isAuthor() {
      const { author } = this.post
      if (!author) return false
      return this.user.id === this.post.author.id
    },
    menuModalsData() {
      return postMenuModalsData(
        // "this.post" may not always be defined at the beginning …
        this.post ? this.$filters.truncate(this.post.title, 30) : '',
        this.deletePostCallback,
      )
    },
    isPinned() {
      return this.post && this.post.pinned
    },
    ribbonText() {
      if (this.post.pinned) return this.$t('post.pinned')
      if (this.post.postType[0] === 'Event') return this.$t('post.event')
      return this.$t('post.name')
    },
  },
  methods: {
    async deletePostCallback() {
      try {
        const {
          data: { DeletePost },
        } = await this.$apollo.mutate(deletePostMutation(this.post.id))
        this.$toast.success(this.$t('delete.contribution.success'))
        this.$emit('removePostFromList', DeletePost)
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
    pinPost(post) {
      this.$emit('pinPost', post)
    },
    unpinPost(post) {
      this.$emit('unpinPost', post)
    },
    pushPost(post) {
      this.$emit('pushPost', post)
    },
    unpushPost(post) {
      this.$emit('unpushPost', post)
    },
    toggleObservePost(postId, value) {
      this.$emit('toggleObservePost', postId, value)
    },
    visibilityChanged(isVisible, entry, id) {
      if (!this.post.viewedTeaserByCurrentUser && isVisible) {
        this.$apollo
          .mutate({
            mutation: PostMutations().markTeaserAsViewed,
            variables: { id },
          })
          .catch((error) => this.$toast.error(error.message))
        this.post.viewedTeaserByCurrentUser = true
        this.post.viewedTeaserCount++
      }
    },
  },
}
</script>

<style lang="scss">
.post-teaser,
.post-teaser:hover,
.post-teaser:active {
  position: relative;
  display: block;
  height: 100%;
  color: $text-color-base;
  padding-top: 16px;
}

.post-user-row {
  position: relative;

  > .post-ribbon-w-img {
    position: absolute;
    // 14px (~height of ribbon element) + 24px(=margin of hero image)
    top: -38px;
    // 7px+24px(=padding of parent)
    right: -31px;
  }
  > .post-ribbon {
    position: absolute;
    // 14px (~height of ribbon element) + 24px(=margin of hero image)
    top: -24px;
    // 7px(=offset)+24px(=margin of parent)
    right: -31px;
  }
}

.post-teaser > .base-card {
  display: flex;
  flex-direction: column;
  overflow: visible;
  height: 100%;
  padding-bottom: $space-x-small;

  > .hero-image {
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
  }

  &.--blur-image > .hero-image > .image {
    filter: blur($blur-radius);
  }

  > .content {
    flex-grow: 1;
    margin-bottom: $space-small;
  }

  > .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    > .categories-placeholder {
      flex-grow: 1;
    }

    > .counter-icon {
      display: block;
      margin-right: $space-small;
      opacity: $opacity-disabled;
    }

    > .content-menu {
      position: relative;
      z-index: $z-index-post-teaser-link;
    }

    .ds-tag {
      margin: 0;
      margin-right: $space-xx-small;
    }
  }

  .user-teaser {
    margin-bottom: $space-small;
  }
  > .date-row {
    display: flex;
    justify-content: flex-end;
    margin-top: $space-small;
    > .text {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: $text-color-soft;
      font-size: $font-size-small;

      > .ds-text {
        display: inline;
      }
    }
  }
}
</style>
