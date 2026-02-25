<template>
  <nuxt-link
    class="post-teaser"
    :class="{ 'post-teaser--horizontal': singleColumn && post.image }"
    :to="{ name: 'post-id-slug', params: { id: post.id, slug: post.slug } }"
  >
    <os-card
      :lang="post.language"
      :class="{
        'disabled-content': post.disabled,
        '--blur-image': post.image && post.image.sensitive,
      }"
      :highlight="isPinned"
    >
      <template v-if="post.image" #heroImage>
        <div
          class="image-placeholder"
          :class="{ 'image-placeholder--loaded': imageLoaded }"
          :style="{ aspectRatio: post.image.aspectRatio }"
        >
          <responsive-image
            :image="post.image"
            sizes="640px"
            class="image"
            @loaded="imageLoaded = true"
          />
        </div>
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
        <template #placeholder>
          <div class="post-user-row">
            <div class="user-teaser-placeholder">
              <div class="placeholder-avatar" />
              <div class="placeholder-text">
                <div class="placeholder-line placeholder-line--name" />
                <div class="placeholder-line placeholder-line--date" />
              </div>
            </div>
          </div>
        </template>
      </client-only>
      <h2 class="title hyphenate-text">{{ post.title }}</h2>
      <client-only>
        <div v-if="post && post.postType[0] === 'Event'" class="ds-mb-small" style="padding: 5px">
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
        </div>
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
          :icon="icons.heartO"
          :count="post.shoutedCount"
          v-tooltip="{
            content: $t('contribution.amount-shouts', { amount: post.shoutedCount }),
            placement: 'bottom-start',
          }"
        />
        <counter-icon
          :icon="icons.comments"
          :count="post.commentsCount"
          v-tooltip="{
            content: $t('contribution.amount-comments', { amount: post.commentsCount }),
            placement: 'bottom-start',
          }"
        />
        <counter-icon
          :icon="icons.handPointer"
          :count="post.clickedCount"
          v-tooltip="{
            content: $t('contribution.amount-clicks', { amount: post.clickedCount }),
            placement: 'bottom-start',
          }"
        />
        <counter-icon
          :icon="icons.eye"
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
            @pinGroupPost="pinGroupPost"
            @unpinGroupPost="unpinGroupPost"
            @pushPost="pushPost"
            @unpushPost="unpushPost"
            @toggleObservePost="toggleObservePost"
          />
        </client-only>
      </footer>
      <client-only>
        <div class="date-row" v-if="post.createdAt">
          <span class="text">
            <os-icon
              v-if="post.sortDate && post.sortDate !== post.createdAt"
              :icon="icons.arrowUp"
              size="sm"
              v-tooltip="{
                content: $t('post.menu.pushed'),
                placement: 'bottom-end',
              }"
              class="pushed-icon"
            />
            <date-time :date-time="post.createdAt" />
            <slot name="dateTime"></slot>
          </span>
        </div>
        <template v-if="post.createdAt" #placeholder>
          <div class="date-row">
            <span class="placeholder-line placeholder-line--date-footer" />
          </div>
        </template>
      </client-only>
    </os-card>
  </nuxt-link>
</template>

<script>
import { OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import Category from '~/components/Category'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import CounterIcon from '~/components/_new/generic/CounterIcon/CounterIcon'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import HcRibbon from '~/components/Ribbon'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import DateTime from '~/components/DateTime'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage.vue'
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
    OsCard,
    OsIcon,
    CounterIcon,
    DateTimeRange,
    HcRibbon,
    LocationTeaser,
    DateTime,
    UserTeaser,
    ResponsiveImage,
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
    showGroupPinned: {
      type: Boolean,
      default: false,
    },
    singleColumn: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      imageLoaded: false,
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
      return this.post && (this.post.pinned || (this.showGroupPinned && this.post.groupPinned))
    },
    ribbonText() {
      if (this.post && (this.post.pinned || (this.showGroupPinned && this.post.groupPinned)))
        return this.$t('post.pinned')
      if (this.post.postType[0] === 'Event') return this.$t('post.event')
      return this.$t('post.name')
    },
  },
  created() {
    this.icons = iconRegistry
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
    pinGroupPost(post) {
      this.$emit('pinGroupPost', post)
    },
    unpinGroupPost(post) {
      this.$emit('unpinGroupPost', post)
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

  @media (max-width: 810px) {
    padding-top: 8px;
  }
}

@keyframes image-placeholder-pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

.post-user-row {
  position: relative;

  > .post-ribbon-w-img {
    position: absolute;
    top: -36px;
    right: -29px;
  }
  > .post-ribbon {
    position: absolute;
    top: -16px;
    right: -29px;
  }
}

.post-teaser > .os-card {
  display: flex;
  flex-direction: column;
  overflow: visible;
  height: 100%;

  > .os-card__hero-image {
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
  }

  .image-placeholder {
    width: 100%;
    background-color: $background-color-softer;
    animation: image-placeholder-pulse 1.5s ease-in-out infinite;

    &--loaded {
      animation: none;
    }

    > .image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &.--blur-image > .os-card__hero-image .image {
    filter: blur($blur-radius);
  }

  > .os-card__content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding-bottom: 0 !important;
  }

  padding-bottom: $space-x-small !important;

  .content {
    flex-grow: 1;
    margin-bottom: $space-small;
  }

  .footer {
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

    .os-badge {
      margin: 0;
      margin-right: $space-xx-small;
    }
  }

  .user-teaser {
    margin-bottom: $space-small;
  }

  .user-teaser-placeholder {
    display: flex;
    align-items: center;
    margin-bottom: $space-small;

    .placeholder-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.15;
      flex-shrink: 0;
    }

    .placeholder-text {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-left: 10px;
      flex: 1;
    }

    .placeholder-line {
      height: 10px;
      border-radius: 5px;
      background: currentColor;
      opacity: 0.15;

      &--name {
        width: 120px;
      }
      &--date {
        width: 80px;
      }
    }
  }

  .date-row {
    display: flex;
    justify-content: flex-end;
    margin-top: $space-small;

    > .placeholder-line--date-footer {
      width: 100px;
      height: 10px;
      border-radius: 5px;
      background: currentColor;
      opacity: 0.15;
    }
    > .text {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: $text-color-soft;
      font-size: $font-size-small;

      > .pushed-icon {
        margin-right: $space-xx-small;
        vertical-align: middle !important; // Override OsIcon's Tailwind align-bottom
      }

      > .ds-text {
        display: inline;
      }
    }
  }
}

.post-teaser--horizontal > .os-card {
  @media (min-width: 640px) {
    flex-direction: row;

    > .os-card__hero-image {
      flex: 0 0 40%;
      max-width: 40%;
      border-top-right-radius: 0;
      border-bottom-left-radius: 5px;
    }

    .image-placeholder {
      height: 100%;
      aspect-ratio: unset !important;

      > .image {
        height: 100%;
        object-fit: cover;
      }
    }

    > .os-card__content {
      flex: 1;
      min-width: 0;
    }

    .post-ribbon-w-img {
      top: -16px;
    }
  }
}
</style>
