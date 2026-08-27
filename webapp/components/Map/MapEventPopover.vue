<template>
  <div class="map-event-popover">
    <div v-if="!showContent" class="loading-state">
      <os-spinner size="md" />
    </div>
    <template v-else-if="showContent && resolvedPost">
      <nuxt-link
        :to="{ name: 'post-id-slug', params: { id: resolvedPost.id, slug: resolvedPost.slug } }"
        class="event-link"
      >
        <div v-if="resolvedPost.image" class="image-wrapper">
          <responsive-image :image="resolvedPost.image" sizes="280px" class="image" />
        </div>
        <div class="post-user-row">
          <user-avatar :user="resolvedPost.author" size="small" :show-popover="false" />
          <os-ribbon class="event-ribbon" :text="$t('post.event')" type="Event" />
        </div>
        <h3 class="event-title hyphenate-text">{{ resolvedPost.title }}</h3>
      </nuxt-link>
      <location-teaser
        size="small"
        :venue="resolvedPost.eventVenue"
        :location-name="resolvedPost.eventLocationName"
        :is-online="resolvedPost.eventIsOnline"
      />
      <date-time-range
        size="small"
        :start-date="resolvedPost.eventStart"
        :end-date="resolvedPost.eventEnd"
      />
    </template>
    <empty v-else-if="showContent" icon="alert" :message="$t('map.eventPopover.unavailable')" />
  </div>
</template>

<script>
import { OsRibbon, OsSpinner } from '@ocelot-social/ui'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import Empty from '~/components/Empty/Empty'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { postTeaserQuery } from '~/graphql/PostQuery'

export default {
  name: 'MapEventPopover',
  components: {
    DateTimeRange,
    Empty,
    LocationTeaser,
    OsRibbon,
    OsSpinner,
    ResponsiveImage,
    UserAvatar,
  },
  props: {
    postId: { type: String, default: null },
    // Already-loaded post (e.g. the map's own feature data), skipping the
    // query entirely — same optional-override shape GroupAvatarPopover uses
    // for its `group` prop.
    post: { type: Object, default: null },
  },
  data() {
    return {
      showContent: false,
      minSpinnerDone: false,
      querySettled: false,
      spinnerTimer: null,
    }
  },
  mounted() {
    if (this.resolvedPost) {
      this.showContent = true
      return
    }
    // Same brief minimum-spinner-time pattern as GroupAvatarPopover — avoids
    // a flash of the spinner for queries that resolve near-instantly.
    this.spinnerTimer = setTimeout(() => {
      this.minSpinnerDone = true
      if (this.resolvedPost || this.querySettled) this.showContent = true
    }, 400)
  },
  beforeDestroy() {
    if (this.spinnerTimer) clearTimeout(this.spinnerTimer)
  },
  computed: {
    resolvedPost() {
      return this.post || (this.Post && this.Post[0]) || null
    },
  },
  watch: {
    resolvedPost(post) {
      if (post && this.minSpinnerDone) this.showContent = true
    },
  },
  methods: {
    onQuerySettled() {
      if (this.minSpinnerDone) {
        this.showContent = true
      } else {
        this.querySettled = true
      }
    },
  },
  apollo: {
    Post: {
      query() {
        return postTeaserQuery()
      },
      variables() {
        return { id: this.postId }
      },
      skip() {
        return !this.postId || !!this.post
      },
      result() {
        this.onQuerySettled()
      },
      error() {
        this.onQuerySettled()
      },
    },
  },
}
</script>

<style scoped>
.map-event-popover {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  min-width: 220px;
  max-width: 280px;
  width: 280px;
  min-height: 120px;
}

.loading-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.event-link {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: inherit;
  text-decoration: none;
}

.image-wrapper {
  overflow: hidden;
  border-radius: var(--border-radius-x-large);
}

.image-wrapper .image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.post-user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.event-title {
  margin: 0;
  font-size: 1rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
